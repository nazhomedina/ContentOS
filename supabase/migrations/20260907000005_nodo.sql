-- 005 · El Nodo (docs/nodo.md). Sistemas como grafos de nodos tipados con evidencia,
-- cuota semanal, campañas de pauta y huecos declarados.

create table public.sistemas (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null check (clave ~ '^[a-z][a-z0-9_]+$'),
  nombre text not null,
  proposito text,
  cadencia interval not null default interval '7 days',
  -- [{clave, nombre, tipo: ia|humano|automatizacion|plataforma, dueno, disparador,
  --   estado_base: agendado|sin_sistema, evidencia: {fuente, ...filtro}, nota}]
  nodos jsonb not null default '[]',
  -- [{de, a, etiqueta?}]
  aristas jsonb not null default '[]',
  orden int not null default 100,
  activo boolean not null default true,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create trigger sistemas_updated before update on sistemas for each row execute function tocar_updated_at();

create table public.metas_semana (
  formato text primary key check (formato in ('newsletter','reel','carrusel','historia_dia','articulo','youtube','x')),
  cantidad int not null check (cantidad >= 0),
  desde date not null default current_date
);

create table public.campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  objetivo text not null check (objetivo in ('frio','calido','conversion')),
  recurso_id uuid references recursos,
  pieza_id uuid references piezas,
  meta_campaign_id text,
  presupuesto_semanal numeric,
  activa boolean not null default true,
  inicio date, fin date,
  created_at timestamptz not null default now()
);

create table public.huecos (
  id uuid primary key default gen_random_uuid(),
  semana date not null check (extract(isodow from semana) = 1),
  sistema_clave text not null references sistemas(clave) on delete cascade,
  nodo_clave text not null,
  nota text not null check (length(trim(nota)) > 0),
  declarado_por uuid references perfiles,
  created_at timestamptz not null default now(),
  unique (semana, sistema_clave, nodo_clave)
);

-- ---------------------------------------------------------------------------
-- Evidencia por nodo. Devuelve (n, cuando, detalle) para una fuente y filtro en la semana.
-- ---------------------------------------------------------------------------
create or replace function public.evidencia_nodo(ev jsonb, p_semana date)
returns table (n int, cuando timestamptz, detalle text)
language plpgsql stable security definer set search_path = public as $$
declare
  fuente text := coalesce(ev->>'fuente', 'ninguna');
  desde timestamptz := p_semana::timestamptz;
  hasta timestamptz := (p_semana + 7)::timestamptz;
  formatos text[] := case when ev ? 'formato' then array(select jsonb_array_elements_text(ev->'formato')) end;
  tipos text[] := case when ev ? 'tipo' then array(select jsonb_array_elements_text(ev->'tipo')) end;
begin
  if fuente = 'corridas' then
    return query
      select count(*)::int, max(c.inicio), format('%s corridas de %s', count(*), ev->>'sistema')
      from corridas c where c.sistema = ev->>'sistema' and c.inicio >= desde and c.inicio < hasta
        and coalesce(c.estado, 'ok') <> 'error';
  elsif fuente = 'tareas' then
    return query
      select count(*)::int, max(t.hecha_en), format('%s tareas hechas (%s)', count(*), array_to_string(tipos, ', '))
      from tareas t where t.estado = 'hecha' and t.hecha_en >= desde and t.hecha_en < hasta
        and (tipos is null or t.tipo = any (tipos));
  elsif fuente = 'piezas' then
    if coalesce(ev->>'modo', 'publicadas') = 'objetivo' then
      return query
        select count(*)::int, max(p.updated_at), format('%s piezas con fecha objetivo esta semana', count(*))
        from piezas p where p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7
          and p.estado not in ('archivada') and (formatos is null or p.formato = any (formatos));
    else
      return query
        select count(*)::int, max(p.publicada_en), format('%s publicadas (%s)', count(*), coalesce(array_to_string(formatos, ', '), 'todo'))
        from piezas p where p.estado = 'publicada' and p.publicada_en >= desde and p.publicada_en < hasta
          and (formatos is null or p.formato = any (formatos));
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

-- ---------------------------------------------------------------------------
-- Estado de cada nodo de un sistema en una semana.
--   corrio · hueco · agendado · sin_sistema
-- ---------------------------------------------------------------------------
create or replace function public.estado_nodos(p_clave text, p_semana date)
returns table (
  nodo_clave text, nombre text, tipo text, dueno text, disparador text, nota text,
  estado text, n int, cuando timestamptz, detalle text, hueco_nota text
) language plpgsql stable security definer set search_path = public as $$
declare
  s sistemas%rowtype;
  nd jsonb;
  e record;
  h text;
