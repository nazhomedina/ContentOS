-- 001 · Núcleo de ContentOS
-- Fuente: diseño 2026-09-06 §4 + ajustes del handoff §2 + hallazgos 1–6 de PLAN.md.
-- Jerarquía: comunidad → idea → pieza → tarea. Al lado: historias, recursos,
-- metricas, format_cards, corridas, indicadores_semana, comentarios, sistemas_registrados.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Regla de resolubilidad: una hipótesis existe si nombra campo, número y fecha.
-- Las piezas heredadas de Notion sin hipótesis llevan {"legado": true}.
create or replace function public.hipotesis_valida(h jsonb)
returns boolean language sql immutable as $$
  select
    coalesce((h->>'legado')::boolean, false)
    or (
      jsonb_typeof(h->'campo') = 'string'
      and jsonb_typeof(h->'numero') = 'number'
      and jsonb_typeof(h->'fecha') = 'string'
      and (h->>'fecha') ~ '^\d{4}-\d{2}-\d{2}$'
    );
$$;

-- ---------------------------------------------------------------------------
-- Raíz
-- ---------------------------------------------------------------------------

create table public.comunidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  icp text, dolor text, promesa text,
  tono_default text check (tono_default in ('intimo','editorial','estrategico')),
  canales text[] not null default '{}',
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.perfiles (
  user_id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  email text unique,
  rol text not null check (rol in ('owner','editor','viewer')),
  comunidades uuid[] not null default '{}',
  api_key_hash text unique,              -- sha256(key || pepper), para el MCP
  created_at timestamptz not null default now()
);

-- Lista blanca de acceso: el magic link solo crea perfil a quien esté aquí.
create table public.perfiles_permitidos (
  email text primary key,
  nombre text not null,
  rol text not null check (rol in ('owner','editor','viewer')),
  comunidades uuid[] not null default '{}'
);

create or replace function public.crear_perfil_desde_auth()
returns trigger language plpgsql security definer set search_path = public as $$
declare p perfiles_permitidos%rowtype;
begin
  select * into p from perfiles_permitidos where lower(email) = lower(new.email);
  if not found then
    raise exception 'Este correo no tiene acceso a ContentOS: %', new.email
      using errcode = 'P0001';
  end if;
  insert into perfiles (user_id, nombre, email, rol, comunidades)
  values (new.id, p.nombre, lower(new.email), p.rol, p.comunidades);
  return new;
end $$;

create trigger perfil_al_registrar
  after insert on auth.users
  for each row execute function public.crear_perfil_desde_auth();

-- ---------------------------------------------------------------------------
-- Ideas y pensamientos
-- ---------------------------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades,
  titulo text not null,
  origen text check (origen in ('radar','voz','destilado','markie','coyuntura','audiencia','claude')),
  video_origen_id uuid,                  -- fk a videos_referencia en 010_radar
  estado text not null default 'nueva' check (estado in ('nueva','shortlist','convertida','descartada')),
  etapa_embudo text check (etapa_embudo in ('atraer','capturar','convertir')),
  notas text,
  creado_por uuid references perfiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_comunidad_estado on ideas (comunidad_id, estado);
create trigger ideas_updated before update on ideas
  for each row execute function tocar_updated_at();

create table public.pensamientos (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas on delete cascade,
  tipo text not null check (tipo in ('voz','texto','link','pregunta','respuesta')),
  audio_url text, transcript_crudo text, transcript_pulido text, texto text,
  responde_a uuid references pensamientos,
  autor uuid references perfiles,
  created_at timestamptz not null default now()
);
create index pensamientos_idea on pensamientos (idea_id, created_at);

-- ---------------------------------------------------------------------------
-- Formatos
-- ---------------------------------------------------------------------------

