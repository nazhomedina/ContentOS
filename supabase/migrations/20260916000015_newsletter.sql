-- 015 · Newsletter CRITERIO (docs/decisiones.md 2026-09-16 · Newsletter; docs/newsletter.md)
-- El newsletter es una pieza de tipo `newsletter` con formato FC-09: edición numerada en el título
-- («Criterio #002 — …»), serie Criterio heredada del formato y el viernes siguiente como fecha objetivo.
-- El checklist de 8 puntos de la spec vive en el molde del formato: Claude lo lee antes de redactar.

-- FC-09 · el formato del newsletter, con la spec canónica como molde.
insert into formatos (codigo, nombre, estado, serie_propia, duracion, recompensa, cadencia, hipotesis_formato, origen, molde)
select 'FC-09', 'CRITERIO (newsletter semanal)', 'experimentando', 'Criterio', '~5 min de lectura · 6 secciones',
  'Criterio prestado: una regla de decisión citable + el prompt que la ejecuta con los datos del lector',
  'viernes, semanal, sin excepción; ediciones numeradas públicamente',
  'Una decisión con criterio a la semana sostiene señales de confianza (respuestas, DMs cualificados) edición tras edición. Open rate = salud, no meta.',
  'spec 00-FORMATO-CRITERIO.md v1.0 (2026-08-08)',
  $molde$# FC-09 · CRITERIO — newsletter semanal

**Spec canónica:** `02 PROYECTOS/NEWSLETTER 2026/00-FORMATO-CRITERIO.md` (v1.0, 2026-08-08). Si el formato cambia, cambia allá y se copia aquí.

## Identidad
- Posicionamiento: «Crece como empresario. Una decisión con criterio a la vez.»
- Tesis paraguas: Marca da dirección. Marketing da tracción. Necesitas las dos.
- Enemigo editorial: el «más» sin criterio. «No estoy contra el marketing. Estoy contra el marketing sin dirección.»
- Audiencia: dueños de PyME establecida. Cadencia: viernes, semanal. Plataforma: Kit · criterio.nazho.mx.
- Firma de cierre: «Decide con criterio. — Nazho». Métrica dorada: revenue + señales de confianza (respuestas, DMs). Open rate = salud, no meta.

## Anatomía (6 secciones, ~5 min)
1. **Apertura sin título** (60-90 palabras): escena cotidiana que ES el tema. Sin encabezado, sin «Hola»: la primera línea es la primera línea de la escena.
2. **El Caso** (200-300): decisión real, qué pasó, números cuando se pueda. Si es propio, línea de credibilidad («en 10 años dirigiendo Folklore…»). W's propias y de clientes > casos ajenos.
3. **El Criterio** (100-150): la regla en negritas, citable, + el porqué. Incluye **Esto no lo digo yo**: fuente primaria con autor, obra y año.
4. **Aplícalo el lunes**: 3 bullets de aplicación inmediata.
5. **El Prompt de la Semana**: bloque copy-paste que EJECUTA este criterio. Contexto 1 línea → prompt con [campos] → qué entrega.
6. **PS** (1-2 líneas): la ÚNICA venta. Rotación: lista de espera del libro (L) · lead magnet (LM) · curso NUM (C).

## Checklist de calidad (las 8 antes de pasar a Listo)
1. ¿Pasa las 4 E's? (Educate, Entertain, Engage, Emotion)
2. ¿El criterio se rastrea a la tesis paraguas o a un pilar? (A-Dirección · B-Tracción · C-Precio · D-Cliente · E-Foco)
3. ¿El caso es real, verificable o anonimizado con base real?
4. ¿La fuente de «Esto no lo digo yo» es primaria y citada con obra y año?
5. ¿El prompt ejecuta ESTE criterio y tiene [campos] + qué entrega?
6. ¿Hay UNA sola venta (el PS)?
7. ¿Subject line con curiosidad + especificidad, sin clickbait? (2 opciones mínimo)
8. ¿Suena a Nazho? (sin «Y» al inicio de oración; si suena a «cualquier cuenta de marketing», se reescribe)

## Reglas editoriales
Contraria ≠ controvertida · repetición como mecanismo (100 criterios = una creencia martillada) · los criterios nacen del banco de dolores del lector · deslinde MHF · pilares alternados.

## Encabezado del contenido
El contenido de la pieza abre con las opciones de subject (2 mínimo) y el preheader, y luego la edición. El PS y las notas de producción van al final.

## Cascada (post-publicación)
Cada edición se re-empaca: 1 reel (El Criterio hablado) · 1 carrusel (El Caso) · 2-3 posts de texto. CTA único del social: suscribirse a CRITERIO. Producción: jueves con Mariela. Las hijas se crean con crear_pieza (tipo reel/carrusel, serie Criterio).

## Puente con Kit
El contenido vive aquí, versionado. Claude crea el borrador en Kit por su conector (plantilla v2, 600 px). Nazho lo programa en la interfaz de Kit para el viernes 9:00. Al enviarse, la pieza pasa a publicada con la URL pública del broadcast. Detalle: docs/newsletter.md.$molde$
where not exists (select 1 from formatos where codigo = 'FC-09');

-- La siguiente edición: se lee del título, no se guarda.
create or replace function public.siguiente_edicion_criterio()
returns int language sql stable set search_path = public as $$
  select coalesce(max((regexp_match(titulo, '^Criterio #(\d{3})'))[1]::int), 0) + 1
  from piezas where tipo = 'newsletter' and titulo ~ '^Criterio #\d{3}';
$$;
grant execute on function siguiente_edicion_criterio() to authenticated;

-- El viernes siguiente en horario de negocio; si hoy es viernes, el de la semana que viene.
create or replace function public.viernes_siguiente()
returns date language sql stable set search_path = public as $$
  select d + (case when (5 - extract(isodow from d)::int + 7) % 7 = 0 then 7 else (5 - extract(isodow from d)::int + 7) % 7 end)
  from (select (now() at time zone 'America/Mexico_City')::date as d) x;
$$;
grant execute on function viernes_siguiente() to authenticated;

-- crear_pieza_validada: defaults del newsletter (formato FC-09, viernes siguiente, título numerado).
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
  -- Newsletter: edición numerada, formato FC-09 y el viernes siguiente por defecto (docs/newsletter.md).
  if payload->>'tipo' = 'newsletter' then
    fmt := coalesce(fmt, 'FC-09');
    fobj := coalesce(fobj, viernes_siguiente());
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
