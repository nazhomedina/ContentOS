-- 008 · Bitácora diaria (accountability del equipo).
-- Cada persona declara al día en qué trabajó, ligado a una pieza y con evidencia opcional.
-- El owner ve lo declarado junto a la evidencia automática (tareas hechas, estados movidos,
-- historias publicadas, archivos subidos). Lo que no se declara se ve como hueco, no se estima.

create table public.bitacora (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfiles on delete cascade,
  fecha date not null default (now() at time zone 'America/Mexico_City')::date,
  pieza_id uuid references piezas on delete set null,
  tarea_id uuid references tareas on delete set null,
  texto text not null check (length(trim(texto)) > 0),
  minutos int check (minutos is null or (minutos >= 0 and minutos <= 960)),
  evidencia_url text,                    -- ruta en el bucket assets o URL externa
  created_at timestamptz not null default now()
);
create index bitacora_perfil_fecha on bitacora (perfil_id, fecha desc);
create index bitacora_pieza on bitacora (pieza_id);

alter table bitacora enable row level security;
create policy owner_todo on bitacora for all to authenticated
  using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy propia_leer on bitacora for select to authenticated using (perfil_id = auth.uid());
create policy propia_escribir on bitacora for insert to authenticated with check (perfil_id = auth.uid());
-- Solo se corrige lo de hoy: lo de ayer queda como se declaró.
create policy propia_corregir on bitacora for update to authenticated
  using (perfil_id = auth.uid() and fecha = (now() at time zone 'America/Mexico_City')::date)
  with check (perfil_id = auth.uid() and fecha = (now() at time zone 'America/Mexico_City')::date);
create policy propia_borrar on bitacora for delete to authenticated
  using (perfil_id = auth.uid() and fecha = (now() at time zone 'America/Mexico_City')::date);

-- Storage: la editora puede subir evidencia a assets/bitacora/{user_id}/*
create policy assets_editor_bitacora on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assets' and rol_actual() = 'editor'
    and (storage.foldername(name))[1] = 'bitacora'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Evidencia automática de una persona en un día (owner o la propia persona).
-- ---------------------------------------------------------------------------
create or replace function public.evidencia_dia(p_perfil uuid, p_fecha date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  desde timestamptz := (p_fecha::timestamp at time zone 'America/Mexico_City');
  hasta timestamptz := ((p_fecha + 1)::timestamp at time zone 'America/Mexico_City');
  r jsonb;
begin
  if not (rol_actual() = 'owner' or auth.uid() = p_perfil) then
    raise exception 'Solo el dueño o la propia persona.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'tareas_hechas', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'tipo', t.tipo, 'pieza', p.id_publico, 'pieza_id', p.id, 'titulo', p.titulo, 'cuando', t.hecha_en) order by t.hecha_en)
      from tareas t left join piezas p on p.id = t.pieza_id
      where t.asignado_a = p_perfil and t.estado = 'hecha' and t.hecha_en >= desde and t.hecha_en < hasta), '[]'),
    'estados', coalesce((
      select jsonb_agg(jsonb_build_object('resumen', c.resumen, 'cuando', c.inicio) order by c.inicio)
      from corridas c
      where c.sistema in ('cambiar_estado_pieza', 'marcar_publicada', 'historia_publicada')
        and c.payload->>'actor' = p_perfil::text and c.inicio >= desde and c.inicio < hasta), '[]'),
    'historias_publicadas', coalesce((
      select count(*) from historias h where h.publicada_en >= desde and h.publicada_en < hasta), 0),
    'archivos', coalesce((
      select jsonb_agg(jsonb_build_object('ruta', o.name, 'cuando', o.created_at) order by o.created_at)
      from storage.objects o
      where o.bucket_id = 'assets' and o.owner = p_perfil and o.created_at >= desde and o.created_at < hasta), '[]'),
    'comentarios', coalesce((
      select count(*) from comentarios c where c.autor = p_perfil and c.created_at >= desde and c.created_at < hasta), 0)
  ) into r;
  return r;
end $$;

-- Resumen de una semana por persona: días con bitácora, tareas hechas, archivos.
create or replace function public.resumen_semana_persona(p_perfil uuid, p_semana date)
returns table (fecha date, declaraciones int, tareas_hechas int, archivos int, estados int)
language plpgsql stable security definer set search_path = public as $$
declare d date; ev jsonb;
begin
  if not (rol_actual() = 'owner' or auth.uid() = p_perfil) then
    raise exception 'Solo el dueño o la propia persona.' using errcode = '42501';
  end if;
  for d in select generate_series(p_semana, p_semana + 6, interval '1 day')::date loop
    ev := evidencia_dia(p_perfil, d);
    fecha := d;
    select count(*)::int into declaraciones from bitacora b where b.perfil_id = p_perfil and b.fecha = d;
    tareas_hechas := jsonb_array_length(ev->'tareas_hechas');
    archivos := jsonb_array_length(ev->'archivos');
    estados := jsonb_array_length(ev->'estados');
    return next;
  end loop;
end $$;

grant execute on function evidencia_dia(uuid, date), resumen_semana_persona(uuid, date) to authenticated;
