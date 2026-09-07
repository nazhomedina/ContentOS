-- Seed del Nodo: cuota semanal y los cuatro sistemas iniciales (docs/nodo.md §4).
-- Idempotente. Los sistemas se corrigen después con definir_sistema por MCP.

insert into metas_semana (formato, cantidad, desde) values
  ('newsletter', 1, '2026-09-07'),
  ('reel', 3, '2026-09-07'),
  ('carrusel', 2, '2026-09-07'),
  ('historia_dia', 4, '2026-09-07')
on conflict (formato) do update set cantidad = excluded.cantidad, desde = excluded.desde;

insert into sistemas (clave, nombre, proposito, orden, nodos, aristas) values
('maquina_semanal', 'Máquina semanal · reels y carruseles',
 'Que cada semana salgan 3 reels y 2 carruseles con hipótesis, y que el multiplicador exista sin que nadie lo teclee.', 10,
 $j$[
  {"clave":"milo_propone","nombre":"Milo propone la parrilla","tipo":"ia","dueno":"Milo","disparador":"Tarea de nube dom 20:00 → MCP crear_pieza","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"sprint_lunes"},"nota":"Hoy la tarea existe en Cowork pero escribe en Notion (ABANDONED 31-ago). Se reescribe para MCP en el sprint 2."},
  {"clave":"nazho_aprueba","nombre":"Nazho aprueba en bloque","tipo":"humano","dueno":"Nazho","disparador":"Notificación del lunes · 5 min desde el teléfono","estado_base":"agendado","evidencia":{"fuente":"piezas","modo":"objetivo","formato":["reel","yap","carrusel"]}},
  {"clave":"guionistas","nombre":"Guionistas escriben","tipo":"ia","dueno":"guionista-reels · yap-scripter · redactor-carruseles","disparador":"Nazho o Milo desde Claude → MCP crear_pieza / actualizar_pieza","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"crear_pieza"}},
  {"clave":"nazho_graba","nombre":"Nazho graba","tipo":"humano","dueno":"Nazho","disparador":"Tareas «grabar» en su cola, mar–jue","estado_base":"agendado","evidencia":{"fuente":"tareas","tipo":["grabar"]},"nota":"Cuello histórico: 30 tarjetas CRI, 0 grabadas."},
  {"clave":"mariela_produce","nombre":"Mariela edita y diseña","tipo":"humano","dueno":"Mariela","disparador":"RAW en Storage → tarea «editar»; carrusel → tarea «diseñar»","estado_base":"agendado","evidencia":{"fuente":"tareas","tipo":["editar","diseñar"]}},
  {"clave":"mariela_publica","nombre":"Mariela publica con URL","tipo":"humano","dueno":"Mariela","disparador":"Botón «Publicada» en el detalle de pieza","estado_base":"agendado","evidencia":{"fuente":"piezas","formato":["reel","yap","carrusel"]}},
  {"clave":"post_scraper","nombre":"Post-scraper de grilla","tipo":"automatizacion","dueno":"n8n","disparador":"Cron diario 6:00 → Apify → metricas(apify)","estado_base":"sin_sistema","evidencia":{"fuente":"corridas","sistema":"post_scraper_grilla"},"nota":"Por construir en el sprint 2. Sin él, el multiplicador no existe."},
  {"clave":"review","nombre":"Review del viernes","tipo":"ia","dueno":"Milo","disparador":"Tarea de nube vie 14:00 → MCP leer_metricas","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"review_viernes"},"nota":"ABANDONED 4-sep. Se reescribe para MCP."}
 ]$j$,
 $j$[{"de":"milo_propone","a":"nazho_aprueba"},{"de":"nazho_aprueba","a":"guionistas"},{"de":"guionistas","a":"nazho_graba"},{"de":"nazho_graba","a":"mariela_produce"},{"de":"mariela_produce","a":"mariela_publica"},{"de":"mariela_publica","a":"post_scraper"},{"de":"post_scraper","a":"review"},{"de":"review","a":"milo_propone","etiqueta":"hallazgos → siguiente sprint"}]$j$),

('historias_lead_magnets', 'Historias y lead magnets',
 'Cuatro días de historias por semana que capturan: keyword → recurso en go.folklore → tag en Kit.', 20,
 $j$[
  {"clave":"milo_paquete","nombre":"Milo propone el paquete","tipo":"ia","dueno":"Milo","disparador":"Dom 20:00 → MCP proponer_historias","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"proponer_historias"}},
  {"clave":"nazho_aprueba","nombre":"Nazho aprueba el paquete","tipo":"humano","dueno":"Nazho","disparador":"Un toque en «Hoy» o aprobar_historias por MCP","estado_base":"agendado","evidencia":{"fuente":"historias","estado":"aprobada"}},
  {"clave":"mariela_publica","nombre":"Mariela programa y publica","tipo":"humano","dueno":"Mariela","disparador":"Pantalla Historias + Business Suite con su cuenta","estado_base":"agendado","evidencia":{"fuente":"historias"},"nota":"Requiere acceso en Meta Business Suite (pendiente de Nazho)."},
  {"clave":"keyword_dm","nombre":"Keyword → DM automático","tipo":"plataforma","dueno":"ManyChat / SetSmart","disparador":"Responder la keyword en IG","estado_base":"sin_sistema","evidencia":{"fuente":"historias","campo":"metricas"},"nota":"ManyChat exige crear el keyword a mano; SetSmart lo crea por MCP pero IG está desconectado. Sensor real: DMs capturados a mano al día siguiente."},
  {"clave":"recurso_go","nombre":"Recurso en go.folklore","tipo":"plataforma","dueno":"go.folklore.mx","disparador":"La liga del DM","estado_base":"agendado","evidencia":{"fuente":"recursos"},"nota":"Los leads se cuentan cuando corra go_leads."},
  {"clave":"kit_tag","nombre":"Lead → Kit con tag","tipo":"automatizacion","dueno":"n8n (hoy tarea de nube trig_014…)","disparador":"Diario 9:00","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"go_leads"}},
  {"clave":"mariela_metricas","nombre":"Mariela anota views, replies y DMs","tipo":"humano","dueno":"Mariela","disparador":"Al día siguiente, desde la tarjeta de la historia","estado_base":"agendado","evidencia":{"fuente":"historias","campo":"metricas"}}
 ]$j$,
 $j$[{"de":"milo_paquete","a":"nazho_aprueba"},{"de":"nazho_aprueba","a":"mariela_publica"},{"de":"mariela_publica","a":"keyword_dm"},{"de":"keyword_dm","a":"recurso_go"},{"de":"recurso_go","a":"kit_tag"},{"de":"mariela_publica","a":"mariela_metricas"}]$j$),

('criterio', 'CRITERIO · newsletter semanal',
 'Una edición cada viernes. Nazho toca un solo punto: programar en Kit.', 30,
 $j$[
  {"clave":"borrador","nombre":"criterio-writer escribe el borrador","tipo":"ia","dueno":"criterio-writer","disparador":"Jueves, desde Claude → MCP crear_pieza(formato newsletter)","estado_base":"agendado","evidencia":{"fuente":"piezas","modo":"objetivo","formato":["newsletter"]}},
  {"clave":"nazho_programa","nombre":"Nazho revisa y programa en Kit","tipo":"humano","dueno":"Nazho","disparador":"Viernes, un clic desde el borrador de Kit","estado_base":"agendado","evidencia":{"fuente":"piezas","formato":["newsletter"]},"nota":"Kit no permite programar por API: este clic es irreducible."},
  {"clave":"kit_envia","nombre":"Kit envía","tipo":"plataforma","dueno":"Kit","disparador":"Hora programada","estado_base":"agendado","evidencia":{"fuente":"piezas","formato":["newsletter"]}},
  {"clave":"kit_suscriptores","nombre":"Sensor de suscriptores","tipo":"automatizacion","dueno":"n8n","disparador":"Diario · Kit get_growth_stats","estado_base":"sin_sistema","evidencia":{"fuente":"indicadores","campo":"suscriptores"},"nota":"Por construir en el sprint 2."}
 ]$j$,
 $j$[{"de":"borrador","a":"nazho_programa"},{"de":"nazho_programa","a":"kit_envia"},{"de":"kit_envia","a":"kit_suscriptores"}]$j$),

('pauta_pixel', 'Pauta y pixel',
 'Contenido frío con pauta → pixel → audiencias cálidas → lead magnet → CRITERIO → libro.', 40,
 $j$[
  {"clave":"elegir_pieza","nombre":"Elegir la pieza fría con mejor multiplicador","tipo":"ia","dueno":"Milo","disparador":"Review del viernes, con multiplicador","estado_base":"sin_sistema","evidencia":{"fuente":"metricas","fuente_metrica":"apify"},"nota":"Depende del post-scraper."},
  {"clave":"campana_fria","nombre":"Campaña fría","tipo":"humano","dueno":"Fer","disparador":"Presupuesto semanal aprobado ($1,000 MXN/mes acumulando)","estado_base":"sin_sistema","evidencia":{"fuente":"campanas","objetivo":"frio"}},
  {"clave":"pixel","nombre":"Pixel → audiencias cálidas","tipo":"plataforma","dueno":"Meta","disparador":"Automático con el pixel instalado","estado_base":"sin_sistema","evidencia":{"fuente":"ninguna"},"nota":"Sin sensor hasta conectar Meta Ads como job."},
  {"clave":"campana_calida","nombre":"Campaña cálida a lead magnet","tipo":"humano","dueno":"Fer","disparador":"Audiencia cálida ≥ tamaño mínimo","estado_base":"sin_sistema","evidencia":{"fuente":"campanas","objetivo":"calido"}},
  {"clave":"leads_kit","nombre":"Leads → Kit","tipo":"automatizacion","dueno":"n8n","disparador":"Diario","estado_base":"agendado","evidencia":{"fuente":"corridas","sistema":"go_leads"}},
  {"clave":"libro","nombre":"CRITERIO → libro NUM","tipo":"plataforma","dueno":"Kit + Stripe","disparador":"Secuencia de bienvenida y ediciones","estado_base":"sin_sistema","evidencia":{"fuente":"ninguna"},"nota":"Ventas sin sensor hasta conectar Stripe."}
 ]$j$,
 $j$[{"de":"elegir_pieza","a":"campana_fria"},{"de":"campana_fria","a":"pixel"},{"de":"pixel","a":"campana_calida"},{"de":"campana_calida","a":"leads_kit"},{"de":"leads_kit","a":"libro"}]$j$)
on conflict (clave) do update set
  nombre = excluded.nombre, proposito = excluded.proposito, orden = excluded.orden,
  nodos = excluded.nodos, aristas = excluded.aristas, version = sistemas.version + 1;
