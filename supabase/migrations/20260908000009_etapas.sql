-- 009 · Etapas Borrador → Producción → Publicado (docs/estructura.md) y cuentas en seguimiento.
-- Estados nuevos: borrador · redaccion · grabacion · diseno · listo · programada · publicada · archivada · en_trial
-- Mapa: idea→borrador · para_producir→redaccion · para_grabar→grabacion · edicion→diseno · buffer→listo

-- ---------------------------------------------------------------------------
-- 1. Quitar lo que depende de los nombres viejos
-- ---------------------------------------------------------------------------
drop policy if exists piezas_editor_leer on piezas;
drop trigger if exists piezas_tope on piezas;
alter table piezas drop constraint piezas_estado_check;
alter table piezas drop constraint completa_segun_estado;

-- ---------------------------------------------------------------------------
-- 2. Renombrar datos
-- ---------------------------------------------------------------------------
select set_config('app.import', 'on', true);
update piezas set estado = case estado
  when 'idea' then 'borrador' when 'para_producir' then 'redaccion' when 'para_grabar' then 'grabacion'
  when 'edicion' then 'diseno' when 'buffer' then 'listo' else estado end;

alter table piezas add constraint piezas_estado_check check (estado in
  ('borrador','redaccion','grabacion','diseno','listo','programada','publicada','archivada','en_trial'));
alter table piezas alter column estado set default 'borrador';
alter table piezas add constraint completa_segun_estado check (
  estado in ('borrador','archivada')
  or (estado = 'redaccion' and formato is not null)
  or (estado not in ('borrador','archivada','redaccion') and formato is not null and etapa_embudo is not null and hipotesis is not null)
);

-- ---------------------------------------------------------------------------
-- 3. Funciones con los nombres nuevos
-- ---------------------------------------------------------------------------
create or replace function public.validar_tope_produccion()
returns trigger language plpgsql set search_path = public as $$
declare
  en_tope constant text[] := array['redaccion','grabacion'];
  entra boolean; n int;
begin
  if current_setting('app.import', true) = 'on' then return new; end if;
  if new.programa_aprobado or not (new.estado = any (en_tope)) then return new; end if;
  entra := tg_op = 'INSERT' or not (old.estado = any (en_tope)) or old.programa_aprobado;
  if not entra then return new; end if;
  select count(*) into n from piezas where estado = any (en_tope) and not programa_aprobado and id <> new.id;
  if n >= 10 then
    raise exception 'Tope de producción: ya hay % piezas en redacción o grabación. Regresa una a borrador antes de meter otra.', n
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger piezas_tope before insert or update of estado, programa_aprobado on piezas
  for each row execute function validar_tope_produccion();

create or replace function public.transicion_permitida(p_rol text, p_de text, p_a text)
returns boolean language sql immutable set search_path = public as $$
  select case
    when p_rol = 'owner' then p_a <> 'publicada'
    when p_rol = 'editor' then (p_de, p_a) in (
      ('grabacion','diseno'), ('diseno','listo'), ('listo','programada'), ('programada','listo'), ('redaccion','diseno'))
    else false end;
$$;

