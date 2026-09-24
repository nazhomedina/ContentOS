-- 021 · recalcular_multiplicadores nunca había corrido: la variable «m» tapaba el alias de la tabla en su propio select.
create or replace function public.recalcular_multiplicadores()
returns integer language plpgsql security definer set search_path = public as $$
declare
  fila record; calc record; total int := 0;
begin
  for fila in
    select distinct on (mt.pieza_id) mt.id, mt.pieza_id
    from metricas mt join piezas p on p.id = mt.pieza_id
    where p.estado = 'publicada' and mt.views is not null and mt.fuente <> 'pendiente'
    order by mt.pieza_id, mt.fecha desc, mt.created_at desc
  loop
    select * into calc from multiplicador(fila.pieza_id);
    update metricas set multiplicador = calc.multiplicador, n_mediana = calc.n where id = fila.id;
    total := total + 1;
  end loop;
  perform registrar_corrida('recalcular_multiplicadores', case when total > 0 then 'ok' else 'vacio' end,
    format('%s piezas recalculadas', total));
  return total;
end $$;
