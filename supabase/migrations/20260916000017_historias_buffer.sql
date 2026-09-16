-- 017 · Historias: buffer sin fecha y «tipo» en vez de «serie» (docs/decisiones.md 2026-09-16 · Historias)
-- Una historia puede vivir sin semana ni día (buffer) mientras esté en propuesta; agendarla la pone en un día
-- y la aprueba. La serie (te_lo_resumo, archivo_folklore…) no decía qué busca la historia: ahora es tipo.

alter table public.historias alter column semana drop not null;
alter table public.historias alter column dia drop not null;
alter table public.historias add constraint historias_fecha_completa check ((semana is null) = (dia is null));
alter table public.historias add constraint historias_fecha_si_aprobada check (estado in ('propuesta', 'descartada') or semana is not null);

alter table public.historias rename column serie to tipo;
alter table public.historias drop constraint if exists historias_serie_check;
update historias set tipo = case tipo
  when 'te_lo_resumo' then 'lead_magnet' when 'archivo_folklore' then 'archivo'
  when 'criterio_viernes' then 'amplificacion' when 'espontanea' then 'frase' else tipo end;
alter table public.historias add constraint historias_tipo_check
  check (tipo in ('lead_magnet', 'amplificacion', 'frase', 'pregunta', 'archivo'));

-- El trigger del editor, con la columna renombrada.
create or replace function public.guardar_columnas_historia()
returns trigger language plpgsql as $$
begin
  if rol_actual() = 'editor' then
    if new.estado is distinct from old.estado
       and (old.estado, new.estado) not in (('aprobada','programada'), ('programada','publicada'), ('aprobada','publicada')) then
      raise exception 'Como editor solo puedes pasar aprobada → programada → publicada.' using errcode = '42501';
    end if;
    if new.copy is distinct from old.copy
       or new.tipo is distinct from old.tipo or new.dia is distinct from old.dia
       or new.semana is distinct from old.semana or new.keyword is distinct from old.keyword
       or new.pieza_amplificada_id is distinct from old.pieza_amplificada_id then
      raise exception 'Solo puedes cambiar estado, hora, asset, publicada_en, views, replies y DMs.' using errcode = '42501';
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

-- cuota_semana con «tipo» en el detalle de historias.
create or replace function public.cuota_semana(p_semana date)
returns table (tipo text, meta int, publicadas int, en_camino int, piezas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare m record; tps text[];
begin
  perform exigir_rol('owner', 'viewer');
  for m in select * from metas_semana order by metas_semana.tipo loop
    tipo := m.tipo; meta := m.cantidad;
    if m.tipo = 'historia_dia' then
      select count(distinct (h.publicada_en at time zone 'America/Mexico_City')::date) into publicadas
        from historias h where h.estado = 'publicada' and h.semana = p_semana;
      select count(distinct h.dia) into en_camino from historias h where h.semana = p_semana and h.estado in ('aprobada','programada');
      select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'dia', h.dia, 'tipo', h.tipo, 'estado', h.estado) order by h.dia, h.orden), '[]')
        into piezas from historias h where h.semana = p_semana and h.estado <> 'descartada';
    else
      tps := case when m.tipo = 'reel' then array['reel','yap'] else array[m.tipo] end;
      select count(*) into publicadas from piezas p
        where p.estado = 'publicada' and p.tipo = any (tps)
          and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz;
      select count(*) into en_camino from piezas p
        where p.tipo = any (tps) and p.estado not in ('publicada','archivada','en_trial','borrador')
          and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7;
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'id_publico', p.id_publico, 'titulo', p.titulo, 'estado', p.estado,
               'fecha_objetivo', p.fecha_objetivo, 'responsable', pf.nombre) order by p.fecha_objetivo nulls last, p.id_publico), '[]')
        into piezas
        from piezas p left join perfiles pf on pf.user_id = p.responsable_id
        where p.tipo = any (tps) and p.estado not in ('archivada','borrador') and (
          (p.estado = 'publicada' and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz)
          or (p.estado <> 'publicada' and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7));
    end if;
    return next;
  end loop;
end $$;

-- Agendar: del buffer (o de otro día) a un día. Si estaba en propuesta, queda aprobada con su tarea «publicar».
create or replace function public.agendar_historia(p_id uuid, p_semana date, p_dia int, p_editor uuid default null)
returns historias language plpgsql security definer set search_path = public as $$
declare h historias%rowtype; editor uuid := p_editor; n int; lunes date;
begin
  perform exigir_rol('owner');
  if p_dia is null or p_dia < 1 or p_dia > 7 then raise exception 'El día va de lunes (1) a domingo (7).' using errcode = 'P0001'; end if;
  lunes := p_semana - (extract(isodow from p_semana)::int - 1);
  select coalesce(max(orden), 0) + 1 into n from historias where semana = lunes and dia = p_dia;
  update historias set semana = lunes, dia = p_dia, orden = n,
    estado = case when estado = 'propuesta' then 'aprobada' else estado end
  where id = p_id and estado <> 'descartada' returning * into h;
  if h.id is null then raise exception 'No existe esa historia o está descartada.' using errcode = 'P0001'; end if;
  if editor is null then select user_id into editor from perfiles where rol = 'editor' order by created_at limit 1; end if;
  if exists (select 1 from tareas where historia_id = h.id and tipo = 'publicar' and estado <> 'hecha') then
    update tareas set vence = lunes + (p_dia - 1) where historia_id = h.id and tipo = 'publicar' and estado <> 'hecha';
  elsif h.estado in ('aprobada', 'programada') then
    insert into tareas (historia_id, tipo, asignado_a, vence) values (h.id, 'publicar', editor, lunes + (p_dia - 1));
  end if;
  perform registrar_corrida('agendar_historia', 'ok', format('historia %s → %s día %s (%s)', h.id, lunes, p_dia, h.estado),
    jsonb_build_object('historia_id', h.id, 'actor', auth.uid()));
  return h;
end $$;
grant execute on function agendar_historia(uuid, date, int, uuid) to authenticated;

-- Al buffer: quita la fecha, vuelve a propuesta y borra la tarea si seguía abierta. Solo si no se publicó.
create or replace function public.desagendar_historia(p_id uuid)
returns historias language plpgsql security definer set search_path = public as $$
declare h historias%rowtype;
begin
  perform exigir_rol('owner');
  delete from tareas where historia_id = p_id and tipo = 'publicar' and estado <> 'hecha';
  update historias set semana = null, dia = null, orden = 1, estado = 'propuesta', programada_para = null
  where id = p_id and estado in ('propuesta', 'aprobada', 'programada') returning * into h;
  if h.id is null then raise exception 'Solo vuelven al buffer las historias que no se han publicado.' using errcode = 'P0001'; end if;
  return h;
end $$;
grant execute on function desagendar_historia(uuid) to authenticated;
