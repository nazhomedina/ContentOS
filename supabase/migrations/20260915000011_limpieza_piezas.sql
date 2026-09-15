-- 011 · Limpieza de piezas (docs/campos.md · decisión de Nazho, 2026-09-15)
--
-- Una pieza mínima: tipo (antes formato), estado, fecha objetivo, responsable, contenido (antes guion),
-- notas, etiquetas, URL. Relaciones limpias: tareas, assets (tabla propia alimentada desde Storage),
-- formatos (antes format_cards) e hipótesis (tabla propia: varias piezas responden a una hipótesis).
-- Se van: cta, fidelidad, spec_visual (→ notas), requiere_hipotesis (se calcula), etapa_legado,
-- idea_id, formato_sugerido (→ notas), origen (→ etiqueta), el checklist de tareas y la tabla ideas.
-- Se quedan por el sistema: comunidad_id (unidad raíz), programa_aprobado (tope de 10),
-- notion_url (idempotencia del import mientras Notion exista), serie (nombre de la colección).

-- ---------------------------------------------------------------------------
-- 0. Respaldo antes de tirar columnas. Se borra al cerrar 1.0.
-- ---------------------------------------------------------------------------
create table public.respaldo_20260915_piezas as select * from piezas;
create table public.respaldo_20260915_tareas as select * from tareas;
create table public.respaldo_20260915_guion_versiones as select * from guion_versiones;
alter table public.respaldo_20260915_piezas enable row level security;
alter table public.respaldo_20260915_tareas enable row level security;
alter table public.respaldo_20260915_guion_versiones enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Hipótesis: tabla propia. Resoluble = campo, número y fecha (los tres o ninguno).
-- ---------------------------------------------------------------------------
create table public.hipotesis (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  campo text,                        -- multiplicador · saves · follows · suscriptores · retencion_3s…
  numero numeric,
  fecha date,
  estado text not null default 'abierta' check (estado in ('abierta','verdadera','falsa','sin_datos')),
  veredicto text,                    -- qué se aprendió al resolverla
  resuelta_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hipotesis_resoluble_o_vacia check (
    (campo is not null and numero is not null and fecha is not null)
    or (campo is null and numero is null and fecha is null)
  )
);
create index hipotesis_texto on hipotesis (texto);
create trigger hipotesis_updated before update on hipotesis for each row execute function tocar_updated_at();
alter table hipotesis enable row level security;
create policy owner_todo on hipotesis for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy leer on hipotesis for select to authenticated using (rol_actual() in ('editor','viewer'));

-- Las hipótesis que venían en jsonb pasan a filas; el mismo texto en varias piezas = una hipótesis.
insert into hipotesis (texto, campo, numero, fecha, created_at)
select texto,
       case when res then campo end, case when res then numero end, case when res then fecha end, creada
from (
  select distinct on (texto) texto, res, campo, numero, fecha, creada from (
    select trim(hipotesis->>'texto') as texto,
           (coalesce((hipotesis->>'legado')::boolean, false) = false
             and nullif(hipotesis->>'campo','') is not null
             and jsonb_typeof(hipotesis->'numero') = 'number'
             and (hipotesis->>'fecha') ~ '^\d{4}-\d{2}-\d{2}$') as res,
           hipotesis->>'campo' as campo,
           case when jsonb_typeof(hipotesis->'numero') = 'number' then (hipotesis->>'numero')::numeric end as numero,
           case when (hipotesis->>'fecha') ~ '^\d{4}-\d{2}-\d{2}$' then (hipotesis->>'fecha')::date end as fecha,
           created_at as creada
    from piezas where nullif(trim(hipotesis->>'texto'), '') is not null
  ) x order by texto, res desc, creada
) y;

alter table piezas add column hipotesis_id uuid references hipotesis;
update piezas p set hipotesis_id = h.id from hipotesis h where trim(p.hipotesis->>'texto') = h.texto;
create index piezas_hipotesis on piezas (hipotesis_id);

