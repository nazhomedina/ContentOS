-- 002 · Funciones y triggers (handoff §4). Se aplica antes de la RLS porque
-- las policies del editor dependen de rol_actual() y de las funciones
-- security definer que son su única vía de escritura sobre piezas.

-- ---------------------------------------------------------------------------
-- Identidad
-- ---------------------------------------------------------------------------

create or replace function public.rol_actual()
returns text language sql stable security definer set search_path = public as $$
  select rol from perfiles where user_id = auth.uid();
$$;

create or replace function public.exigir_rol(variadic roles text[])
returns void language plpgsql stable as $$
begin
  if coalesce(rol_actual(), '') <> all (roles) then
    raise exception 'Esta acción requiere rol %; tu rol es %.', array_to_string(roles, ' o '), coalesce(rol_actual(), 'ninguno')
      using errcode = '42501';
  end if;
end $$;

-- Para el MCP: resuelve el perfil dueño de una API key ya hasheada.
create or replace function public.perfil_por_api_key(p_hash text)
returns perfiles language sql stable security definer set search_path = public as $$
  select * from perfiles where api_key_hash = p_hash;
$$;
revoke all on function public.perfil_por_api_key(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Latidos
-- ---------------------------------------------------------------------------

create or replace function public.registrar_corrida(
  p_sistema text, p_estado text, p_resumen text default null, p_payload jsonb default null
) returns bigint language sql security definer set search_path = public as $$
  insert into corridas (sistema, inicio, fin, estado, resumen, payload)
  values (p_sistema, now(), now(), p_estado, p_resumen, p_payload)
  returning id;
$$;

create or replace function public.latidos()
returns table (
  sistema text, esperado_cada interval, ultima_corrida timestamptz,
  ultimo_estado text, ultimo_resumen text, atrasado boolean
) language sql stable security definer set search_path = public as $$
  select s.nombre, s.esperado_cada, c.inicio, c.estado, c.resumen,
         coalesce(c.inicio, '-infinity'::timestamptz) < now() - s.esperado_cada as atrasado
  from sistemas_registrados s
  left join lateral (
    select inicio, estado, resumen from corridas
    where corridas.sistema = s.nombre order by inicio desc limit 1
  ) c on true
  where s.activo
  order by atrasado desc, s.nombre;
$$;

-- ---------------------------------------------------------------------------
-- Multiplicador: views ÷ mediana de las 12 piezas publicadas anteriores del mismo formato
-- ---------------------------------------------------------------------------

-- Última lectura de views con dato real (nunca 'pendiente').
create or replace function public.views_recientes(p_pieza_id uuid)
returns int language sql stable as $$
  select views from metricas
  where pieza_id = p_pieza_id and views is not null and fuente <> 'pendiente'
  order by fecha desc, created_at desc limit 1;
$$;

create or replace function public.multiplicador(p_pieza_id uuid, p_min_n int default 3)
returns table (multiplicador numeric, n int, mediana numeric, views int)
language plpgsql stable as $$
declare
  p piezas%rowtype;
  v int;
  med numeric;
  cnt int;
begin
  select * into p from piezas where id = p_pieza_id;
  if not found or p.publicada_en is null then
    return;
  end if;
  v := views_recientes(p_pieza_id);
  select count(*), percentile_cont(0.5) within group (order by x.v)
    into cnt, med
  from (
    select views_recientes(p2.id) as v
    from piezas p2
    where p2.formato = p.formato and p2.estado = 'publicada'
      and p2.publicada_en < p.publicada_en and p2.id <> p.id
    order by p2.publicada_en desc limit 12
  ) x
  where x.v is not null;
  if v is null or cnt < p_min_n or coalesce(med, 0) = 0 then
    return query select null::numeric, cnt, med, v;
  else
    return query select round(v::numeric / med, 2), cnt, med, v;
  end if;
end $$;

-- Job nocturno (pg_cron en S2): escribe el valor en la lectura más reciente de cada pieza publicada.
create or replace function public.recalcular_multiplicadores()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record; m record; total int := 0;
begin
  for r in
    select distinct on (m.pieza_id) m.id, m.pieza_id
    from metricas m join piezas p on p.id = m.pieza_id
    where p.estado = 'publicada' and m.views is not null and m.fuente <> 'pendiente'
    order by m.pieza_id, m.fecha desc, m.created_at desc
  loop
    select * into m from multiplicador(r.pieza_id);
    update metricas set multiplicador = m.multiplicador, n_mediana = m.n where id = r.id;
    total := total + 1;
  end loop;
  perform registrar_corrida('recalcular_multiplicadores', case when total > 0 then 'ok' else 'vacio' end,
    format('%s piezas recalculadas', total));
  return total;
end $$;

-- ---------------------------------------------------------------------------
-- Piezas: transiciones y publicación
-- ---------------------------------------------------------------------------

create or replace function public.transicion_permitida(p_rol text, p_de text, p_a text)
returns boolean language sql immutable as $$
  select case
    when p_rol = 'owner' then p_a <> 'publicada'      -- publicada solo por marcar_publicada
    when p_rol = 'editor' then (p_de, p_a) in (
      ('para_grabar','edicion'), ('edicion','buffer'), ('buffer','programada'), ('programada','buffer'))
    else false end;
$$;

create or replace function public.cambiar_estado_pieza(p_pieza_id uuid, p_nuevo_estado text)
returns piezas language plpgsql security definer set search_path = public as $$
declare
  p piezas%rowtype;
  rol text := rol_actual();
begin
  select * into p from piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'No existe la pieza.' using errcode = 'P0002';
  end if;
  if p_nuevo_estado = 'publicada' then
    raise exception 'Para publicar usa marcar_publicada con la URL.' using errcode = 'P0001';
  end if;
  if not transicion_permitida(rol, p.estado, p_nuevo_estado) then
    raise exception 'Tu rol (%) no puede pasar la pieza de % a %.', coalesce(rol,'ninguno'), p.estado, p_nuevo_estado
      using errcode = '42501';
  end if;
  if rol = 'editor' and p.responsable_id is distinct from auth.uid()
     and p.estado not in ('para_grabar','edicion','buffer','programada') then
    raise exception 'La pieza no está en tu cola.' using errcode = '42501';
  end if;
  update piezas set estado = p_nuevo_estado where id = p_pieza_id returning * into p;
  perform registrar_corrida('cambiar_estado_pieza', 'ok',
    format('%s: %s → %s', p.id_publico, p.estado, p_nuevo_estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
end $$;

create or replace function public.marcar_publicada(p_pieza_id uuid, p_url text, p_plataforma text)
returns piezas language plpgsql security definer set search_path = public as $$
declare
  p piezas%rowtype;
  hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  perform exigir_rol('owner', 'editor');
  select * into p from piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'No existe la pieza.' using errcode = 'P0002';
  end if;
  if p.estado = 'publicada' then
    raise exception '% ya está publicada.', p.id_publico using errcode = 'P0001';
  end if;
  if p.estado not in ('buffer', 'programada') then
    raise exception 'Falta pasar por buffer: la pieza está en %.', p.estado using errcode = 'P0001';
  end if;
  if p_url is null or p_url !~* '^https?://[^\s]+$' then
    raise exception 'La URL es obligatoria y debe empezar con http(s)://' using errcode = 'P0001';
  end if;
  if nullif(trim(p_plataforma), '') is null then
    raise exception 'Falta la plataforma (instagram, youtube, x, kit…).' using errcode = 'P0001';
  end if;

  update piezas
     set estado = 'publicada', publicada_en = now(), url = p_url, plataforma = lower(trim(p_plataforma))
   where id = p_pieza_id returning * into p;

  update tareas set estado = 'hecha', hecha_en = now()
   where pieza_id = p_pieza_id and tipo = 'publicar' and estado <> 'hecha';

  insert into metricas (pieza_id, fecha, fuente, capturado_por)
  values (p_pieza_id, hoy, 'pendiente', auth.uid())
  on conflict (pieza_id, fecha, fuente) do nothing;

  perform registrar_corrida('marcar_publicada', 'ok',
    format('%s publicada en %s', p.id_publico, p.plataforma),
    jsonb_build_object('pieza_id', p.id, 'url', p_url, 'actor', auth.uid()));
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Creación validada (la usa el MCP y el formulario de Ideas)
-- ---------------------------------------------------------------------------

create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare
  p piezas%rowtype;
  h jsonb := payload->'hipotesis';
  fc uuid;
  falta text;
begin
  perform exigir_rol('owner');

  falta := case
    when nullif(payload->>'id_publico','') is null then 'id_publico'
    when nullif(payload->>'comunidad_id','') is null then 'comunidad_id'
    when nullif(payload->>'formato','') is null then 'formato'
    when nullif(payload->>'etapa_embudo','') is null then 'etapa_embudo'
    when h is null then 'hipotesis'
    when nullif(h->>'texto','') is null then 'hipotesis.texto'
    when nullif(h->>'campo','') is null then 'hipotesis.campo'
    when jsonb_typeof(h->'numero') <> 'number' then 'hipotesis.numero'
    when nullif(h->>'fecha','') is null then 'hipotesis.fecha'
    else null end;
  if falta is not null then
    raise exception 'Falta %.', falta using errcode = 'P0001';
  end if;
  if (h->>'fecha') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'hipotesis.fecha debe ser AAAA-MM-DD.' using errcode = 'P0001';
  end if;
  if (h->>'fecha')::date <= (now() at time zone 'America/Mexico_City')::date then
    raise exception 'hipotesis.fecha debe estar en el futuro.' using errcode = 'P0001';
  end if;

  -- Format Card por id o por código ('FC-08')
  if nullif(payload->>'format_card','') is not null then
    select id into fc from format_cards
     where codigo = payload->>'format_card' or id::text = payload->>'format_card';
    if fc is null then
      raise exception 'No existe la Format Card %.', payload->>'format_card' using errcode = 'P0001';
    end if;
  end if;

  insert into piezas (
    id_publico, idea_id, comunidad_id, formato, serie, format_card_id, hipotesis,
    etapa_embudo, cta, guion, spec_visual, fidelidad, fecha_objetivo, responsable_id, titulo,
    programa_aprobado, estado
  ) values (
    payload->>'id_publico',
    (payload->>'idea_id')::uuid,
    (payload->>'comunidad_id')::uuid,
    payload->>'formato',
    payload->>'serie',
    fc,
    jsonb_build_object('texto', h->>'texto', 'campo', h->>'campo', 'numero', (h->'numero'), 'fecha', h->>'fecha'),
    payload->>'etapa_embudo',
    payload->>'cta',
    payload->>'guion',
    payload->>'spec_visual',
    coalesce(payload->>'fidelidad', 'mis_palabras'),
    (payload->>'fecha_objetivo')::date,
    (payload->>'responsable_id')::uuid,
    payload->>'titulo',
    coalesce((payload->>'programa_aprobado')::boolean, false),
    coalesce(payload->>'estado', 'para_producir')
  ) returning * into p;

  if p.idea_id is not null then
    update ideas set estado = 'convertida' where id = p.idea_id and estado <> 'convertida';
  end if;

  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s)', p.id_publico, p.formato),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception
  when unique_violation then
    raise exception 'Ya existe una pieza con id_publico %.', payload->>'id_publico' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------------
-- Tareas e historias
-- ---------------------------------------------------------------------------

-- p_asignado_a acepta uuid o nombre (ilike).
create or replace function public.asignar_tarea(
  p_tipo text, p_asignado_a text, p_vence date,
  p_pieza_id uuid default null, p_historia_id uuid default null, p_checklist jsonb default '[]'
) returns tareas language plpgsql security definer set search_path = public as $$
declare
  t tareas%rowtype;
  quien uuid;
begin
  perform exigir_rol('owner');
  if p_pieza_id is null and p_historia_id is null then
    raise exception 'La tarea necesita pieza_id o historia_id.' using errcode = 'P0001';
  end if;
  if p_asignado_a ~ '^[0-9a-f-]{36}$' then
    quien := p_asignado_a::uuid;
  else
    select user_id into quien from perfiles where nombre ilike p_asignado_a || '%' limit 1;
  end if;
  if quien is null then
    raise exception 'No encuentro a %.', p_asignado_a using errcode = 'P0001';
  end if;
  insert into tareas (pieza_id, historia_id, tipo, asignado_a, vence, checklist)
  values (p_pieza_id, p_historia_id, p_tipo, quien, p_vence, coalesce(p_checklist, '[]'))
  returning * into t;
  perform registrar_corrida('asignar_tarea', 'ok', format('%s → %s vence %s', p_tipo, quien, p_vence),
    jsonb_build_object('tarea_id', t.id, 'actor', auth.uid()));
  return t;
end $$;

-- Todas las propuestas de la semana → aprobada, con tarea 'publicar' para el editor.
create or replace function public.aprobar_historias(p_semana date, p_editor uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  editor uuid := p_editor;
  h record; n int := 0;
begin
  perform exigir_rol('owner');
  if editor is null then
    select user_id into editor from perfiles where rol = 'editor' order by created_at limit 1;
  end if;
  for h in
    update historias set estado = 'aprobada'
     where semana = p_semana and estado = 'propuesta'
     returning id, dia
  loop
    insert into tareas (historia_id, tipo, asignado_a, vence)
    values (h.id, 'publicar', editor, p_semana + (h.dia - 1));
    n := n + 1;
  end loop;
  perform registrar_corrida('aprobar_historias', case when n > 0 then 'ok' else 'vacio' end,
    format('semana %s: %s historias aprobadas', p_semana, n),
    jsonb_build_object('semana', p_semana, 'actor', auth.uid()));
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Guardas de columnas para el editor (la RLS filtra filas, no columnas)
-- ---------------------------------------------------------------------------

create or replace function public.guardar_columnas_tarea()
returns trigger language plpgsql as $$
begin
  if rol_actual() = 'editor' then
    if new.pieza_id is distinct from old.pieza_id or new.historia_id is distinct from old.historia_id
       or new.tipo is distinct from old.tipo or new.asignado_a is distinct from old.asignado_a
       or new.vence is distinct from old.vence then
      raise exception 'Solo puedes cambiar estado, checklist y nota de bloqueo.' using errcode = '42501';
    end if;
    if new.estado = 'hecha' and old.estado <> 'hecha' then
      new.hecha_en := coalesce(new.hecha_en, now());
    end if;
  end if;
  return new;
end $$;
create trigger tareas_columnas_editor before update on tareas
  for each row execute function guardar_columnas_tarea();

create or replace function public.guardar_columnas_historia()
returns trigger language plpgsql as $$
begin
  if rol_actual() = 'editor' then
    if new.estado is distinct from old.estado
       and (old.estado, new.estado) not in (('aprobada','programada'), ('programada','publicada'), ('aprobada','publicada')) then
      raise exception 'Como editor solo puedes pasar aprobada → programada → publicada.' using errcode = '42501';
    end if;
    if new.copy is distinct from old.copy or new.asset_url is distinct from old.asset_url
       or new.serie is distinct from old.serie or new.dia is distinct from old.dia
       or new.semana is distinct from old.semana or new.keyword is distinct from old.keyword
       or new.pieza_amplificada_id is distinct from old.pieza_amplificada_id then
      raise exception 'Solo puedes cambiar estado, hora, publicada_en, views, replies y DMs.' using errcode = '42501';
    end if;
  end if;
  if new.estado = 'publicada' and old.estado <> 'publicada' then
    new.publicada_en := coalesce(new.publicada_en, now());
    perform registrar_corrida('historia_publicada', 'ok', format('historia %s publicada', new.id),
      jsonb_build_object('historia_id', new.id, 'actor', auth.uid()));
  end if;
  if (new.views, new.replies, new.dms) is distinct from (old.views, old.replies, old.dms) then
    new.metricas_por := auth.uid();
    new.metricas_en := now();
  end if;
  return new;
end $$;
create trigger historias_columnas_editor before update on historias
  for each row execute function guardar_columnas_historia();
