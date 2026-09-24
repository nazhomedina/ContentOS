-- Cierre de 1.0: los respaldos de la limpieza del 15 de septiembre y del stream retirado ya no hacen falta.
-- Nazho lo confirmó el 2026-09-24.
drop table if exists public.respaldo_20260915_piezas;
drop table if exists public.respaldo_20260915_tareas;
drop table if exists public.respaldo_20260915_guion_versiones;
drop table if exists public.respaldo_20260917_pensamientos;
