-- Las corridas se abren al empezar con estado 'corriendo' y se cierran con ok/vacio/error.
-- La restricción original no contemplaba el estado intermedio y el primer «Correr ahora» falló.
alter table public.corridas drop constraint if exists corridas_estado_check;
alter table public.corridas add constraint corridas_estado_check
  check (estado in ('corriendo', 'ok', 'vacio', 'error'));