-- ---------------------------------------------------------------------------
-- 2. Piezas: renombres, notas que absorben, etiquetas, bajas.
-- ---------------------------------------------------------------------------
alter table piezas drop constraint completa_segun_estado;
alter table piezas drop constraint if exists hipotesis_resoluble;
alter table piezas drop constraint if exists hipotesis_valida_si_existe;
drop trigger piezas_id_publico on piezas;

alter table piezas rename column formato to tipo;
alter table piezas rename column format_card_id to formato_id;
alter table piezas rename column guion to contenido;

update piezas set notas = concat_ws(E'\n\n', notas, 'Spec visual:' || E'\n' || spec_visual)
 where nullif(trim(spec_visual), '') is not null;
update piezas set notas = concat_ws(E'\n', notas, 'Formato sugerido: ' || array_to_string(formato_sugerido, ', '))
 where cardinality(formato_sugerido) > 0;

alter table piezas add column etiquetas text[] not null default '{}';
update piezas set etiquetas = array[origen] where origen is not null;
create index piezas_etiquetas on piezas using gin (etiquetas);

alter table piezas
  drop column hipotesis, drop column cta, drop column fidelidad, drop column spec_visual,
  drop column requiere_hipotesis, drop column etapa_legado, drop column idea_id,
  drop column formato_sugerido, drop column origen;

-- Completa según estado: tipo para producir; etapa e hipótesis para grabar en adelante.
-- Las piezas heredadas (etiqueta legado) pueden seguir sin hipótesis; las nuevas no.
alter table piezas add constraint completa_segun_estado check (
  estado in ('borrador','archivada')
  or (estado = 'redaccion' and tipo is not null)
  or (estado not in ('borrador','archivada','redaccion') and tipo is not null and etapa_embudo is not null
      and (hipotesis_id is not null or 'legado' = any (etiquetas)))
);

-- ---------------------------------------------------------------------------
-- 3. Formatos (antes format_cards), metas, tareas sin checklist, ideas fuera.
-- ---------------------------------------------------------------------------
alter table format_cards rename to formatos;
alter table metas_semana rename column formato to tipo;

alter table tareas drop column checklist;

alter table pensamientos drop constraint pensamiento_con_objeto;
alter table pensamientos drop column idea_id;
alter table pensamientos alter column pieza_id set not null;
drop table ideas cascade;

-- ---------------------------------------------------------------------------
-- 4. Versiones de contenido (antes guion_versiones).
-- ---------------------------------------------------------------------------
alter table guion_versiones rename to contenido_versiones;
alter table contenido_versiones rename column guion to contenido;
alter table contenido_versiones drop column hipotesis, drop column spec_visual, drop column fidelidad;
drop function if exists public.guardar_guion(uuid, text, jsonb, text, text, text, text);

-- ---------------------------------------------------------------------------
-- 5. Assets: tabla propia, alimentada por trigger desde Storage.
--    Sustituye al webhook api/hooks/storage: subir un RAW crea la tarea «editar».
-- ---------------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references piezas on delete cascade,
  ruta text not null unique,          -- piezas/{pieza_id}/{carpeta}/{nombre}
  carpeta text not null check (carpeta in ('raw','portada','final','otro')),
  nombre text not null,
  subido_por uuid references perfiles,
  created_at timestamptz not null default now()
);
create index assets_pieza on assets (pieza_id, created_at);
alter table assets enable row level security;
create policy owner_todo on assets for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy editor_leer on assets for select to authenticated using (rol_actual() = 'editor');

insert into assets (pieza_id, ruta, carpeta, nombre, subido_por, created_at)
select p.id, o.name,
       case when split_part(o.name, '/', 3) in ('raw','portada','final') then split_part(o.name, '/', 3) else 'otro' end,
       regexp_replace(o.name, '^.*/', ''), o.owner, o.created_at
