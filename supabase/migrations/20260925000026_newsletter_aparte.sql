-- CRITERIO es el newsletter y vive aparte de reels y carruseles (docs/decisiones.md 2026-09-25).
-- · Tabla propia `newsletter` (una fila): nombre, promesa, día de envío, receta, cadencia, plataforma, hipótesis.
-- · Las ediciones siguen siendo piezas tipo newsletter, pero sin formato ni serie (lo impone el esquema).
-- · FC-09 sale de la biblioteca de formatos; su molde pasa a ser la receta del newsletter.
-- · La serie «Criterio» (los yaps de postura) se renombra «Postura»; la serie «CRITERIO» se borra.
-- · Las derivadas de una edición se ligan a su madre con piezas.madre_id.

-- 1. La casa del newsletter ---------------------------------------------------------------------------------------------
create table public.newsletter (
  id              smallint primary key default 1 check (id = 1),
  nombre          text not null,
  promesa         text,
  dia_envio       smallint not null default 5 check (dia_envio between 1 and 7),
  cadencia        text,
  plataforma      text not null default 'kit',
  dominio         text,
  receta          text not null,
  hipotesis_id    uuid references public.hipotesis(id) on delete set null,
  notas           text,
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references public.perfiles(user_id) on delete set null
);
comment on table public.newsletter is 'CRITERIO: el newsletter como producto. Una fila. Las ediciones son piezas tipo newsletter.';

insert into newsletter (nombre, promesa, dia_envio, cadencia, plataforma, dominio, receta, hipotesis_id, notas)
select 'CRITERIO',
       'Crece como empresario. Una decisión con criterio a la vez.',
       coalesce(f.dia_envio, 5),
       f.cadencia,
       'kit',
       'criterio.nazho.mx',
       replace(replace(f.molde, 'Si el formato cambia, cambia aquí (actualizar_formato).', 'Si la receta cambia, cambia aquí (actualizar_newsletter).'), '(actualizar_formato)', '(actualizar_newsletter)'),
       f.hipotesis_id,
       'Movido desde el formato FC-09 el 2026-09-25. Recompensa: ' || coalesce(f.recompensa, '—') || '. Duración: ' || coalesce(f.duracion, '—') || '.'
from formatos f where f.codigo = 'FC-09';

insert into newsletter (nombre, receta)
select 'CRITERIO', '# CRITERIO — receta por escribir' where not exists (select 1 from newsletter);

create or replace function public.newsletter_tocado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  return new;
end $$;
create trigger newsletter_tocado before update on public.newsletter for each row execute function public.newsletter_tocado();

alter table public.newsletter enable row level security;
create policy newsletter_leer on public.newsletter for select to authenticated using (true);
create policy newsletter_owner on public.newsletter for update to authenticated
  using (rol_actual() = 'owner') with check (rol_actual() = 'owner');

-- 2. Derivadas: una pieza puede nacer de otra (el reel hablado y el carrusel del caso vienen de una edición) --------------
alter table public.piezas add column madre_id uuid references public.piezas(id) on delete set null;
alter table public.piezas add constraint piezas_madre_no_ella check (madre_id is null or madre_id <> id);
create index piezas_madre on public.piezas (madre_id) where madre_id is not null;

-- 3. Las ediciones se sueltan de formato y serie -----------------------------------------------------------------------
update piezas set formato_id = null, series = array_remove(array_remove(series, 'Criterio'), 'CRITERIO') where tipo = 'newsletter';
update cuentas_referencia set format_card_sugerida = null where format_card_sugerida = (select id from formatos where codigo = 'FC-09');
delete from formatos where codigo = 'FC-09';

alter table public.piezas add constraint newsletter_sin_formato check (tipo is distinct from 'newsletter' or formato_id is null);
alter table public.piezas add constraint newsletter_sin_serie check (tipo is distinct from 'newsletter' or coalesce(cardinality(series), 0) = 0);

