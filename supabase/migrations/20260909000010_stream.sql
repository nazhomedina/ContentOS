-- 010 · Stream de redacción (docs/redaccion.md): pensamientos ligados a piezas, versiones de guion.
-- Las ideas ya son piezas, así que pensamientos cuelga de piezas.

alter table pensamientos alter column idea_id drop not null;
alter table pensamientos add column pieza_id uuid references piezas on delete cascade;
alter table pensamientos add column duracion_s int;
alter table pensamientos add column ronda smallint;
alter table pensamientos add constraint pensamiento_con_objeto check (pieza_id is not null or idea_id is not null);
create index pensamientos_pieza on pensamientos (pieza_id, created_at);

alter table pensamientos enable row level security;
drop policy if exists owner_todo on pensamientos;
create policy owner_todo on pensamientos for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');

create table public.guion_versiones (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references piezas on delete cascade,
  version int not null,
  guion text not null,
  hipotesis jsonb,
  spec_visual text,
  fidelidad text,
  instruccion text,
  autor text,
  created_at timestamptz not null default now(),
  unique (pieza_id, version)
);
alter table guion_versiones enable row level security;
create policy owner_todo on guion_versiones for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy editor_leer on guion_versiones for select to authenticated
  using (rol_actual() = 'editor' and exists (select 1 from piezas p where p.id = guion_versiones.pieza_id));

-- Guardar un guion = nueva versión + actualizar la pieza (y opcionalmente hipótesis, spec, estado).
create or replace function public.guardar_guion(
  p_pieza_id uuid, p_guion text, p_hipotesis jsonb default null, p_spec_visual text default null,
  p_fidelidad text default null, p_instruccion text default null, p_autor text default null
) returns guion_versiones language plpgsql security definer set search_path = public as $$
declare v guion_versiones%rowtype; n int;
begin
  perform exigir_rol('owner');
  if nullif(trim(p_guion), '') is null then
    raise exception 'El guion no puede ir vacío.' using errcode = 'P0001';
  end if;
  if p_hipotesis is not null and not hipotesis_valida(p_hipotesis) then
    raise exception 'La hipótesis necesita campo, número y fecha (AAAA-MM-DD).' using errcode = 'P0001';
  end if;
  select coalesce(max(version), 0) + 1 into n from guion_versiones where pieza_id = p_pieza_id;
  insert into guion_versiones (pieza_id, version, guion, hipotesis, spec_visual, fidelidad, instruccion, autor)
  values (p_pieza_id, n, p_guion, p_hipotesis, p_spec_visual, p_fidelidad, p_instruccion, p_autor)
  returning * into v;
  update piezas set
    guion = p_guion,
    hipotesis = coalesce(p_hipotesis, hipotesis),
    spec_visual = coalesce(p_spec_visual, spec_visual),
    fidelidad = coalesce(p_fidelidad, fidelidad)
  where id = p_pieza_id;
  perform registrar_corrida('guardar_guion', 'ok', format('%s v%s (%s)', (select id_publico from piezas where id = p_pieza_id), n, coalesce(p_autor, 'claude')),
    jsonb_build_object('pieza_id', p_pieza_id, 'version', n, 'actor', auth.uid()));
  return v;
end $$;

grant execute on function guardar_guion(uuid, text, jsonb, text, text, text, text) to authenticated;