from storage.objects o
join piezas p on p.id::text = split_part(o.name, '/', 2)
where o.bucket_id = 'assets' and o.name like 'piezas/%' and regexp_replace(o.name, '^.*/', '') <> '.emptyFolderPlaceholder'
on conflict (ruta) do nothing;

create or replace function public.registrar_asset()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; carp text; nom text; asignado uuid; abiertas int;
begin
  if new.bucket_id <> 'assets' or new.name not like 'piezas/%' then return new; end if;
  nom := regexp_replace(new.name, '^.*/', '');
  if nom = '.emptyFolderPlaceholder' then return new; end if;
  begin pid := split_part(new.name, '/', 2)::uuid; exception when others then return new; end;
  if not exists (select 1 from piezas where id = pid) then return new; end if;
  carp := case when split_part(new.name, '/', 3) in ('raw','portada','final') then split_part(new.name, '/', 3) else 'otro' end;
  insert into assets (pieza_id, ruta, carpeta, nombre, subido_por) values (pid, new.name, carp, nom, new.owner)
  on conflict (ruta) do update set created_at = now(), subido_por = excluded.subido_por;

  -- Un RAW nuevo abre la tarea «editar» si no hay una abierta.
  if carp = 'raw' then
    select count(*) into abiertas from tareas where pieza_id = pid and tipo = 'editar' and estado <> 'hecha';
    if abiertas = 0 then
      select responsable_id into asignado from piezas where id = pid;
      if asignado is null then
        select user_id into asignado from perfiles where rol = 'editor' order by created_at limit 1;
      end if;
      insert into tareas (pieza_id, tipo, asignado_a, vence)
      values (pid, 'editar', asignado, (now() at time zone 'America/Mexico_City')::date + 2);
      perform registrar_corrida('hook_storage_raw', 'ok', format('RAW de %s → tarea editar', (select id_publico from piezas where id = pid)),
        jsonb_build_object('pieza_id', pid, 'archivo', new.name));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists assets_registrar on storage.objects;
create trigger assets_registrar after insert on storage.objects for each row execute function registrar_asset();

create or replace function public.olvidar_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from assets where ruta = old.name;
  return old;
end $$;
drop trigger if exists assets_olvidar on storage.objects;
create trigger assets_olvidar after delete on storage.objects for each row execute function olvidar_asset();

-- ---------------------------------------------------------------------------
-- 6. Funciones con los nombres nuevos.
-- ---------------------------------------------------------------------------
drop function if exists public.prefijo_formato(text);
create or replace function public.prefijo_tipo(t text)
returns text language sql immutable set search_path = public as $$
  select case t
    when 'reel' then 'REE' when 'yap' then 'YAP' when 'carrusel' then 'CAR' when 'historia' then 'HIS'
    when 'x' then 'XPO' when 'canal_ig' then 'CAN' when 'newsletter' then 'NEW' when 'articulo' then 'ART'
    when 'youtube' then 'YTB' else 'IDE' end;
$$;

create or replace function public.asignar_id_publico()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and nullif(trim(coalesce(new.id_publico, '')), '') is null then
    new.id_publico := siguiente_id_publico(prefijo_tipo(new.tipo));
  elsif tg_op = 'UPDATE' and new.tipo is distinct from old.tipo and new.tipo is not null and new.id_publico like 'IDE-%' then
    new.id_publico := siguiente_id_publico(prefijo_tipo(new.tipo));
  end if;
  return new;
end $$;
create trigger piezas_id_publico before insert or update of tipo on piezas
  for each row execute function asignar_id_publico();