begin
  perform exigir_rol('owner', 'viewer');
  select * into s from sistemas where clave = p_clave;
  if not found then return; end if;
  for nd in select * from jsonb_array_elements(s.nodos) loop
    select * into e from evidencia_nodo(coalesce(nd->'evidencia', '{}'::jsonb), p_semana);
    select hu.nota into h from huecos hu where hu.semana = p_semana and hu.sistema_clave = p_clave and hu.nodo_clave = nd->>'clave';
    nodo_clave := nd->>'clave'; nombre := nd->>'nombre'; tipo := nd->>'tipo';
    dueno := nd->>'dueno'; disparador := nd->>'disparador'; nota := nd->>'nota';
    n := coalesce(e.n, 0); cuando := e.cuando; detalle := e.detalle; hueco_nota := h;
    estado := case
      when coalesce(e.n, 0) > 0 then 'corrio'
      when h is not null then 'hueco'
      when coalesce(nd->>'estado_base', 'agendado') = 'sin_sistema' then 'sin_sistema'
      else 'agendado' end;
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Cuota de la semana contra realidad
-- ---------------------------------------------------------------------------
create or replace function public.cuota_semana(p_semana date)
returns table (formato text, meta int, publicadas int, en_camino int, piezas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare
  m record;
  fmts text[];
begin
  perform exigir_rol('owner', 'viewer');
  for m in select * from metas_semana order by formato loop
    formato := m.formato; meta := m.cantidad;
    if m.formato = 'historia_dia' then
      select count(distinct (h.publicada_en at time zone 'America/Mexico_City')::date) into publicadas
        from historias h where h.estado = 'publicada' and h.semana = p_semana;
      select count(distinct h.dia) into en_camino
        from historias h where h.semana = p_semana and h.estado in ('aprobada','programada');
      select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'dia', h.dia, 'serie', h.serie, 'estado', h.estado) order by h.dia, h.orden), '[]')
        into piezas from historias h where h.semana = p_semana and h.estado <> 'descartada';
    else
      fmts := case when m.formato = 'reel' then array['reel','yap'] else array[m.formato] end;
      select count(*) into publicadas from piezas p
        where p.estado = 'publicada' and p.formato = any (fmts)
          and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz;
      select count(*) into en_camino from piezas p
        where p.formato = any (fmts) and p.estado not in ('publicada','archivada','en_trial')
          and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7;
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'id_publico', p.id_publico, 'titulo', p.titulo, 'estado', p.estado,
               'fecha_objetivo', p.fecha_objetivo, 'responsable', pf.nombre) order by p.fecha_objetivo nulls last, p.id_publico), '[]')
        into piezas
        from piezas p left join perfiles pf on pf.user_id = p.responsable_id
        where p.formato = any (fmts) and p.estado <> 'archivada' and (
          (p.estado = 'publicada' and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz)
          or (p.estado <> 'publicada' and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7));
    end if;
    return next;
  end loop;
end $$;

create or replace function public.declarar_hueco(p_semana date, p_sistema text, p_nodo text, p_nota text)
returns huecos language plpgsql security definer set search_path = public as $$
declare h huecos%rowtype;
begin
  perform exigir_rol('owner');
  insert into huecos (semana, sistema_clave, nodo_clave, nota, declarado_por)
  values (p_semana, p_sistema, p_nodo, p_nota, auth.uid())
  on conflict (semana, sistema_clave, nodo_clave) do update set nota = excluded.nota, declarado_por = excluded.declarado_por
  returning * into h;
  perform registrar_corrida('declarar_hueco', 'ok', format('%s/%s semana %s: %s', p_sistema, p_nodo, p_semana, p_nota),
    jsonb_build_object('actor', auth.uid()));
  return h;
end $$;

-- Para el MCP (definir_sistema): upsert por clave, sube la versión.
create or replace function public.definir_sistema(payload jsonb)
returns sistemas language plpgsql security definer set search_path = public as $$
declare s sistemas%rowtype; nd jsonb;
begin
  perform exigir_rol('owner');
  if nullif(payload->>'clave', '') is null or nullif(payload->>'nombre', '') is null then
    raise exception 'Falta clave o nombre.' using errcode = 'P0001';
  end if;
  for nd in select * from jsonb_array_elements(coalesce(payload->'nodos', '[]'::jsonb)) loop
    if nullif(nd->>'clave','') is null or nullif(nd->>'nombre','') is null
       or coalesce(nd->>'tipo','') not in ('ia','humano','automatizacion','plataforma') then
      raise exception 'Nodo inválido: cada nodo necesita clave, nombre y tipo (ia|humano|automatizacion|plataforma).' using errcode = 'P0001';
    end if;
  end loop;
  insert into sistemas (clave, nombre, proposito, cadencia, nodos, aristas, orden, activo)
  values (payload->>'clave', payload->>'nombre', payload->>'proposito',
          coalesce((payload->>'cadencia')::interval, interval '7 days'),
          coalesce(payload->'nodos', '[]'::jsonb), coalesce(payload->'aristas', '[]'::jsonb),
          coalesce((payload->>'orden')::int, 100), coalesce((payload->>'activo')::boolean, true))
  on conflict (clave) do update set
    nombre = excluded.nombre, proposito = coalesce(excluded.proposito, sistemas.proposito), cadencia = excluded.cadencia,
    nodos = excluded.nodos, aristas = excluded.aristas, orden = excluded.orden, activo = excluded.activo,
    version = sistemas.version + 1
  returning * into s;
  perform registrar_corrida('definir_sistema', 'ok', format('%s v%s (%s nodos)', s.clave, s.version, jsonb_array_length(s.nodos)),
    jsonb_build_object('actor', auth.uid()));
  return s;
end $$;

-- ---------------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------------
alter table sistemas     enable row level security;
alter table metas_semana enable row level security;
alter table campanas     enable row level security;
alter table huecos       enable row level security;

create policy owner_todo on sistemas     for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy owner_todo on metas_semana for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy owner_todo on campanas     for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy owner_todo on huecos       for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy viewer_leer on sistemas     for select to authenticated using (rol_actual() = 'viewer');
create policy viewer_leer on metas_semana for select to authenticated using (rol_actual() = 'viewer');
create policy viewer_leer on huecos       for select to authenticated using (rol_actual() = 'viewer');

revoke execute on function evidencia_nodo(jsonb, date) from public, anon, authenticated;
grant execute on function estado_nodos(text, date), cuota_semana(date), declarar_hueco(date, text, text, text), definir_sistema(jsonb) to authenticated;
