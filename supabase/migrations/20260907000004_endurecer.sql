-- 004 · Endurecimiento tras el linter de Supabase (2026-09-07).
-- 1) search_path fijo en todas las funciones (lint 0011).
-- 2) Nada se ejecuta como anon; solo authenticated y solo lo que la app llama (lints 0028/0029).
-- 3) Los triggers que escriben corridas son security definer para poder revocar registrar_corrida.

alter function public.tocar_updated_at()                 set search_path = public;
alter function public.hipotesis_valida(jsonb)            set search_path = public;
alter function public.validar_tope_produccion()          set search_path = public;
alter function public.exigir_rol(text[])                 set search_path = public;
alter function public.views_recientes(uuid)              set search_path = public;
alter function public.multiplicador(uuid, int)           set search_path = public;
alter function public.transicion_permitida(text, text, text) set search_path = public;
alter function public.guardar_columnas_tarea()           set search_path = public;
alter function public.guardar_columnas_historia()        set search_path = public;

alter function public.guardar_columnas_tarea()    security definer;
alter function public.guardar_columnas_historia() security definer;

-- Las funciones nuevas nacen sin EXECUTE para nadie; se otorga a mano.
alter default privileges in schema public revoke execute on functions from public;

revoke execute on all functions in schema public from public, anon, authenticated;

-- Lo que la app y el MCP llaman como usuario autenticado (cada una valida rol adentro).
grant execute on function
  public.rol_actual(),
  public.hipotesis_valida(jsonb),
  public.transicion_permitida(text, text, text),
  public.views_recientes(uuid),
  public.multiplicador(uuid, int),
  public.latidos(),
  public.cambiar_estado_pieza(uuid, text),
  public.marcar_publicada(uuid, text, text),
  public.crear_pieza_validada(jsonb),
  public.asignar_tarea(text, text, date, uuid, uuid, jsonb),
  public.aprobar_historias(date, uuid)
to authenticated;

-- Solo service_role (jobs, pg_cron, servidor MCP):
--   registrar_corrida, recalcular_multiplicadores, perfil_por_api_key.
-- Solo triggers: crear_perfil_desde_auth, tocar_updated_at, validar_tope_produccion,
--   guardar_columnas_tarea, guardar_columnas_historia.
grant execute on function
  public.registrar_corrida(text, text, text, jsonb),
  public.recalcular_multiplicadores(),
  public.perfil_por_api_key(text)
to service_role;
