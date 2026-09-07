-- 010 · Radar de outliers (v2). NO APLICAR EN v1.
-- OJO: la tabla hooks ya existe desde 007 (versión ligera). Al promover, alter table hooks add column ... en vez de create.
-- Vive fuera de supabase/migrations/ a propósito para que `db push` no lo tome.
-- Cuando se promueva: mover a migrations/ con timestamp nuevo, añadir RLS (owner todo,
-- editor sin acceso) y la FK ideas.video_origen_id → videos_referencia.
-- Fuente: handoff §9.

create table cuentas_referencia (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades,
  handle text not null,
  plataforma text not null check (plataforma in ('instagram','tiktok','youtube')),
  format_card_sugerida uuid references format_cards,
  activa boolean default true,
  ultimo_scrape timestamptz,
  unique (handle, plataforma)
);

create table videos_referencia (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid references cuentas_referencia,
  shortcode text unique not null,
  url text, caption text, thumbnail_url text,
  views int, likes int, comentarios int, publicado_en timestamptz, duracion_s int,
  fuente text, capturado_en timestamptz default now(),
  outlier numeric,      -- views / mediana(12 anteriores del canal), lo escribe el job
  engagement numeric generated always as (
    case when views > 0 then (coalesce(likes,0) + coalesce(comentarios,0))::numeric / views end
  ) stored,
  analizado boolean default false,
  candidato boolean default false
);

create table analisis_video (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos_referencia,
  pieza_id uuid references piezas,
  transcript text, tema text, angulo text, creencia_comun text, realidad_contraria text,
  hook_texto text, hook_madlib text,
  hook_categoria text check (hook_categoria in (
    'list','secret_reveal','authority','tutorial','case_study','scenario','comparison',
    'ranking','problem','question','personal_experience','trap_mistake')),
  formato text, layout_visual text, beats jsonb, por_que_funciona text, como_personalizar text,
  format_card_id uuid references format_cards,
  autor text,
  created_at timestamptz default now()
);

create table hooks (
  id uuid primary key default gen_random_uuid(),
  texto text not null, madlib text, categoria text,
  video_origen_id uuid references videos_referencia,
  outlier_origen numeric,
  favorito boolean default false
);

create table reglas_radar (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades,
  cuenta_id uuid references cuentas_referencia,
  outlier_min numeric default 3,
  views_min int default 0,
  engagement_min numeric default 0.02,
  tope_diario int default 3,
  activa boolean default true
);

alter table ideas add constraint ideas_video_origen_fk
  foreign key (video_origen_id) references videos_referencia;

-- Job radar_scrape (n8n, diario): por cuenta activa → últimos 30 posts → upsert →
-- recalcular outlier → aplicar reglas_radar → candidato=true hasta tope_diario.
-- El análisis lo escribe un skill vía la tool escribir_analisis; al escribirlo se crea idea(origen='radar').
