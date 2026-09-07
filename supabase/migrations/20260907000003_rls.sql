-- 003 · RLS por rol (handoff §3). Sin policy = sin acceso.
-- owner: todo. editor: su cola y las piezas en producción. viewer: lo publicado.
-- El MCP impersona al dueño de la API key, así que estas reglas también le aplican.

alter table comunidades          enable row level security;
alter table perfiles             enable row level security;
alter table perfiles_permitidos  enable row level security;
alter table ideas                enable row level security;
alter table pensamientos         enable row level security;
alter table format_cards         enable row level security;
alter table piezas               enable row level security;
alter table recursos             enable row level security;
alter table historias            enable row level security;
alter table tareas               enable row level security;
alter table metricas             enable row level security;
alter table corridas             enable row level security;
alter table sistemas_registrados enable row level security;
alter table indicadores_semana   enable row level security;
alter table comentarios          enable row level security;

-- ---------------------------------------------------------------------------
-- owner: todo, en todas las tablas
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'comunidades','perfiles','perfiles_permitidos','ideas','pensamientos','format_cards','piezas',
    'recursos','historias','tareas','metricas','corridas','sistemas_registrados','indicadores_semana','comentarios']
  loop
    execute format('create policy owner_todo on %I for all to authenticated using (rol_actual() = ''owner'') with check (rol_actual() = ''owner'')', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Lectura compartida (editor y viewer)
-- ---------------------------------------------------------------------------

-- Perfiles: todos ven nombre y rol de todos (para mostrar responsables). La API key
-- se protege en la capa de app: nunca se selecciona api_key_hash fuera del server.
create policy perfiles_leer on perfiles for select to authenticated using (true);

create policy comunidades_leer on comunidades for select to authenticated
  using (rol_actual() in ('editor','viewer'));

create policy format_cards_leer on format_cards for select to authenticated
  using (rol_actual() in ('editor','viewer'));

create policy recursos_leer_editor on recursos for select to authenticated
  using (rol_actual() = 'editor');

-- ---------------------------------------------------------------------------
-- piezas
-- ---------------------------------------------------------------------------

create policy piezas_editor_leer on piezas for select to authenticated
  using (
    rol_actual() = 'editor' and (
      estado in ('para_grabar','edicion','buffer','programada','publicada')
      or responsable_id = auth.uid()
    )
  );
-- El editor no tiene update directo: solo cambiar_estado_pieza() y marcar_publicada().

create policy piezas_viewer_leer on piezas for select to authenticated
  using (rol_actual() = 'viewer' and estado = 'publicada');

-- ---------------------------------------------------------------------------
-- tareas: el editor ve y actualiza lo suyo (columnas guardadas por trigger)
-- ---------------------------------------------------------------------------

create policy tareas_editor_leer on tareas for select to authenticated
  using (rol_actual() = 'editor' and asignado_a = auth.uid());

create policy tareas_editor_actualizar on tareas for update to authenticated
  using (rol_actual() = 'editor' and asignado_a = auth.uid())
  with check (rol_actual() = 'editor' and asignado_a = auth.uid());

-- ---------------------------------------------------------------------------
-- historias
-- ---------------------------------------------------------------------------

create policy historias_editor_leer on historias for select to authenticated
  using (rol_actual() = 'editor' and estado in ('aprobada','programada','publicada'));

create policy historias_editor_actualizar on historias for update to authenticated
  using (rol_actual() = 'editor' and estado in ('aprobada','programada','publicada'))
  with check (rol_actual() = 'editor' and estado in ('aprobada','programada','publicada'));

create policy historias_viewer_leer on historias for select to authenticated
  using (rol_actual() = 'viewer' and estado = 'publicada');

-- ---------------------------------------------------------------------------
-- metricas: se ven si se ve la pieza (la subconsulta hereda la RLS de piezas)
-- ---------------------------------------------------------------------------

create policy metricas_leer on metricas for select to authenticated
  using (rol_actual() in ('editor','viewer') and exists (select 1 from piezas p where p.id = metricas.pieza_id));

-- Captura manual del editor (follows, views de historias van en historias): fuente = manual.
create policy metricas_editor_manual on metricas for insert to authenticated
  with check (rol_actual() = 'editor' and fuente = 'manual' and capturado_por = auth.uid()
              and exists (select 1 from piezas p where p.id = metricas.pieza_id));

-- ---------------------------------------------------------------------------
-- comentarios: quien ve la pieza puede leer y escribir
-- ---------------------------------------------------------------------------

create policy comentarios_leer on comentarios for select to authenticated
  using (exists (select 1 from piezas p where p.id = comentarios.pieza_id));

create policy comentarios_escribir on comentarios for insert to authenticated
  with check (autor = auth.uid() and exists (select 1 from piezas p where p.id = comentarios.pieza_id));

-- ---------------------------------------------------------------------------
-- indicadores_semana: el viewer ve el tablero; el editor no ve dinero
-- ---------------------------------------------------------------------------

create policy indicadores_viewer_leer on indicadores_semana for select to authenticated
  using (rol_actual() = 'viewer');

-- sistemas_registrados y corridas: solo owner (latidos() es security definer para el tablero).

-- ---------------------------------------------------------------------------
-- Storage: bucket privado 'assets'
--   lectura: cualquier autenticado
--   escritura editor: assets/piezas/{pieza_id}/* (pieza visible) y assets/historias/{semana}/*
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('assets', 'assets', false, 524288000)
on conflict (id) do nothing;

create policy assets_leer on storage.objects for select to authenticated
  using (bucket_id = 'assets');

create policy assets_owner on storage.objects for all to authenticated
  using (bucket_id = 'assets' and rol_actual() = 'owner')
  with check (bucket_id = 'assets' and rol_actual() = 'owner');

create policy assets_editor_escribir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assets' and rol_actual() = 'editor' and (
      ((storage.foldername(name))[1] = 'piezas'
        and exists (select 1 from piezas p where p.id::text = (storage.foldername(name))[2]))
      or (storage.foldername(name))[1] = 'historias'
    )
  );

create policy assets_editor_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'assets' and rol_actual() = 'editor' and owner = auth.uid())
  with check (bucket_id = 'assets' and rol_actual() = 'editor' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------

grant execute on function rol_actual(), latidos(), multiplicador(uuid, int), views_recientes(uuid),
  cambiar_estado_pieza(uuid, text), marcar_publicada(uuid, text, text) to authenticated;
grant execute on function crear_pieza_validada(jsonb), asignar_tarea(text, text, date, uuid, uuid, jsonb),
  aprobar_historias(date, uuid), recalcular_multiplicadores() to authenticated;
revoke execute on function registrar_corrida(text, text, text, jsonb) from anon;
