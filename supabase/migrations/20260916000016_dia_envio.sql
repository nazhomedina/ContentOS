-- 016 · Día de envío del newsletter (docs/decisiones.md 2026-09-16 · Newsletter, pantalla)
-- El día no está fijo en viernes: vive en el formato (formatos.dia_envio, ISO 1 = lunes … 7 = domingo).
-- Cambiarlo recorre los próximos envíos y la fecha por defecto de las ediciones nuevas; las agendadas conservan su fecha.

alter table public.formatos add column if not exists dia_envio smallint check (dia_envio between 1 and 7);
update formatos set dia_envio = 5 where codigo = 'FC-09' and dia_envio is null;

-- El siguiente envío del formato en horario de negocio; si hoy es el día, el de la semana que viene.
create or replace function public.siguiente_envio(p_formato text default 'FC-09')
returns date language sql stable set search_path = public as $$
  select d + (case when (dia - extract(isodow from d)::int + 7) % 7 = 0 then 7 else (dia - extract(isodow from d)::int + 7) % 7 end)
  from (select (now() at time zone 'America/Mexico_City')::date as d,
               coalesce((select dia_envio from formatos where codigo = p_formato or id::text = p_formato), 5) as dia) x;
$$;
grant execute on function siguiente_envio(text) to authenticated;
drop function if exists public.viernes_siguiente();

create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype; h jsonb := payload->'hipotesis'; hid uuid; fid uuid;
        est text := coalesce(nullif(payload->>'estado',''), 'borrador');
        etq text[] := coalesce(array(select jsonb_array_elements_text(payload->'etiquetas')), '{}');
        srs text[] := coalesce(array(select jsonb_array_elements_text(payload->'series')), '{}');
        tit text := nullif(payload->>'titulo', '');
        fobj date := (payload->>'fecha_objetivo')::date;
        fmt text := nullif(payload->>'formato', '');
begin
  perform exigir_rol('owner');
  if nullif(payload->>'serie','') is not null and not (payload->>'serie' = any (srs)) then srs := array_append(srs, payload->>'serie'); end if;
  if tit is null and nullif(payload->>'contenido','') is null then
    raise exception 'Una pieza nace con al menos un título.' using errcode = 'P0001';
  end if;
  -- Newsletter: edición numerada, formato FC-09 y el siguiente día de envío por defecto (docs/newsletter.md).
  if payload->>'tipo' = 'newsletter' then
    fmt := coalesce(fmt, 'FC-09');
    fobj := coalesce(fobj, siguiente_envio(fmt));
    if tit is not null and tit !~ '^Criterio #\d{3}' then
      tit := format('Criterio #%s — %s', lpad(siguiente_edicion_criterio()::text, 3, '0'), tit);
    end if;
  end if;
  if nullif(payload->>'hipotesis_id','') is not null then
    hid := (payload->>'hipotesis_id')::uuid;
  elsif h is not null then
    select id into hid from crear_hipotesis(h->>'texto', h->>'campo', (h->>'numero')::numeric, (h->>'fecha')::date);
  end if;
  perform validar_pieza_para_estado(est, payload->>'tipo', payload->>'etapa_embudo', hid, etq);
  if fmt is not null then
    select id into fid from formatos where codigo = fmt or id::text = fmt;
    if fid is null then raise exception 'No existe el formato %.', fmt using errcode = 'P0001'; end if;
  end if;
  insert into piezas (
    id_publico, comunidad_id, tipo, series, formato_id, hipotesis_id, etapa_embudo, contenido,
    fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, notas, etiquetas
  ) values (
    nullif(payload->>'id_publico',''),
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'tipo', srs, fid, hid, payload->>'etapa_embudo', payload->>'contenido',
    fobj, (payload->>'responsable_id')::uuid, tit,
    coalesce((payload->>'programa_aprobado')::boolean, false), est, payload->>'notas', etq
  ) returning * into p;
  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.tipo, 'sin tipo'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception when unique_violation then
  raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;
