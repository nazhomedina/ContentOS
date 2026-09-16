-- 014 · Lead magnets (docs/decisiones.md 2026-09-16 · Lead magnets)
-- Los recursos tienen ficha propia (tipo, descripción), los leads se anotan a mano con fecha de corte
-- mientras no corra go_leads, y las historias que los empujan se suman con resumen_recurso.
-- La URL pública no se guarda: es https://go.folklore.mx/<slug_go>.

alter table public.recursos
  add column if not exists tipo text check (tipo in ('resumen_video','resumen_articulo','megaprompt','mini_app','libreria','plantilla','otro')),
  add column if not exists descripcion text,
  add column if not exists leads_fuente text check (leads_fuente in ('manual','job')),
  add column if not exists leads_por uuid references public.perfiles;

alter table public.recursos drop constraint if exists recursos_estado_check;
alter table public.recursos add constraint recursos_estado_check
  check (estado in ('idea','produccion','publicado','contado','retirado'));

-- Mariela y los viewers los leen; solo Nazho los edita (owner_todo).
drop policy if exists recursos_leer_editor on public.recursos;
create policy recursos_leer on public.recursos for select to authenticated
  using (rol_actual() in ('editor','viewer'));

-- Alta o edición por slug o id; los campos que llegan nulos se conservan.
create or replace function public.guardar_recurso(
  p_nombre text, p_slug_go text default null, p_keyword text default null, p_kit_tag_id text default null,
  p_estado text default null, p_tipo text default null, p_descripcion text default null, p_id uuid default null)
returns recursos language plpgsql security definer set search_path = public as $$
declare r recursos%rowtype; com uuid;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_nombre), '') is null then raise exception 'El recurso necesita nombre.' using errcode = 'P0001'; end if;
  if p_id is not null then select * into r from recursos where id = p_id;
  elsif nullif(trim(p_slug_go), '') is not null then select * into r from recursos where slug_go = trim(p_slug_go); end if;
  if r.id is null then
    select id into com from comunidades where activa order by nombre limit 1;
    insert into recursos (comunidad_id, nombre, slug_go, keyword, kit_tag_id, estado, tipo, descripcion)
    values (com, trim(p_nombre), nullif(trim(p_slug_go), ''), nullif(upper(trim(p_keyword)), ''), nullif(trim(p_kit_tag_id), ''),
            coalesce(p_estado, 'idea'), p_tipo, nullif(trim(p_descripcion), ''))
    returning * into r;
  else
    update recursos set
      nombre = trim(p_nombre),
      slug_go = coalesce(nullif(trim(p_slug_go), ''), slug_go),
      keyword = coalesce(nullif(upper(trim(p_keyword)), ''), keyword),
      kit_tag_id = coalesce(nullif(trim(p_kit_tag_id), ''), kit_tag_id),
      estado = coalesce(p_estado, estado),
      tipo = coalesce(p_tipo, tipo),
      descripcion = coalesce(nullif(trim(p_descripcion), ''), descripcion)
    where id = r.id returning * into r;
  end if;
  return r;
end $$;
grant execute on function guardar_recurso(text, text, text, text, text, text, text, uuid) to authenticated;

-- Leads a mano: número y fecha de corte, con quién los anotó. El job go_leads escribirá fuente 'job'.
create or replace function public.registrar_leads(p_recurso uuid, p_leads int, p_fecha date default current_date)
returns recursos language plpgsql security definer set search_path = public as $$
declare r recursos%rowtype;
begin
  perform exigir_rol('owner');
  if p_leads is null or p_leads < 0 then raise exception 'Los leads son un número de cero en adelante.' using errcode = 'P0001'; end if;
  if p_fecha > current_date then raise exception 'La fecha de corte no puede ser futura.' using errcode = 'P0001'; end if;
  update recursos set leads = p_leads, leads_actualizado_en = (p_fecha::timestamp at time zone 'America/Mexico_City'),
    leads_fuente = 'manual', leads_por = auth.uid()
  where id = p_recurso returning * into r;
  if r.id is null then raise exception 'No existe ese recurso.' using errcode = 'P0001'; end if;
  return r;
end $$;
grant execute on function registrar_leads(uuid, int, date) to authenticated;

-- Qué empujó cada recurso: historias ligadas, publicadas, y views/replies/DMs sumados. Se calcula, no se guarda.
create or replace function public.resumen_recurso(p_id uuid)
returns table (historias int, publicadas int, views int, replies int, dms int, ultima_semana date, ultima_publicada timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*)::int, count(*) filter (where estado = 'publicada')::int,
         coalesce(sum(views), 0)::int, coalesce(sum(replies), 0)::int, coalesce(sum(dms), 0)::int,
         max(semana), max(publicada_en)
  from historias where recurso_id = p_id and estado <> 'descartada';
$$;
grant execute on function resumen_recurso(uuid) to authenticated;

-- Los tres recursos del handoff (colección «Recursos de historias» de Notion; tags leídos de Kit el 16-sep-2026).
update recursos set kit_tag_id = '22364040', tipo = 'resumen_video', estado = 'publicado',
  nombre = 'Resumen + notas: Rory Sutherland — Why Business Is A Casino',
  descripcion = 'Entrevista de 58 min en YouTube (Marketing Is Broken). Mockup de historia amarillo con notas difuminadas ya diseñado.'
where slug_go = 'rory-sutherland';

insert into recursos (comunidad_id, nombre, slug_go, keyword, kit_tag_id, estado, tipo, descripcion)
select (select comunidad_id from recursos where slug_go = 'rory-sutherland'), v.* from (values
  ('Resumen + notas: How to Build a $100,000 Personal Brand (In Just 90 Days)', 'marca-personal-90-dias', '90', '22364041', 'publicado', 'resumen_video',
   'Entrevista de 1h07 en YouTube. Mockup rosa ya diseñado. Ángulo de Nazho: las marcas personales como herramienta de marketing de las empresas.'),
  ('Resumen + notas: MrBeast Shares His Best Business Advice (My First Million)', 'mrbeast-negocios', 'BEAST', '22364042', 'publicado', 'resumen_video',
   'Entrevista en My First Million. Mockup amarillo-verde ya diseñado. Frameworks y fórmulas de creación de contenido.')
) as v(nombre, slug_go, keyword, kit_tag_id, estado, tipo, descripcion)
on conflict (slug_go) do nothing;

insert into recursos (comunidad_id, nombre, estado, tipo, descripcion)
select (select comunidad_id from recursos where slug_go = 'rory-sutherland'),
  'If you aren''t selling these 4 things, you Will Fail', 'idea', 'resumen_video',
  'Sin liga de la fuente. Decidir si entra a la cola de «Te lo resumo» después de RORY / 90 / BEAST.'
where not exists (select 1 from recursos where nombre = 'If you aren''t selling these 4 things, you Will Fail');
