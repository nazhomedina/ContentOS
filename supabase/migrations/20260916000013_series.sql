-- 013 · Series declaradas (decisión de Nazho, 2026-09-16): una serie es una colección con nombre,
-- descripción y un interruptor. En la pieza deja de ser texto libre y pasa a ser etiquetas elegidas
-- de las series declaradas; una pieza puede llevar más de una.

create table public.series (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(trim(nombre)) between 1 and 80),
  descripcion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger series_updated before update on series for each row execute function tocar_updated_at();
alter table series enable row level security;
create policy owner_todo on series for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy leer on series for select to authenticated using (rol_actual() in ('editor','viewer'));

-- Las series que ya existían en piezas y en formatos.
insert into series (nombre)
select distinct trim(serie) from piezas where nullif(trim(serie), '') is not null
union
select distinct trim(serie_propia) from formatos where nullif(trim(serie_propia), '') is not null
on conflict (nombre) do nothing;

alter table piezas add column series text[] not null default '{}';
update piezas set series = array[trim(serie)] where nullif(trim(serie), '') is not null;
alter table piezas drop column serie;
create index piezas_series on piezas using gin (series);

-- Toda serie escrita en una pieza existe en `series` (se declara sola si es nueva); sin duplicados ni vacíos.
create or replace function public.validar_series_pieza()
returns trigger language plpgsql security definer set search_path = public as $$
declare limpias text[]; n text;
begin
  limpias := '{}';
  foreach n in array coalesce(new.series, '{}') loop
    n := trim(n);
    if n <> '' and not (n = any (limpias)) then limpias := array_append(limpias, n); end if;
  end loop;
  foreach n in array limpias loop
    insert into series (nombre) values (n) on conflict (nombre) do nothing;
  end loop;
  new.series := limpias;
  return new;
end $$;
create trigger piezas_series_validas before insert or update of series on piezas
  for each row execute function validar_series_pieza();

-- Al elegir formato, la pieza suma la serie propia del formato si no la trae.
create or replace function public.heredar_serie_de_formato()
returns trigger language plpgsql set search_path = public as $$
declare sp text;
begin
  if new.formato_id is not null then
    select serie_propia into sp from formatos where id = new.formato_id;
    if nullif(trim(coalesce(sp, '')), '') is not null and not (sp = any (coalesce(new.series, '{}'))) then
      new.series := array_append(coalesce(new.series, '{}'), sp);
    end if;
  end if;
  return new;
end $$;

-- Renombrar una serie la renombra en todas las piezas y en el formato que la declara.
create or replace function public.propagar_nombre_serie()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nombre is distinct from old.nombre then
    update piezas set series = array_replace(series, old.nombre, new.nombre) where old.nombre = any (series);
    update formatos set serie_propia = new.nombre where serie_propia = old.nombre;
  end if;
  return new;
end $$;
create trigger series_renombrar after update of nombre on series for each row execute function propagar_nombre_serie();

-- Crear o editar una serie por nombre. Owner.
create or replace function public.guardar_serie(p_nombre text, p_descripcion text default null, p_activa boolean default null, p_nuevo_nombre text default null)
returns series language plpgsql security definer set search_path = public as $$
declare s series%rowtype;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_nombre), '') is null then raise exception 'La serie necesita nombre.' using errcode = 'P0001'; end if;
  insert into series (nombre, descripcion, activa) values (trim(p_nombre), p_descripcion, coalesce(p_activa, true))
  on conflict (nombre) do update set
    descripcion = coalesce(excluded.descripcion, series.descripcion),
    activa = coalesce(p_activa, series.activa)
  returning * into s;
  if nullif(trim(p_nuevo_nombre), '') is not null and trim(p_nuevo_nombre) <> s.nombre then
    update series set nombre = trim(p_nuevo_nombre) where id = s.id returning * into s;
  end if;
  return s;
end $$;
grant execute on function guardar_serie(text, text, boolean, text) to authenticated;

-- Cuántas piezas lleva cada serie: se calcula, no se guarda.
create or replace function public.resumen_serie(p_nombre text)
returns table (piezas int, en_produccion int, publicadas int, ultima_publicada timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*)::int,
         count(*) filter (where estado not in ('borrador','archivada','publicada','en_trial'))::int,
         count(*) filter (where estado in ('publicada','en_trial'))::int,
         max(publicada_en)
  from piezas where p_nombre = any (series) and estado <> 'archivada';
$$;
grant execute on function resumen_serie(text) to authenticated;

-- crear_pieza_validada acepta `series` (lista) y, por compatibilidad, `serie` (texto).
create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; h jsonb := payload->'hipotesis'; hid uuid; fid uuid;
        est text := coalesce(nullif(payload->>'estado',''), 'borrador');
        etq text[] := coalesce(array(select jsonb_array_elements_text(payload->'etiquetas')), '{}');
        srs text[] := coalesce(array(select jsonb_array_elements_text(payload->'series')), '{}');
begin
  perform exigir_rol('owner');
  if nullif(payload->>'serie','') is not null and not (payload->>'serie' = any (srs)) then srs := array_append(srs, payload->>'serie'); end if;
  if nullif(payload->>'titulo','') is null and nullif(payload->>'contenido','') is null then
    raise exception 'Una pieza nace con al menos un título.' using errcode = 'P0001';
  end if;
  if nullif(payload->>'hipotesis_id','') is not null then
    hid := (payload->>'hipotesis_id')::uuid;
  elsif h is not null then
    select id into hid from crear_hipotesis(h->>'texto', h->>'campo', (h->>'numero')::numeric, (h->>'fecha')::date);
  end if;
  perform validar_pieza_para_estado(est, payload->>'tipo', payload->>'etapa_embudo', hid, etq);
  if nullif(payload->>'formato','') is not null then
    select id into fid from formatos where codigo = payload->>'formato' or id::text = payload->>'formato';
    if fid is null then raise exception 'No existe el formato %.', payload->>'formato' using errcode = 'P0001'; end if;
  end if;
  insert into piezas (
    id_publico, comunidad_id, tipo, series, formato_id, hipotesis_id, etapa_embudo, contenido,
    fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, notas, etiquetas
  ) values (
    nullif(payload->>'id_publico',''),
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'tipo', srs, fid, hid, payload->>'etapa_embudo', payload->>'contenido',
    (payload->>'fecha_objetivo')::date, (payload->>'responsable_id')::uuid, payload->>'titulo',
    coalesce((payload->>'programa_aprobado')::boolean, false), est, payload->>'notas', etq
  ) returning * into p;
  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.tipo, 'sin tipo'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception when unique_violation then
  raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;