create table public.format_cards (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null check (codigo ~ '^FC-\d{2}$'),
  nombre text not null,
  estado text not null check (estado in ('detectado','experimentando','validado_propio','firma','retirado')),
  origen text,
  molde text,
  notas text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Piezas
-- ---------------------------------------------------------------------------

create table public.piezas (
  id uuid primary key default gen_random_uuid(),
  -- PREFIJO-## · sufijo opcional: 'b' por renumeración del import, '-A'..'-E' por frentes
  id_publico text unique not null check (id_publico ~ '^[A-Z]{2,5}-\d{2,3}([a-z]|-[A-E])?$'),
  idea_id uuid references ideas,
  comunidad_id uuid not null references comunidades,
  formato text not null check (formato in ('reel','yap','carrusel','historia','x','canal_ig','newsletter','articulo','youtube')),
  serie text,
  format_card_id uuid references format_cards,
  hipotesis jsonb not null,              -- {texto, campo, numero, fecha} | {legado: true, ...}
  etapa_embudo text not null check (etapa_embudo in ('atraer','capturar','convertir')),
  etapa_legado boolean not null default false,
  requiere_hipotesis boolean not null default false,
  programa_aprobado boolean not null default false,
  cta text,
  guion text, spec_visual text,
  fidelidad text not null default 'mis_palabras' check (fidelidad in ('mis_palabras','reescribe')),
  estado text not null default 'para_producir' check (estado in
    ('para_producir','para_grabar','edicion','buffer','programada','publicada','archivada','en_trial')),
  responsable_id uuid references perfiles,
  fecha_objetivo date, publicada_en timestamptz, url text, plataforma text,
  titulo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hipotesis_resoluble check (hipotesis_valida(hipotesis)),
  constraint publicada_con_url check (estado <> 'publicada' or url is not null)
);
create index piezas_estado on piezas (estado);
create index piezas_comunidad on piezas (comunidad_id);
create index piezas_responsable on piezas (responsable_id);
create index piezas_formato_publicada on piezas (formato, publicada_en desc) where estado = 'publicada';
create trigger piezas_updated before update on piezas
  for each row execute function tocar_updated_at();

-- Regla del tope: para_producir + para_grabar ≤ 10 fuera de programas aprobados.
-- El import de Notion lo salta con set_config('app.import','on',true); el
-- excedente heredado queda visible y no deja entrar más hasta bajar.
create or replace function public.validar_tope_produccion()
returns trigger language plpgsql as $$
declare
  en_tope constant text[] := array['para_producir','para_grabar'];
  entra boolean;
  n int;
begin
  if current_setting('app.import', true) = 'on' then
    return new;
  end if;
  if new.programa_aprobado or not (new.estado = any (en_tope)) then
    return new;
  end if;
  entra := tg_op = 'INSERT'
        or not (old.estado = any (en_tope))
        or old.programa_aprobado;
  if not entra then
    return new;
  end if;
  select count(*) into n from piezas
   where estado = any (en_tope) and not programa_aprobado and id <> new.id;
  if n >= 10 then
    raise exception 'Tope de producción: ya hay % piezas en para_producir/para_grabar. Regresa una al banco antes de meter otra.', n
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger piezas_tope before insert or update of estado, programa_aprobado on piezas
  for each row execute function validar_tope_produccion();

-- ---------------------------------------------------------------------------
-- Recursos e historias
-- ---------------------------------------------------------------------------

create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades,
  nombre text not null, slug_go text unique, keyword text, kit_tag_id text,
  estado text not null default 'idea' check (estado in ('idea','produccion','publicado','contado')),
  leads int,                             -- lo escribe el job go_leads
  leads_actualizado_en timestamptz,
  created_at timestamptz not null default now()
);

create table public.historias (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades,
  semana date not null,                  -- lunes de la semana
  dia smallint not null check (dia between 1 and 7),
  orden smallint not null default 1,
  serie text not null check (serie in ('te_lo_resumo','archivo_folklore','criterio_viernes','amplificacion','espontanea')),
  registro text not null check (registro in ('organico','producido')),
  copy text, asset_url text,
  pieza_amplificada_id uuid references piezas,
  recurso_id uuid references recursos,
  keyword text,
  estado text not null default 'propuesta' check (estado in ('propuesta','aprobada','programada','publicada','descartada')),
  programada_para timestamptz,
  publicada_en timestamptz, views int, replies int, dms int,
  metricas_por uuid references perfiles, metricas_en timestamptz,
  created_at timestamptz not null default now(),
  constraint semana_es_lunes check (extract(isodow from semana) = 1)
);
create index historias_semana on historias (semana, dia, orden);

-- ---------------------------------------------------------------------------
-- Tareas (la cola)
-- ---------------------------------------------------------------------------

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid references piezas on delete cascade,
  historia_id uuid references historias on delete cascade,
  tipo text not null check (tipo in ('grabar','editar','diseñar','publicar','capturar_metricas','revisar')),
  asignado_a uuid references perfiles,
  vence date,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','bloqueada','hecha')),
  checklist jsonb not null default '[]',
  nota_bloqueo text,
  created_at timestamptz not null default now(),
  hecha_en timestamptz,
  constraint tarea_con_objeto check (pieza_id is not null or historia_id is not null),
  constraint bloqueada_con_nota check (estado <> 'bloqueada' or nullif(trim(nota_bloqueo), '') is not null)
);
create index tareas_asignado_estado on tareas (asignado_a, estado, vence);
create index tareas_pieza on tareas (pieza_id);

-- ---------------------------------------------------------------------------
-- Métricas, latidos, indicadores, comentarios
-- ---------------------------------------------------------------------------

create table public.metricas (
  id bigint generated always as identity primary key,
  pieza_id uuid not null references piezas on delete cascade,
  fecha date not null,
  views int, likes int, comentarios int, saves int, follows int,
  fuente text not null check (fuente in ('apify','tikhub','manual','yt_analytics','kit','pendiente','notion')),
  multiplicador numeric,                 -- lo escribe recalcular_multiplicadores()
  n_mediana int,                         -- cuántas piezas entraron a la mediana
  capturado_por uuid references perfiles,
  created_at timestamptz not null default now(),
  unique (pieza_id, fecha, fuente)
);
create index metricas_pieza_fecha on metricas (pieza_id, fecha desc);

create table public.corridas (
  id bigint generated always as identity primary key,
  sistema text not null,
  inicio timestamptz not null default now(), fin timestamptz,
  estado text check (estado in ('ok','vacio','error')),
  resumen text, payload jsonb
);
create index corridas_sistema_inicio on corridas (sistema, inicio desc);

create table public.sistemas_registrados (
  nombre text primary key,
  esperado_cada interval not null,
  descripcion text,
  activo boolean not null default true
);

create table public.indicadores_semana (
  semana date primary key check (extract(isodow from semana) = 1),
  seguidores int, seguidores_corte date,
  suscriptores int, suscriptores_corte date,
  leads int, leads_corte date,
  horas_largo numeric,                   -- vacío hasta que exista sensor de YouTube
  piezas_publicadas int, buffer int,
  huecos jsonb not null default '[]',
  actualizado_en timestamptz not null default now()
);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references piezas on delete cascade,
  autor uuid not null references perfiles,
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);
create index comentarios_pieza on comentarios (pieza_id, created_at);
