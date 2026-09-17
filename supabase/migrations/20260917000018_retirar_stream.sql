-- 018 · Se retira el stream de redacción (docs/decisiones.md 2026-09-17)
-- La entrevista y la redacción viven en Claude Cowork como skill; el resultado entra con guardar_contenido.
-- La tabla queda como respaldo con sus 11 filas; se borra al cerrar 1.0 junto con los demás respaldos.
alter table public.pensamientos rename to respaldo_20260917_pensamientos;