-- Crear una hipótesis resoluble (o reusar la que tenga el mismo texto).
create or replace function public.crear_hipotesis(p_texto text, p_campo text, p_numero numeric, p_fecha date)
returns hipotesis language plpgsql security definer set search_path = public as $$
declare h hipotesis%rowtype;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_texto), '') is null then raise exception 'Falta hipotesis.texto' using errcode = 'P0001'; end if;
  if nullif(trim(p_campo), '') is null then raise exception 'Falta hipotesis.campo' using errcode = 'P0001'; end if;
  if p_numero is null then raise exception 'Falta hipotesis.numero' using errcode = 'P0001'; end if;
  if p_fecha is null then raise exception 'Falta hipotesis.fecha (AAAA-MM-DD)' using errcode = 'P0001'; end if;
  if p_fecha <= (now() at time zone 'America/Mexico_City')::date then
    raise exception 'hipotesis.fecha debe estar en el futuro.' using errcode = 'P0001';
  end if;
  select * into h from hipotesis where texto = trim(p_texto) limit 1;
  if found then
    if h.campo is null then
      update hipotesis set campo = p_campo, numero = p_numero, fecha = p_fecha where id = h.id returning * into h;
    end if;
    return h;
  end if;
  insert into hipotesis (texto, campo, numero, fecha) values (trim(p_texto), p_campo, p_numero, p_fecha) returning * into h;
  return h;
end $$;
grant execute on function crear_hipotesis(text, text, numeric, date) to authenticated;

drop function if exists public.validar_pieza_para_estado(text, text, text, jsonb);
create or replace function public.validar_pieza_para_estado(p_estado text, p_tipo text, p_etapa text, p_hipotesis_id uuid, p_etiquetas text[] default '{}')
returns void language plpgsql immutable set search_path = public as $$
begin
  if p_estado in ('borrador', 'archivada') then return; end if;
  if p_tipo is null then
    raise exception 'Antes de producirla, la pieza necesita tipo (reel, carrusel, artículo…).' using errcode = 'P0001';
  end if;
  if p_estado = 'redaccion' then return; end if;
  if p_etapa is null then
    raise exception 'Para pasar a % falta la etapa del embudo.', p_estado using errcode = 'P0001';
  end if;
  if p_hipotesis_id is null and not ('legado' = any (coalesce(p_etiquetas, '{}'))) then
    raise exception 'Para pasar a % falta la hipótesis. Pídele a Claude que la escriba en redacción.', p_estado using errcode = 'P0001';
  end if;
end $$;

create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; h jsonb := payload->'hipotesis'; hid uuid; fid uuid;
        est text := coalesce(nullif(payload->>'estado',''), 'borrador');
        etq text[] := coalesce(array(select jsonb_array_elements_text(payload->'etiquetas')), '{}');
begin
  perform exigir_rol('owner');
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
    id_publico, comunidad_id, tipo, serie, formato_id, hipotesis_id, etapa_embudo, contenido,
    fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, notas, etiquetas
  ) values (
    nullif(payload->>'id_publico',''),
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'tipo', payload->>'serie', fid, hid, payload->>'etapa_embudo', payload->>'contenido',
    (payload->>'fecha_objetivo')::date, (payload->>'responsable_id')::uuid, payload->>'titulo',
    coalesce((payload->>'programa_aprobado')::boolean, false), est, payload->>'notas', etq
  ) returning * into p;
  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.tipo, 'sin tipo'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception when unique_violation then
  raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;

