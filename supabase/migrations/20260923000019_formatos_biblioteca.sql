-- 019 · Formatos como biblioteca (docs/decisiones.md 2026-09-23 · Formatos)
-- Etiquetas libres para la galería, portada en Storage, referencias como tabla (la evidencia de terceros y propia)
-- y la hipótesis del formato como fila real de `hipotesis`, resoluble con número y fecha.

alter table public.formatos add column if not exists etiquetas text[] not null default '{}';
alter table public.formatos add column if not exists portada text;
alter table public.formatos add column if not exists hipotesis_id uuid references public.hipotesis;

-- La hipótesis de formato deja de ser texto: una fila por texto (incompleta hasta tener campo, número y fecha).
do $$
declare f record; hid uuid;
begin
  for f in select id, hipotesis_formato from formatos where nullif(trim(hipotesis_formato), '') is not null loop
    select id into hid from hipotesis where texto = trim(f.hipotesis_formato) limit 1;
    if hid is null then
      insert into hipotesis (texto, estado) values (trim(f.hipotesis_formato), 'abierta') returning id into hid;
    end if;
    update formatos set hipotesis_id = hid where id = f.id;
  end loop;
end $$;
alter table public.formatos drop column if exists hipotesis_formato;

-- Etiquetas iniciales, leídas de cada molde (Nazho las ajusta desde la ficha).
update formatos set etiquetas = case codigo
  when 'FC-01' then array['grabado dentro', 'nazho a cámara', 'clip ajeno', 'más de 60 s']
  when 'FC-02' then array['grabado dentro', 'nazho a cámara', 'motion graphics', 'menos de 15 s']
  when 'FC-03' then array['grabado dentro', 'nazho a cámara', 'serie con contador', 'más de 60 s']
  when 'FC-04' then array['grabado dentro', 'nazho a cámara', '15 a 60 s']
  when 'FC-05' then array['grabado dentro', 'sin nazho', 'texto en pantalla', 'caption largo', 'menos de 15 s']
  when 'FC-08' then array['grabado dentro', 'grabado fuera', 'nazho a cámara', 'una sola toma', 'más de 60 s']
  when 'FC-09' then array['escrito', 'lectura']
  else etiquetas end
where cardinality(etiquetas) = 0;

-- Referencias: de dónde viene la evidencia de un formato. cuenta = @handle (propia cuando es la de Nazho o trae pieza).
create table public.referencias (
  id uuid primary key default gen_random_uuid(),
  formato_id uuid not null references public.formatos on delete cascade,
  cuenta text,
  url text,
  pieza_id uuid references public.piezas on delete set null,
  multiplicador numeric,
  views int,
  duracion_s int,
  nota text,
  creado_por uuid references public.perfiles,
  created_at timestamptz not null default now(),
  constraint referencia_con_origen check (url is not null or pieza_id is not null)
);
create unique index referencias_formato_url on public.referencias (formato_id, url) where url is not null;
alter table public.referencias enable row level security;
create policy owner_todo on public.referencias for all to authenticated
  using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy referencias_leer on public.referencias for select to authenticated
  using (rol_actual() in ('editor', 'viewer'));

create or replace function public.siguiente_codigo_formato()
returns text language sql stable set search_path = public as $$
  select 'FC-' || lpad((coalesce(max((regexp_match(codigo, '^FC-(\d+)$'))[1]::int), 0) + 1)::text, 2, '0') from formatos;
$$;
grant execute on function siguiente_codigo_formato() to authenticated;

-- Alta de un formato: desde la web o desde Cowork al analizar una cuenta. El código se asigna solo.
create or replace function public.crear_formato(
  p_nombre text, p_etiquetas text[] default '{}', p_serie_propia text default null, p_duracion text default null,
  p_recompensa text default null, p_cadencia text default null, p_origen text default null, p_molde text default null,
  p_notas text default null, p_estado text default 'detectado', p_codigo text default null)
returns formatos language plpgsql security definer set search_path = public as $$
declare f formatos%rowtype;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_nombre), '') is null then raise exception 'El formato necesita nombre.' using errcode = 'P0001'; end if;
  insert into formatos (codigo, nombre, estado, etiquetas, serie_propia, duracion, recompensa, cadencia, origen, molde, notas)
  values (coalesce(nullif(trim(p_codigo), ''), siguiente_codigo_formato()), trim(p_nombre), coalesce(p_estado, 'detectado'),
          coalesce(p_etiquetas, '{}'), nullif(trim(p_serie_propia), ''), p_duracion, p_recompensa, p_cadencia, p_origen, p_molde, p_notas)
  returning * into f;
  perform registrar_corrida('crear_formato', 'ok', format('%s · %s', f.codigo, f.nombre), jsonb_build_object('formato_id', f.id, 'actor', auth.uid()));
  return f;
exception when unique_violation then
  raise exception 'Ya existe un formato con ese código.' using errcode = 'P0001';
end $$;
grant execute on function crear_formato(text, text[], text, text, text, text, text, text, text, text, text) to authenticated;

-- La hipótesis del formato: se escribe o se completa (campo, número y fecha van los tres o ninguno).
create or replace function public.guardar_hipotesis_formato(p_formato_id uuid, p_texto text, p_campo text default null, p_numero numeric default null, p_fecha date default null)
returns hipotesis language plpgsql security definer set search_path = public as $$
declare h hipotesis%rowtype; hid uuid;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_texto), '') is null then raise exception 'La hipótesis necesita texto.' using errcode = 'P0001'; end if;
  if (p_campo is null) <> (p_numero is null) or (p_campo is null) <> (p_fecha is null) then
    raise exception 'Campo, número y fecha van los tres juntos o ninguno.' using errcode = 'P0001';
  end if;
  select hipotesis_id into hid from formatos where id = p_formato_id;
  if hid is null then
    insert into hipotesis (texto, campo, numero, fecha, estado) values (trim(p_texto), p_campo, p_numero, p_fecha, 'abierta') returning * into h;
    update formatos set hipotesis_id = h.id where id = p_formato_id;
  else
    update hipotesis set texto = trim(p_texto), campo = p_campo, numero = p_numero, fecha = p_fecha where id = hid returning * into h;
  end if;
  return h;
end $$;
grant execute on function guardar_hipotesis_formato(uuid, text, text, numeric, date) to authenticated;

-- Qué dicen las hipótesis de los episodios de un formato. Se calcula, no se guarda.
create or replace function public.resumen_hipotesis_formato(p_formato_id uuid)
returns table (verdaderas int, falsas int, sin_datos int, abiertas int, vencidas int)
language sql stable security definer set search_path = public as $$
  with hs as (
    select distinct h.* from piezas p join hipotesis h on h.id = p.hipotesis_id
    where p.formato_id = p_formato_id and p.estado <> 'archivada'
  )
  select count(*) filter (where estado = 'verdadera')::int, count(*) filter (where estado = 'falsa')::int,
         count(*) filter (where estado = 'sin_datos')::int, count(*) filter (where estado = 'abierta')::int,
         count(*) filter (where estado = 'abierta' and fecha is not null and fecha <= (now() at time zone 'America/Mexico_City')::date)::int
  from hs;
$$;
grant execute on function resumen_hipotesis_formato(uuid) to authenticated;