-- 4. Series: «Criterio» (yaps) → «Postura»; «CRITERIO» se va --------------------------------------------------------------
delete from series where nombre = 'CRITERIO' and not exists (select 1 from piezas where 'CRITERIO' = any (series));
update series set nombre = 'Postura',
  descripcion = regexp_replace(coalesce(descripcion, ''), '^# Criterio — ', '# Postura — ')
    || E'\n\n**Nombre:** hasta el 2026-09-25 se llamó «Criterio»; ese nombre es del newsletter. Los id_publico CRI-NN se conservan.'
 where nombre = 'Criterio';

-- 5. Envío y alta de ediciones leen de la tabla newsletter --------------------------------------------------------------
drop function if exists public.siguiente_envio(text);
create or replace function public.siguiente_envio()
returns date language sql stable set search_path = public as $$
  select d + (case when (dia - extract(isodow from d)::int + 7) % 7 = 0 then 7 else (dia - extract(isodow from d)::int + 7) % 7 end)
  from (select (now() at time zone 'America/Mexico_City')::date as d,
               coalesce((select dia_envio from newsletter where id = 1), 5) as dia) x;
$$;
grant execute on function siguiente_envio() to authenticated;

create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; h jsonb := payload->'hipotesis'; hid uuid; fid uuid; mid uuid;
        est text := coalesce(nullif(payload->>'estado',''), 'borrador');
        etq text[] := coalesce(array(select jsonb_array_elements_text(payload->'etiquetas')), '{}');
        srs text[] := coalesce(array(select jsonb_array_elements_text(payload->'series')), '{}');
        tit text := nullif(payload->>'titulo', '');
        fobj date := (payload->>'fecha_objetivo')::date;
        fmt text := nullif(payload->>'formato', '');
        madre text := nullif(payload->>'madre', '');
begin
  perform exigir_rol('owner');
  if nullif(payload->>'serie','') is not null and not (payload->>'serie' = any (srs)) then srs := array_append(srs, payload->>'serie'); end if;
  if tit is null and nullif(payload->>'contenido','') is null then
    raise exception 'Una pieza nace con al menos un título.' using errcode = 'P0001';
  end if;
  if payload->>'tipo' = 'newsletter' then
    if fmt is not null or cardinality(srs) > 0 then
      raise exception 'El newsletter no lleva formato ni serie: vive aparte. Su receta se lee con leer_newsletter.' using errcode = 'P0001';
    end if;
    fobj := coalesce(fobj, siguiente_envio());
    if tit is not null and tit !~ '^Criterio #\d{3}' then
      tit := format('Criterio #%s — %s', lpad(siguiente_edicion_criterio()::text, 3, '0'), tit);
    end if;
  end if;
  if madre is not null then
    select id into mid from piezas where id_publico = madre or id::text = madre;
    if mid is null then raise exception 'No existe la pieza madre %.', madre using errcode = 'P0001'; end if;
  end if;
  if nullif(payload->>'hipotesis_id','') is not null then
    hid := (payload->>'hipotesis_id')::uuid;
  elsif h is not null then
    select id into hid from crear_hipotesis(h->>'texto', h->>'campo', (h->>'numero')::numeric, (h->>'fecha')::date);
  end if;
  perform validar_pieza_para_estado(est, payload->>'tipo', payload->>'etapa_embudo', hid, etq);
  if fmt is not null then
    select id into fid from formatos where codigo = fmt or id::text = fmt;
    if fid is null then raise exception 'No existe el formato %.', fmt using errcode = 'P0001'; end if;
  end if;
  insert into piezas (
    id_publico, comunidad_id, tipo, series, formato_id, hipotesis_id, etapa_embudo, contenido,
    fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, notas, etiquetas, madre_id
  ) values (
    nullif(payload->>'id_publico',''),
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'tipo', srs, fid, hid, payload->>'etapa_embudo', payload->>'contenido',
    fobj, (payload->>'responsable_id')::uuid, tit,
    coalesce((payload->>'programa_aprobado')::boolean, false), est, payload->>'notas', etq, mid
  ) returning * into p;
  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.tipo, 'sin tipo'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception when unique_violation then
  raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;