create or replace function public.cambiar_estado_pieza(p_pieza_id uuid, p_nuevo_estado text)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; rol text := rol_actual();
begin
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p_nuevo_estado = 'publicada' then
    raise exception 'Para publicar usa marcar_publicada con la URL.' using errcode = 'P0001';
  end if;
  if not transicion_permitida(rol, p.estado, p_nuevo_estado) then
    raise exception 'Tu rol (%) no puede pasar la pieza de % a %.', coalesce(rol,'ninguno'), p.estado, p_nuevo_estado using errcode = '42501';
  end if;
  if rol = 'editor' and p.responsable_id is distinct from auth.uid()
     and p.estado not in ('grabacion','diseno','listo','programada') then
    raise exception 'La pieza no está en tu cola.' using errcode = '42501';
  end if;
  perform validar_pieza_para_estado(p_nuevo_estado, p.tipo, p.etapa_embudo, p.hipotesis_id, p.etiquetas);
  update piezas set estado = p_nuevo_estado where id = p_pieza_id returning * into p;
  perform registrar_corrida('cambiar_estado_pieza', 'ok', format('%s → %s', p.id_publico, p_nuevo_estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
end $$;

-- La URL se captura en cuanto existe, no solo al publicar. Owner y editor.
create or replace function public.guardar_url(p_pieza_id uuid, p_url text, p_plataforma text default null)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype;
begin
  perform exigir_rol('owner', 'editor');
  if nullif(trim(p_url), '') is not null and p_url !~* '^https?://[^\s]+$' then
    raise exception 'La URL debe empezar con http(s)://' using errcode = 'P0001';
  end if;
  update piezas set url = nullif(trim(p_url), ''),
                    plataforma = coalesce(nullif(lower(trim(p_plataforma)), ''), plataforma)
   where id = p_pieza_id returning * into p;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  return p;
end $$;
grant execute on function guardar_url(uuid, text, text) to authenticated;

-- Guardar contenido = nueva versión + actualizar la pieza. Owner y editor.
create or replace function public.guardar_contenido(p_pieza_id uuid, p_contenido text, p_instruccion text default null, p_autor text default null)
returns contenido_versiones language plpgsql security definer set search_path = public as $$
declare v contenido_versiones%rowtype; n int;
begin
  perform exigir_rol('owner', 'editor');
  if nullif(trim(p_contenido), '') is null then
    raise exception 'El contenido no puede ir vacío.' using errcode = 'P0001';
  end if;
  select coalesce(max(version), 0) + 1 into n from contenido_versiones where pieza_id = p_pieza_id;
  insert into contenido_versiones (pieza_id, version, contenido, instruccion, autor)
  values (p_pieza_id, n, p_contenido, p_instruccion, coalesce(p_autor, (select nombre from perfiles where user_id = auth.uid())))
  returning * into v;
  update piezas set contenido = p_contenido where id = p_pieza_id;
  perform registrar_corrida('guardar_contenido', 'ok', format('%s v%s (%s)', (select id_publico from piezas where id = p_pieza_id), n, v.autor),
    jsonb_build_object('pieza_id', p_pieza_id, 'version', n, 'actor', auth.uid()));
  return v;
end $$;
grant execute on function guardar_contenido(uuid, text, text, text) to authenticated;

drop function if exists public.asignar_tarea(text, text, date, uuid, uuid, jsonb);
create or replace function public.asignar_tarea(p_tipo text, p_asignado_a text, p_vence date, p_pieza_id uuid default null, p_historia_id uuid default null)
returns tareas language plpgsql security definer set search_path = public as $$
declare t tareas%rowtype; quien uuid;
begin
  perform exigir_rol('owner');
  if p_pieza_id is null and p_historia_id is null then
    raise exception 'La tarea necesita pieza_id o historia_id.' using errcode = 'P0001';
  end if;
  if p_asignado_a ~ '^[0-9a-f-]{36}$' then quien := p_asignado_a::uuid;
  else select user_id into quien from perfiles where nombre ilike p_asignado_a || '%' limit 1; end if;
  if quien is null then raise exception 'No encuentro a %.', p_asignado_a using errcode = 'P0001'; end if;
  insert into tareas (pieza_id, historia_id, tipo, asignado_a, vence) values (p_pieza_id, p_historia_id, p_tipo, quien, p_vence) returning * into t;
  perform registrar_corrida('asignar_tarea', 'ok', format('%s → %s vence %s', p_tipo, quien, p_vence),
    jsonb_build_object('tarea_id', t.id, 'actor', auth.uid()));
  return t;
end $$;
grant execute on function asignar_tarea(text, text, date, uuid, uuid) to authenticated;

create or replace function public.guardar_columnas_tarea()
returns trigger language plpgsql security definer as $$
begin
  if rol_actual() = 'editor' then
    if new.pieza_id is distinct from old.pieza_id or new.historia_id is distinct from old.historia_id
       or new.tipo is distinct from old.tipo or new.asignado_a is distinct from old.asignado_a
       or new.vence is distinct from old.vence then
      raise exception 'Solo puedes cambiar el estado y la nota de bloqueo.' using errcode = '42501';
    end if;
    if new.estado = 'hecha' and old.estado <> 'hecha' then new.hecha_en := coalesce(new.hecha_en, now()); end if;
  end if;
  return new;
end $$;

create or replace function public.multiplicador(p_pieza_id uuid, p_min_n int default 3)
returns table (multiplicador numeric, n int, mediana numeric, views int)
language plpgsql stable as $$
declare p piezas%rowtype; v int; med numeric; cnt int;
begin
  select * into p from piezas where id = p_pieza_id;
  if not found or p.publicada_en is null then return; end if;
  v := views_recientes(p_pieza_id);
  select count(*), percentile_cont(0.5) within group (order by x.v) into cnt, med
  from (
    select views_recientes(p2.id) as v from piezas p2
    where p2.tipo = p.tipo and p2.estado = 'publicada' and p2.publicada_en < p.publicada_en and p2.id <> p.id
    order by p2.publicada_en desc limit 12
  ) x where x.v is not null;
  if v is null or cnt < p_min_n or coalesce(med, 0) = 0 then
    return query select null::numeric, cnt, med, v;
  else
    return query select round(v::numeric / med, 2), cnt, med, v;
  end if;
end $$;

drop function if exists public.cuota_semana(date);
create or replace function public.cuota_semana(p_semana date)
returns table (tipo text, meta int, publicadas int, en_camino int, piezas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare m record; tps text[];
begin
  perform exigir_rol('owner', 'viewer');
  for m in select * from metas_semana order by metas_semana.tipo loop
    tipo := m.tipo; meta := m.cantidad;
    if m.tipo = 'historia_dia' then
      select count(distinct (h.publicada_en at time zone 'America/Mexico_City')::date) into publicadas
        from historias h where h.estado = 'publicada' and h.semana = p_semana;
      select count(distinct h.dia) into en_camino from historias h where h.semana = p_semana and h.estado in ('aprobada','programada');
      select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'dia', h.dia, 'serie', h.serie, 'estado', h.estado) order by h.dia, h.orden), '[]')
        into piezas from historias h where h.semana = p_semana and h.estado <> 'descartada';
    else
      tps := case when m.tipo = 'reel' then array['reel','yap'] else array[m.tipo] end;
      select count(*) into publicadas from piezas p
        where p.estado = 'publicada' and p.tipo = any (tps)
          and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz;
      select count(*) into en_camino from piezas p
        where p.tipo = any (tps) and p.estado not in ('publicada','archivada','en_trial','borrador')
          and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7;
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'id_publico', p.id_publico, 'titulo', p.titulo, 'estado', p.estado,
               'fecha_objetivo', p.fecha_objetivo, 'responsable', pf.nombre) order by p.fecha_objetivo nulls last, p.id_publico), '[]')
        into piezas
        from piezas p left join perfiles pf on pf.user_id = p.responsable_id
        where p.tipo = any (tps) and p.estado not in ('archivada','borrador') and (
          (p.estado = 'publicada' and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz)
          or (p.estado <> 'publicada' and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7));
    end if;
    return next;
  end loop;
