-- 020 · La máquina (docs/decisiones.md 2026-09-24 · Automatizaciones)
-- Los jobs corren en la app (Vercel Cron) y en pg_cron; nada en n8n. Los rituales de Nazho no son jobs:
-- son sistemas humanos cuya evidencia son las corridas de las tools que usa. espejo_md se apaga.

create extension if not exists pg_cron;
select cron.schedule('recalcular_multiplicadores', '0 9 * * *', $$select public.recalcular_multiplicadores()$$);

alter table public.sistemas_registrados add column if not exists fuentes text[];
alter table public.sistemas_registrados add column if not exists dueno text;

update sistemas_registrados set dueno = 'app · cron 06:00', descripcion = 'piezas publicadas con liga (60 d) → Apify → metricas(apify) → recalcular multiplicadores' where nombre = 'post_scraper_grilla';
update sistemas_registrados set dueno = 'app · cron 05:00', descripcion = 'perfil @nazho por Apify → indicadores_semana.seguidores con fecha de corte' where nombre = 'snapshot_seguidores';
update sistemas_registrados set dueno = 'app · cron 07:00', descripcion = 'Kit growth_stats → indicadores_semana.suscriptores con fecha de corte' where nombre = 'kit_suscriptores';
update sistemas_registrados set dueno = 'app · cron 07:10', descripcion = 'Supabase Folklore Leads (marca nazho) → recursos.leads e indicadores_semana.leads' where nombre = 'go_leads';
update sistemas_registrados set dueno = 'pg_cron 03:00', descripcion = 'mediana propia y multiplicador por pieza publicada' where nombre = 'recalcular_multiplicadores';
update sistemas_registrados set dueno = 'Nazho desde Cowork', descripcion = 'ritual: proponer la semana (piezas con fecha, historias). Cuenta proponer_historias, agendar_historia o crear_pieza', fuentes = array['proponer_historias', 'agendar_historia', 'crear_pieza'] where nombre = 'sprint_lunes';
update sistemas_registrados set dueno = 'Nazho desde Cowork', descripcion = 'ritual: resolver hipótesis, anotar métricas, declarar huecos. Cuenta resolver_hipotesis, registrar_metrica_manual o declarar_hueco', fuentes = array['resolver_hipotesis', 'registrar_metrica_manual', 'declarar_hueco'] where nombre = 'review_viernes';
update sistemas_registrados set activo = false, descripcion = 'apagado el 24-sep: nadie lo necesita todavía' where nombre = 'espejo_md';

-- latidos(): un sistema puede tener varias fuentes de corrida (los rituales); devuelve dueño y descripción para la pantalla.
drop function if exists public.latidos();
create function public.latidos()
returns table (sistema text, dueno text, descripcion text, esperado_cada interval, ultima_corrida timestamptz, ultimo_estado text, ultimo_resumen text, atrasado boolean)
language sql stable security definer set search_path = public as $$
  select s.nombre, s.dueno, s.descripcion, s.esperado_cada, c.inicio, c.estado, c.resumen,
         coalesce(c.inicio, '-infinity'::timestamptz) < now() - s.esperado_cada as atrasado
  from sistemas_registrados s
  left join lateral (
    select inicio, estado, resumen from corridas
    where corridas.sistema = any (coalesce(s.fuentes, array[s.nombre])) and coalesce(corridas.estado, 'ok') <> 'error'
    order by inicio desc limit 1
  ) c on true
  where s.activo
  order by atrasado desc, s.nombre;
$$;
grant execute on function latidos() to authenticated;

-- Los grafos del Nodo dicen quién dispara cada cosa hoy: la app, pg_cron o Nazho desde Cowork. Ya no n8n ni tareas de nube.
update sistemas set nodos = replace(replace(replace(replace(replace(replace(replace(replace(nodos::text,
  '"dueno": "n8n (hoy tarea de nube trig_014…)"', '"dueno": "app (cron)"'),
  '"dueno": "n8n"', '"dueno": "app (cron)"'),
  '"dueno": "Milo"', '"dueno": "Claude desde Cowork"'),
  '"disparador": "Tarea de nube dom 20:00 → MCP crear_pieza"', '"disparador": "Nazho desde Cowork, domingo o lunes → MCP crear_pieza"'),
  '"disparador": "Dom 20:00 → MCP proponer_historias"', '"disparador": "Nazho desde Cowork → MCP proponer_historias"'),
  '"disparador": "Tarea de nube vie 14:00 → MCP leer_metricas"', '"disparador": "Nazho desde Cowork el viernes → MCP leer_metricas"'),
  '"sistema": "sprint_lunes"', '"sistema": "proponer_historias"'),
  '"sistema": "review_viernes"', '"sistema": "resolver_hipotesis"')::jsonb,
  version = version + 1
where activo;