create or replace function public.validar_pieza_para_estado(p_estado text, p_formato text, p_etapa text, p_hipotesis jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare h jsonb := p_hipotesis; falta text;
begin
  if p_estado in ('borrador', 'archivada') then return; end if;
  if p_formato is null then
    raise exception 'Antes de producirla, la pieza necesita formato.' using errcode = 'P0001';
  end if;
  if p_estado = 'redaccion' then return; end if;
  falta := case
    when p_etapa is null then 'etapa_embudo'
    when h is null then 'hipotesis'
    when nullif(h->>'texto','') is null then 'hipotesis.texto'
    when nullif(h->>'campo','') is null then 'hipotesis.campo'
    when jsonb_typeof(h->'numero') <> 'number' then 'hipotesis.numero'
    when nullif(h->>'fecha','') is null then 'hipotesis.fecha'
    else null end;
  if falta is not null then
    raise exception 'Para pasar a % falta %. Pídele a Claude que complete la pieza en redacción.', p_estado, falta using errcode = 'P0001';
  end if;
  if (h->>'fecha') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'hipotesis.fecha debe ser AAAA-MM-DD.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.cambiar_estado_pieza(p_pieza_id uuid, p_nuevo_estado text)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; rol text := rol_actual();
begin
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p_nuevo_estado = 'publicada' then
    raise exception 'Para publicar usa marcar_publicada con la URL.' using errcode = 'P0001';
  end if;
  if not transicion_permitida(rol, p.estado, p_nuevo_estado) then
    raise exception 'Tu rol (%) no puede pasar la pieza de % a %.', coalesce(rol,'ninguno'), p.estado, p_nuevo_estado using errcode = '42501';
  end if;
  if rol = 'editor' and p.responsable_id is distinct from auth.uid()
     and p.estado not in ('grabacion','diseno','listo','programada') then
    raise exception 'La pieza no está en tu cola.' using errcode = '42501';
  end if;
  perform validar_pieza_para_estado(p_nuevo_estado, p.formato, p.etapa_embudo, p.hipotesis);
  update piezas set estado = p_nuevo_estado where id = p_pieza_id returning * into p;
  perform registrar_corrida('cambiar_estado_pieza', 'ok', format('%s → %s', p.id_publico, p_nuevo_estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
end $$;

create or replace function public.marcar_publicada(p_pieza_id uuid, p_url text, p_plataforma text)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  perform exigir_rol('owner', 'editor');
  select * into p from piezas where id = p_pieza_id for update;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  if p.estado = 'publicada' then raise exception '% ya está publicada.', p.id_publico using errcode = 'P0001'; end if;
  if p.estado not in ('listo', 'programada') then
    raise exception 'Falta terminarla: la pieza está en %. Se publica desde «listo» o «programada».', p.estado using errcode = 'P0001';
  end if;
  if p_url is null or p_url !~* '^https?://[^\s]+$' then
    raise exception 'La URL es obligatoria y debe empezar con http(s)://' using errcode = 'P0001';
  end if;
  if nullif(trim(p_plataforma), '') is null then
    raise exception 'Falta la plataforma (instagram, youtube, x, kit…).' using errcode = 'P0001';
  end if;
  update piezas set estado = 'publicada', publicada_en = now(), url = p_url, plataforma = lower(trim(p_plataforma))
   where id = p_pieza_id returning * into p;
  update tareas set estado = 'hecha', hecha_en = now() where pieza_id = p_pieza_id and tipo = 'publicar' and estado <> 'hecha';
  insert into metricas (pieza_id, fecha, fuente, capturado_por) values (p_pieza_id, hoy, 'pendiente', auth.uid())
  on conflict (pieza_id, fecha, fuente) do nothing;
  perform registrar_corrida('marcar_publicada', 'ok', format('%s publicada en %s', p.id_publico, p.plataforma),
    jsonb_build_object('pieza_id', p.id, 'url', p_url, 'actor', auth.uid()));
  return p;
end $$;

-- crear_pieza_validada: default borrador
create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; h jsonb := payload->'hipotesis'; fc uuid;
        est text := coalesce(nullif(payload->>'estado',''), 'borrador');
begin
  perform exigir_rol('owner');
  if nullif(payload->>'titulo','') is null and nullif(payload->>'guion','') is null then
    raise exception 'Una pieza nace con al menos un título.' using errcode = 'P0001';
  end if;
  perform validar_pieza_para_estado(est, payload->>'formato', payload->>'etapa_embudo', h);
  if h is not null and (h->>'fecha')::date <= (now() at time zone 'America/Mexico_City')::date then
    raise exception 'hipotesis.fecha debe estar en el futuro.' using errcode = 'P0001';
  end if;
  if nullif(payload->>'format_card','') is not null then
    select id into fc from format_cards where codigo = payload->>'format_card' or id::text = payload->>'format_card';
    if fc is null then raise exception 'No existe la Format Card %.', payload->>'format_card' using errcode = 'P0001'; end if;
  end if;
  insert into piezas (
    id_publico, idea_id, comunidad_id, formato, serie, format_card_id, hipotesis, etapa_embudo, cta, guion, spec_visual,
    fidelidad, fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, origen, notas, formato_sugerido
  ) values (
    nullif(payload->>'id_publico',''), (payload->>'idea_id')::uuid,
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'formato', payload->>'serie', fc,
    case when h is null then null else jsonb_build_object('texto', h->>'texto', 'campo', h->>'campo', 'numero', h->'numero', 'fecha', h->>'fecha') end,
    payload->>'etapa_embudo', payload->>'cta', payload->>'guion', payload->>'spec_visual',
    coalesce(payload->>'fidelidad', 'mis_palabras'),
    (payload->>'fecha_objetivo')::date, (payload->>'responsable_id')::uuid, payload->>'titulo',
    coalesce((payload->>'programa_aprobado')::boolean, false), est,
    coalesce(payload->>'origen', 'nazho'), payload->>'notas',
    coalesce(array(select jsonb_array_elements_text(payload->'formato_sugerido')), '{}')
  ) returning * into p;
  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.formato, 'sin formato'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception when unique_violation then
  raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;

-- cuota_semana: en_camino con los estados nuevos
create or replace function public.cuota_semana(p_semana date)
returns table (formato text, meta int, publicadas int, en_camino int, piezas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare m record; fmts text[];
begin
  perform exigir_rol('owner', 'viewer');
  for m in select * from metas_semana order by formato loop
    formato := m.formato; meta := m.cantidad;
    if m.formato = 'historia_dia' then
      select count(distinct (h.publicada_en at time zone 'America/Mexico_City')::date) into publicadas
        from historias h where h.estado = 'publicada' and h.semana = p_semana;
      select count(distinct h.dia) into en_camino from historias h where h.semana = p_semana and h.estado in ('aprobada','programada');
      select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'dia', h.dia, 'serie', h.serie, 'estado', h.estado) order by h.dia, h.orden), '[]')
        into piezas from historias h where h.semana = p_semana and h.estado <> 'descartada';
    else
      fmts := case when m.formato = 'reel' then array['reel','yap'] else array[m.formato] end;
      select count(*) into publicadas from piezas p
        where p.estado = 'publicada' and p.formato = any (fmts)
          and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz;
      select count(*) into en_camino from piezas p
        where p.formato = any (fmts) and p.estado not in ('publicada','archivada','en_trial','borrador')
          and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7;
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'id_publico', p.id_publico, 'titulo', p.titulo, 'estado', p.estado,
               'fecha_objetivo', p.fecha_objetivo, 'responsable', pf.nombre) order by p.fecha_objetivo nulls last, p.id_publico), '[]')
        into piezas
        from piezas p left join perfiles pf on pf.user_id = p.responsable_id
        where p.formato = any (fmts) and p.estado not in ('archivada','borrador') and (
          (p.estado = 'publicada' and p.publicada_en >= p_semana::timestamptz and p.publicada_en < (p_semana + 7)::timestamptz)
          or (p.estado <> 'publicada' and p.fecha_objetivo >= p_semana and p.fecha_objetivo < p_semana + 7));
    end if;
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. RLS del editor con los estados nuevos
-- ---------------------------------------------------------------------------
create policy piezas_editor_leer on piezas for select to authenticated
  using (rol_actual() = 'editor' and (estado in ('grabacion','diseno','listo','programada','publicada') or responsable_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Cuentas en seguimiento (watchlist ligera; el scraping llega con el radar v2)
-- ---------------------------------------------------------------------------
create table if not exists public.cuentas_referencia (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades default '11111111-0000-4000-8000-000000000001',
  handle text not null,
  plataforma text not null default 'instagram' check (plataforma in ('instagram','tiktok','youtube','x','linkedin','newsletter')),
  nota text,
  format_card_sugerida uuid references format_cards,
  activa boolean not null default true,
  ultimo_scrape timestamptz,
  created_at timestamptz not null default now(),
  unique (handle, plataforma)
);
alter table cuentas_referencia enable row level security;
create policy owner_todo on cuentas_referencia for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy editor_leer on cuentas_referencia for select to authenticated using (rol_actual() = 'editor');

-- Sistemas del Nodo: evidencia con los estados nuevos no cambia (usa tareas/corridas/piezas publicadas).
