-- Identidad: la verdad universal de quién es Nazho y cómo escribe, en siete filas.
-- La leen todos los roles (web, MCP y el endpoint /api/identidad); la escribe solo owner, con motivo.
-- Cada cambio de contenido guarda la versión anterior en identidad_versiones y sube `version`.

create table public.identidad (
  clave           text primary key check (clave ~ '^[a-z][a-z0-9-]+$'),
  orden           int  not null,
  titulo          text not null,
  resumen         text not null,
  cuerpo          text not null,
  version         int  not null default 1,
  vigente         boolean not null default true,
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references public.perfiles(user_id) on delete set null,
  motivo          text
);
comment on table public.identidad is 'Identidad y voz de Nazho: siete filas que todo agente lee antes de escribir o decidir por él.';

create table public.identidad_versiones (
  id              bigserial primary key,
  clave           text not null references public.identidad(clave) on delete cascade,
  version         int  not null,
  titulo          text not null,
  resumen         text not null,
  cuerpo          text not null,
  actualizado     timestamptz not null,
  actualizado_por uuid,
  motivo          text,
  guardado        timestamptz not null default now(),
  unique (clave, version)
);

create or replace function public.identidad_versionar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.cuerpo is distinct from old.cuerpo or new.resumen is distinct from old.resumen or new.titulo is distinct from old.titulo then
    if coalesce(new.motivo, '') = '' then
      raise exception 'Falta motivo: toda edición de la identidad dice por qué cambia.';
    end if;
    insert into identidad_versiones (clave, version, titulo, resumen, cuerpo, actualizado, actualizado_por, motivo)
    values (old.clave, old.version, old.titulo, old.resumen, old.cuerpo, old.actualizado, old.actualizado_por, old.motivo);
    new.version := old.version + 1;
    new.actualizado := now();
    new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  end if;
  return new;
end $$;

create trigger identidad_versionar before update on public.identidad
  for each row execute function public.identidad_versionar();

alter table public.identidad enable row level security;
alter table public.identidad_versiones enable row level security;

create policy identidad_leer on public.identidad for select to authenticated using (true);
create policy identidad_owner on public.identidad for all to authenticated
  using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy identidad_versiones_leer on public.identidad_versiones for select to authenticated using (true);
create policy identidad_versiones_owner on public.identidad_versiones for all to authenticated
  using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
