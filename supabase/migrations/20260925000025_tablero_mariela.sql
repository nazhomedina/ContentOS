-- Tablero de Mariela: objetivos de la semana + una tabla con tres bolsas
-- (listo para publicar · material para trabajar · en mis manos) y bitácora con registros automáticos.
-- Dos verbos en Listo (Programar, Publicada), uno en cada otra bolsa (Tomar, Lista).

-- ---------------------------------------------------------------------------
-- 1. La editora también lee la cuota de la semana
-- ---------------------------------------------------------------------------
create or replace function public.cuota_semana(p_semana date)
returns table (tipo text, meta int, publicadas int, en_camino int, piezas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare m record; tps text[];
begin
  perform exigir_rol('owner', 'viewer', 'editor');
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

-- ---------------------------------------------------------------------------
-- 2. Bitácora: lo que se hace en el tablero se anota solo
-- ---------------------------------------------------------------------------
alter table public.bitacora add column origen text not null default 'manual' check (origen in ('manual', 'auto'));

create or replace function public.anotar_bitacora(p_texto text, p_pieza_id uuid default null, p_tarea_id uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into bitacora (perfil_id, texto, pieza_id, tarea_id, origen)
  select auth.uid(), p_texto, p_pieza_id, p_tarea_id, 'auto' where auth.uid() is not null;
$$;
revoke execute on function anotar_bitacora(text, uuid, uuid) from anon;

-- ---------------------------------------------------------------------------
-- 3. Las tres bolsas
-- ---------------------------------------------------------------------------

-- Material para trabajar y en mis manos: piezas en «diseño» (grabadas por Nazho o con texto final),
-- con la tarea abierta de quien la tomó, si alguien la tomó. La editora no ve tareas ajenas por RLS;
-- esta función sí, para poder decirle «la tiene Nazho».
create or replace function public.tablero_material()
returns table (
  id uuid, id_publico text, titulo text, tipo text, fecha_objetivo date, palabras int,
  ultimo_asset text, asset_carpeta text, asset_en timestamptz,
  tarea_id uuid, tarea_tipo text, tarea_estado text, tarea_desde timestamptz, tarea_de uuid, tarea_de_nombre text
) language sql stable security definer set search_path = public as $$
  select p.id, p.id_publico, p.titulo, p.tipo, p.fecha_objetivo,
         coalesce(array_length(regexp_split_to_array(trim(coalesce(p.contenido, '')), '\s+'), 1), 0) as palabras,
         a.nombre, a.carpeta, a.created_at,
         t.id, t.tipo, t.estado, t.created_at, t.asignado_a, pf.nombre
  from piezas p
  left join lateral (select nombre, carpeta, created_at from assets where pieza_id = p.id order by created_at desc limit 1) a on true
  left join lateral (select id, tipo, estado, created_at, asignado_a from tareas
                     where pieza_id = p.id and tipo in ('editar', 'diseñar') and estado <> 'hecha'
                     order by created_at desc limit 1) t on true
  left join perfiles pf on pf.user_id = t.asignado_a
  where rol_actual() in ('owner', 'editor', 'viewer')
    and p.estado = 'diseno' and p.tipo is not null
  order by (t.asignado_a = auth.uid()) desc nulls last, a.created_at desc nulls last, p.fecha_objetivo nulls last, p.id_publico desc;
$$;
revoke execute on function tablero_material() from anon;

-- Tomar: la pieza pasa a mis manos con su tarea (editar para video, diseñar para lo demás).
create or replace function public.tomar_pieza(p_pieza_id uuid)
returns tareas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; t tareas%rowtype; ocupada tareas%rowtype; quien text; tipo_tarea text;
  hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  perform exigir_rol('owner', 'editor');
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p.estado <> 'diseno' then
    raise exception '% no está lista para trabajarse: está en %.', p.id_publico, p.estado using errcode = 'P0001';
  end if;
  select * into ocupada from tareas where pieza_id = p_pieza_id and tipo in ('editar', 'diseñar') and estado <> 'hecha' order by created_at desc limit 1;
  if found then
    if ocupada.asignado_a = auth.uid() then return ocupada; end if;
    select nombre into quien from perfiles where user_id = ocupada.asignado_a;
    raise exception '% ya la tiene %.', p.id_publico, coalesce(quien, 'otra persona') using errcode = 'P0001';
  end if;
  tipo_tarea := case when p.tipo in ('reel', 'yap', 'youtube', 'historia') then 'editar' else 'diseñar' end;
  insert into tareas (pieza_id, tipo, asignado_a, estado, vence)
  values (p_pieza_id, tipo_tarea, auth.uid(), 'en_curso', coalesce(p.fecha_objetivo, hoy + 3))
  returning * into t;
  perform anotar_bitacora(format('Tomó %s para %s', p.id_publico, tipo_tarea), p.id, t.id);
  return t;
end $$;
revoke execute on function tomar_pieza(uuid) from anon;

-- Lista: la pieza pasa al buffer y se cierra la tarea de quien la trabajó.
create or replace function public.pieza_lista(p_pieza_id uuid)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype;
begin
  perform exigir_rol('owner', 'editor');
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p.estado <> 'diseno' then
    raise exception '% está en %; solo lo que está en diseño y producción pasa a listo.', p.id_publico, p.estado using errcode = 'P0001';
  end if;
  update piezas set estado = 'listo' where id = p_pieza_id returning * into p;
  update tareas set estado = 'hecha', hecha_en = now()
   where pieza_id = p_pieza_id and tipo in ('editar', 'diseñar') and estado <> 'hecha'
     and (rol_actual() = 'owner' or asignado_a = auth.uid());
  perform anotar_bitacora(format('Terminó %s: lista para publicar', p.id_publico), p.id, null);
  return p;
end $$;
revoke execute on function pieza_lista(uuid) from anon;

-- Programar: fecha de salida + tarea «publicar» para quien programa.
create or replace function public.programar_pieza(p_pieza_id uuid, p_fecha date)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; t tareas%rowtype; hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  perform exigir_rol('owner', 'editor');
  if p_fecha is null or p_fecha < hoy then raise exception 'Elige una fecha de hoy en adelante.' using errcode = 'P0001'; end if;
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p.estado not in ('listo', 'programada') then
    raise exception '% no está lista: está en %.', p.id_publico, p.estado using errcode = 'P0001';
  end if;
  update piezas set estado = 'programada', fecha_objetivo = p_fecha where id = p_pieza_id returning * into p;
  select * into t from tareas where pieza_id = p_pieza_id and tipo = 'publicar' and estado <> 'hecha' order by created_at desc limit 1;
  if found then
    update tareas set vence = p_fecha, asignado_a = coalesce(asignado_a, auth.uid()) where id = t.id;
  else
    insert into tareas (pieza_id, tipo, asignado_a, vence) values (p_pieza_id, 'publicar', auth.uid(), p_fecha) returning * into t;
  end if;
  perform anotar_bitacora(format('Programó %s para el %s', p.id_publico, to_char(p_fecha, 'DD/MM')), p.id, t.id);
  return p;
end $$;
revoke execute on function programar_pieza(uuid, date) from anon;

-- Publicar deja rastro en la bitácora de quien lo hizo (marcar_publicada ya cierra la tarea y crea la métrica pendiente).
create or replace function public.publicar_desde_tablero(p_pieza_id uuid, p_url text, p_plataforma text)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype;
begin
  p := marcar_publicada(p_pieza_id, p_url, p_plataforma);
  perform anotar_bitacora(format('Publicó %s en %s', p.id_publico, p.plataforma), p.id, null);
  return p;
end $$;
revoke execute on function publicar_desde_tablero(uuid, text, text) from anon;

create or replace function public.publicar_historia(p_id uuid)
returns historias language plpgsql security definer set search_path = public as $$
declare h historias%rowtype;
begin
  perform exigir_rol('owner', 'editor');
  select * into h from historias where id = p_id for update;
  if not found then raise exception 'No existe la historia.' using errcode = 'P0002'; end if;
  if h.estado not in ('aprobada', 'programada') then
    raise exception 'La historia está en %; se publica desde aprobada o programada.', h.estado using errcode = 'P0001';
  end if;
  update historias set estado = 'publicada', publicada_en = now() where id = p_id returning * into h;
  update tareas set estado = 'hecha', hecha_en = now() where historia_id = p_id and tipo = 'publicar' and estado <> 'hecha';
  perform anotar_bitacora(format('Publicó la historia %s%s', h.tipo, case when h.keyword is not null then ' · ' || h.keyword else '' end), null, null);
  return h;
end $$;
revoke execute on function publicar_historia(uuid) from anon;
