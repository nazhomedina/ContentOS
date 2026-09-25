-- Maquetas HTML por pieza (spec «Maquetas HTML en ContentOS», 2026-09-25).
-- Reutiliza el bucket privado `assets`, la tabla `assets` y el trigger `registrar_asset`.
-- Ruta: piezas/{pieza_id}/maqueta/v{N}.html. Nunca se sobrescribe: cada guardado es una versión nueva.

-- 1. Carpeta nueva
alter table public.assets drop constraint assets_carpeta_check;
alter table public.assets add constraint assets_carpeta_check
  check (carpeta in ('raw', 'portada', 'final', 'otro', 'maqueta'));

-- 2. Versión de la maqueta, versión del copy que ilustra, y qué cambió
alter table public.assets
  add column version int,
  add column contenido_version int,
  add column nota text;
alter table public.assets add constraint assets_version_solo_maqueta check (carpeta = 'maqueta' or version is null);
create unique index assets_maqueta_version on public.assets (pieza_id, version) where carpeta = 'maqueta';

-- 3. El trigger reconoce la carpeta y lee la versión del nombre (v3.html → 3). La tarea «editar» sigue siendo solo para raw.
create or replace function public.registrar_asset()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; carp text; nom text; asignado uuid; abiertas int; ver int;
begin
  if new.bucket_id <> 'assets' or new.name not like 'piezas/%' then return new; end if;
  nom := regexp_replace(new.name, '^.*/', '');
  if nom = '.emptyFolderPlaceholder' then return new; end if;
  begin pid := split_part(new.name, '/', 2)::uuid; exception when others then return new; end;
  if not exists (select 1 from piezas where id = pid) then return new; end if;
  carp := case when split_part(new.name, '/', 3) in ('raw', 'portada', 'final', 'maqueta') then split_part(new.name, '/', 3) else 'otro' end;
  if carp = 'maqueta' then
    ver := (regexp_match(nom, '^v(\d+)\.html$'))[1]::int;
    if ver is null then carp := 'otro'; end if;
  end if;
  insert into assets (pieza_id, ruta, carpeta, nombre, subido_por, version) values (pid, new.name, carp, nom, new.owner, ver)
  on conflict (ruta) do update set created_at = now(), subido_por = excluded.subido_por;
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

-- 4. La maqueta vigente por pieza, con aviso si el copy avanzó después
create view public.maqueta_actual with (security_invoker = true) as
select distinct on (a.pieza_id)
  a.pieza_id, a.ruta, a.version, a.contenido_version, a.nota, a.created_at,
  coalesce((select max(v.version) from contenido_versiones v where v.pieza_id = a.pieza_id), 0) as contenido_actual,
  coalesce((select max(v.version) from contenido_versiones v where v.pieza_id = a.pieza_id), 0) > coalesce(a.contenido_version, 0) as desactualizada
from public.assets a
where a.carpeta = 'maqueta' and a.version is not null
order by a.pieza_id, a.version desc;
grant select on public.maqueta_actual to authenticated;