end $$;
grant execute on function cuota_semana(date) to authenticated;

-- evidencia_nodo: las definiciones de sistemas dicen «formato»; se lee como tipo.
create or replace function public.evidencia_nodo(ev jsonb, p_semana date)
returns table (n int, cuando timestamptz, detalle text)
language plpgsql stable security definer set search_path = public as $$
declare
  fuente text := coalesce(ev->>'fuente', 'ninguna');
  desde timestamptz := p_semana::timestamptz;
  hasta timestamptz := (p_semana + 7)::timestamptz;
  tps text[] := case when ev ? 'tipo' then array(select jsonb_array_elements_text(ev->'tipo'))
                     when ev ? 'formato' then array(select jsonb_array_elements_text(ev->'formato')) end;
  tipos_tarea text[] := case when fuente = 'tareas' and ev ? 'tipo' then array(select jsonb_array_elements_text(ev->'tipo')) end;
begin
  if fuente = 'corridas' then
    return query
      select count(*)::int, max(c.inicio), format('%s corridas de %s', count(*), ev->>'sistema')
      from corridas c where c.sistema = ev->>'sistema' and c.inicio >= desde and c.inicio < hasta
        and coalesce(c.estado, 'ok') <> 'error';
  elsif fuente = 'tareas' then
    return query
      select count(*)::int, max(t.hecha_en), format('%s tareas hechas (%s)', count(*), array_to_string(tipos_tarea, ', '))
      from tareas t where t.estado = 'hecha' and t.hecha_en >= desde and t.hecha_en < hasta
        and (tipos_tarea is null or t.tipo = any (tipos_tarea));
  elsif fuente = 'piezas' then
    if coalesce(ev->>'modo', 'publicadas') = 'objetivo' then
      return query
        select count(*)::int, max(p.updated_at), format('%s piezas con fecha objetivo esta semana', count(*))
        from piezas p where p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7
          and p.estado not in ('archivada') and (tps is null or p.tipo = any (tps));
    else
      return query
        select count(*)::int, max(p.publicada_en), format('%s publicadas (%s)', count(*), coalesce(array_to_string(tps, ', '), 'todo'))
        from piezas p where p.estado = 'publicada' and p.publicada_en >= desde and p.publicada_en < hasta
          and (tps is null or p.tipo = any (tps));
    end if;
  elsif fuente = 'historias' then
    if ev->>'campo' = 'metricas' then
      return query
        select count(*)::int, max(h.metricas_en), format('%s historias con métricas capturadas', count(*))
        from historias h where h.semana = p_semana and h.metricas_en is not null;
    elsif ev->>'estado' = 'aprobada' then
      return query
        select count(*)::int, null::timestamptz, format('%s historias aprobadas', count(*))
        from historias h where h.semana = p_semana and h.estado in ('aprobada','programada','publicada');
    else
      return query
        select count(*)::int, max(h.publicada_en), format('%s historias publicadas', count(*))
        from historias h where h.estado = 'publicada' and h.publicada_en >= desde and h.publicada_en < hasta;
    end if;
  elsif fuente = 'indicadores' then
    return query
      select case when i.semana is null then 0 else 1 end, i.actualizado_en,
             case when i.semana is null then 'sin dato' else format('%s = %s', ev->>'campo', to_jsonb(i) ->> (ev->>'campo')) end
      from (select * from indicadores_semana where semana = p_semana) i
      right join (select 1) x on true
      where i.semana is null or (to_jsonb(i) ->> (ev->>'campo')) is not null;
  elsif fuente = 'metricas' then
    return query
      select count(*)::int, max(m.created_at), format('%s lecturas (%s)', count(*), ev->>'fuente_metrica')
      from metricas m where m.fecha >= p_semana and m.fecha < p_semana + 7
        and (ev->>'fuente_metrica' is null or m.fuente = ev->>'fuente_metrica');
  elsif fuente = 'recursos' then
    return query
      select count(*)::int, max(r.leads_actualizado_en), format('%s recursos con leads actualizados', count(*))
      from recursos r where r.leads_actualizado_en >= desde and r.leads_actualizado_en < hasta;
  elsif fuente = 'campanas' then
    return query
      select count(*)::int, max(c.created_at), format('%s campañas activas (%s)', count(*), ev->>'objetivo')
      from campanas c where c.activa and (ev->>'objetivo' is null or c.objetivo = ev->>'objetivo');
  else
    return query select 0, null::timestamptz, 'sin sensor'::text;
  end if;
end $$;

drop function if exists public.hipotesis_valida(jsonb);
