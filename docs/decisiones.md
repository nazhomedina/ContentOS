# Decisiones del repo

Formato: fecha · decisión · por qué · descartado. Las decisiones de producto viven en `_Claude/Memory/decisiones.md`; aquí solo las del repo.

## 2026-09-06

**Nombre: ContentOS.** Decidido por Nazho. Paquete `contentos`, proyecto Supabase «ContentOS», proyecto Vercel `content-os` (ya existía, ligado a `github.com/nazhomedina/ContentOS`). El nombre visible en la UI es una constante en `lib/dominio/marca.ts` por si cambia. *Descartado:* «Taller de Contenido» como nombre final.

**Repo de GitHub: se reutiliza `nazhomedina/ContentOS`.** Solo tiene una rama de un intento anterior (`claude/nazho-content-studio-arch-83AWf`, julio 2026). Se sube `main` nuevo desde este repo; la rama vieja no se toca ni se borra.

**Supabase: proyecto nuevo en la org Folklore (Pro), región `us-west-1`.** Costo: USD 10/mes por instancia adicional de cómputo. *Descartado:* reactivar «Folklore Content Platform» (`iyjggxnajumwhsviserv`, inactivo, us-east-1): región distinta y esquema ajeno.

**Defaults de los hallazgos 1–12 de PLAN.md, adoptados tal cual** (Nazho: «toma las mejores decisiones por mí»):
1. `metricas.fuente` admite `apify · tikhub · manual · yt_analytics · kit · pendiente · notion`.
2. Hipótesis: check de valores, no de llaves; `legado` dentro del JSON.
3. Columnas y tablas faltantes entran en `001_nucleo.sql`.
4. Tope de 10: el import lo salta con `set_config('app.import','on')`; el excedente heredado se pinta en rojo.
5. `marcar_publicada` acepta desde `buffer` y `programada`.
6. FKs diferidas con `alter table` al final de 001.
7. Impersonación MCP: JWT legacy si existe; si no, `set local role` + `request.jwt.claims`.
8. MCP primero para Claude Code; Cowork se verifica después.
9. Transporte Streamable HTTP stateless.
10. `multiplicador()` devuelve `null` si n<3 y guarda `n`.
11. Se importan las 229 piezas.
12. Una comunidad activa, una inactiva «(por definir)».

**Stack concreto:** Next 15.5 · React 19.1 · Tailwind 4 · shadcn/ui (estilo por defecto) · npm (no pnpm). Fuente: Gilroy si hay licencia local, fallback Outfit por `next/font/google`.

**Comunidad 1 «Fundadores con criterio».** ICP, dolor y promesa redactados por Claude a partir de `estrategia-marca-personal-nazho.md` (ICP A, problema PURE, positioning). Van en `seed.sql` marcados como borrador hasta que Nazho los edite desde la app o por MCP (`actualizar_comunidad` no existe en v1; se edita en la tabla).

## 2026-09-07

**Migraciones numeradas por timestamp y en orden núcleo → funciones → RLS → endurecer.** El handoff decía 001/002/003 con RLS antes que funciones; la RLS del editor depende de `rol_actual()`, así que las funciones van primero. `010_radar.sql` vive en `supabase/pendientes/` para que `db push` no lo tome.

**Lista blanca de acceso (`perfiles_permitidos`).** El magic link solo crea perfil a correos registrados; cualquier otro correo falla al registrarse. Sustituye a «crear perfil al primer login» sin control.

**Tarjetas de Format Card en el seed: versión condensada.** Los `.md` de format-lab siguen siendo la fuente; el molde en la app es lo que un skill necesita leer por MCP, no el histórico completo.

**Funciones: nadie ejecuta como anon; `service_role` para `registrar_corrida`, `recalcular_multiplicadores` y `perfil_por_api_key`.** Los triggers que escriben corridas son `security definer`. Aviso del linter que queda: funciones `security definer` ejecutables por `authenticated`, intencional porque cada una valida rol adentro.

**Puerto local 3017.** El 3000 lo ocupa otra app de Nazho (`/entrar`). `npm run dev` ya lo fija.

**Prueba de extremo a extremo con usuario temporal.** `npm run prueba:e2e` crea una editora en la lista blanca con contraseña vía Admin API, entra con cookie de @supabase/ssr, recorre /cola, /piezas/[id], /historias, valida redirecciones por rol y RLS, y la borra. No toca la cuenta de Nazho. *Descartado:* pedirle a Nazho que pruebe con magic link cada iteración.

**Datos de demostración (DEMO-01..03, 3 tareas, 4 historias, recurso RORY).** Para que las pantallas no lleguen vacías. Se borran con `scripts/limpiar-demo.sql` al correr el import de Notion.

**Storage: tres carpetas por pieza (`raw/`, `portada/`, `final/`).** El webhook `/api/hooks/storage` crea la tarea «editar» al llegar un RAW. Falta registrarlo en el dashboard (Database → Webhooks) con el header `x-hooks-secret`.

**Owner también entra a /cola.** Ve todas las tareas con su asignado; no es solo pantalla de Mariela. Así Nazho revisa la cola desde el teléfono sin el kanban.

## 2026-09-07 (tarde) · El Nodo

**Se construyó la capa de sistemas antes del import** (decisión de Nazho al ver el sprint 1). Migración `005_nodo`: `sistemas` (grafo como jsonb), `metas_semana`, `campanas`, `huecos`; funciones `estado_nodos`, `cuota_semana`, `declarar_hueco`, `definir_sistema`. Seed con 4 sistemas y la cuota 1/3/2/4.

**Los sistemas se definen como datos, no con un editor visual.** Claude los escribe por MCP (`definir_sistema`); la app los pinta y vigila. *Descartado:* editor de arrastrar nodos.

**Evidencia por nodo, calculada, no guardada.** `estado_nodos` consulta la fuente declarada en el nodo (corridas, tareas, piezas, historias, indicadores, metricas, recursos, campanas) para la semana. Estados: corrió · hueco · agendado · sin_sistema.

**Inicio del owner es /hoy; del viewer, /semana.** Barra móvil del owner: Hoy, Semana, Cola, Piezas, Historias.

**Oscuro por defecto** (DESIGN.md: negro como base).

**MCP en `/api/mcp` con 19 herramientas** (13 del handoff + listar_piezas + 4 del Nodo). Stateless; no se cierra el server tras `handleRequest` porque la Response es un stream. Las corridas de las tools se escriben con service_role (bitácora), todo lo demás con el JWT impersonado. Probado con `npm run prueba:mcp` (11/11).

**Formulario de pieza nueva crea la primera tarea al guardar.** Reduce el «un solo punto» de Nazho a una pantalla.

## 2026-09-07 (noche) · Import parcial de ideas

**30 de las 45 ideas del 💡 Banco de ideas entraron a `ideas`** (`scripts/import-ideas-2026-09-07.sql`, idempotente por `notion_url`). Criterio: las 2 en Propuesta → shortlist; las 3 no-legacy (Radar, Markie); las legacy con tensión escrita; el resto por orden de captura. Quedan 15 en Notion para el import completo. Nazho pidió trabajar la plataforma antes del import total.

**`ideas.origen` admite `legado` y `nazho`** (migración 006) para no inventar procedencias. `ideas.notion_url` y `ideas.formato_sugerido` dan trazabilidad y prellenan el formulario de pieza.

**Pantalla Ideas construida:** tres columnas (nuevas, shortlist, convertidas) + descartadas plegadas, captura rápida, atajos S/D/C/N y «Convertir» que abre el formulario de pieza con título, notas y etapa prellenados; al crear, la idea pasa a convertida (lo hace `crear_pieza_validada`).

## 2026-09-07 (noche) · Simplificación aplicada

**Una sola base: las ideas son piezas en estado `idea`** (migración 007). `formato`, `etapa_embudo` e `hipotesis` son opcionales hasta `para_grabar`; el check `completa_segun_estado` lo exige ahí. `crear_pieza_validada` acepta solo título. `cambiar_estado_pieza` explica qué falta con un mensaje legible. La tabla `ideas` quedó vacía; se borra cuando nada la lea.

**`id_publico` se genera solo** por prefijo de formato (REE, YAP, CAR, HIS, XPO, CAN, NEW, ART, YTB; IDE para ideas) y consecutivo. Al dar formato a una idea, el ID cambia de IDE- a su prefijo.

**Hipótesis: la escribe Claude.** Nazho captura una línea; Claude desarrolla con `actualizar_pieza`. La regla 1 sigue en el esquema, exigida para grabar y no para pensar.

**Pantallas:** Inicio (Hoy + Semana), Piezas (única, con captura y filtros), Formatos (nueva), Sistemas (Máquina + Latidos), Cola, Historias. Se eliminaron Ideas, Semana, Embudo, Latidos y el formulario de pieza nueva. Tema claro, menú lateral. Rol viewer sin navegación hasta que tenga pantalla útil.

**MCP: 15 tools.** Fuera las de ideas; `actualizar_pieza` acepta hipótesis, formato, etapa y format card y es la forma en que Claude convierte una idea en pieza. Nueva `listar_formatos`.

**Tabla `hooks` ligera** (texto, categoría, formato, pieza de origen, favorito). Sin pantalla todavía.

## 2026-09-08 · Bitácora diaria (accountability)

**Prioridad declarada por Nazho:** claridad sobre en qué trabaja Mariela. Se construyó `bitacora` (migración 008): cada persona declara al día en qué trabajó, opcionalmente ligado a una pieza, con minutos y archivo. RLS: cada quien escribe lo suyo; lo de hoy se corrige, lo de ayer queda como se declaró. Los archivos van a `assets/piezas/{id}/final/` si hay pieza, o a `assets/bitacora/{user}/{fecha}/` si no.

**Declarado junto a evidencia.** `evidencia_dia(perfil, fecha)` junta lo que la plataforma vio: tareas cerradas, estados movidos (corridas con actor), historias publicadas, archivos subidos, comentarios. La pantalla Equipo muestra las dos columnas por día; los días laborales sin bitácora se pintan en rojo. Cuando no coinciden es una conversación, no una estimación.

**Dónde declara Mariela:** bloque «Tu día» arriba de su Cola, en ámbar hasta que declare. **Dónde lo ve Nazho:** bloque «Equipo» en Inicio (hoy y ayer por persona) y pantalla Equipo por semana. **Desde Claude:** tool `bitacora_de(persona, desde, hasta)`.

**Sin recordatorio externo todavía.** El empujón es el bloque ámbar en su Cola. Un aviso por WhatsApp a las 17:00 si no ha declarado es un job de n8n para después.

## 2026-09-08 · Deploy

**Producción en Vercel:** `https://content-os-nazho-flkmxs-projects.vercel.app`, proyecto `content-os`, región `sfo1` (cerca de Supabase us-west-1). Variables cargadas por CLI en production y preview. `TZ` no se puede definir en Vercel (reservada); el código ya fija America/Mexico_City por su cuenta.

**El push del domingo había fallado en Vercel** por framework sin detectar y el alias `@/` en el middleware. Se fijó `framework: nextjs` en `vercel.json` y el middleware importa por ruta relativa.

**Deployment Protection apagada.** Vercel Authentication exigía cuenta de Vercel a cualquier visitante, lo que bloqueaba a Mariela y al MCP. La protección real es el login de la app y la lista blanca.

**`.mcp.json` apunta a producción.** Para local, cambiar la URL.

**Pendiente de Nazho:** Site URL y redirect de producción en Supabase Auth; SMTP propio (Resend) para el magic link.

## 2026-09-08 · Estructura: Borrador → Producción → Publicado

**Una sola base de piezas** (docs/estructura.md §1). Lo que cambia por formato son las sub-etapas que aplican (`subetapas(formato)` en código), no la tabla. Historias se quedan en su tabla hasta operar el paquete semanal una vez.

**Estados renombrados** (migración 009): `borrador · redaccion · grabacion · diseno · listo · programada · publicada · archivada · en_trial`. `listo` + `programada` = buffer. Tope de 10 = `redaccion` + `grabacion`. Hipótesis exigida desde `grabacion` (Claude la escribe en redacción). Mariela ve desde `grabacion` y mueve `grabacion → diseno → listo → programada`.

**Menú del owner:** Inicio · Ideas · Calendario ── Historias · Reels · Carruseles · Artículos · Newsletter ── Formatos · Cuentas en seguimiento · Todas las piezas. Mariela: Cola · Calendario ── las pestañas ── Formatos. Equipo y Sistemas se abren desde Inicio.

**Ideas = borradores.** Captura de una línea, notas, «Producir» con formato → redacción en su pestaña. **Pestañas por formato:** columnas de producción (omiten Grabación cuando no aplica) y Publicados con views, likes, saves y multiplicador. **Calendario semanal** por fecha objetivo y de publicación. **Cuentas en seguimiento:** tabla `cuentas_referencia` ligera (el radar la scrapea en v2).

**Inicio con cuatro bloques:** crecimiento de cuenta (sensores vacíos hasta los jobs), metas de la semana, buffer con semáforo, cierre del día (bitácora del equipo + máquina).

**MCP:** enums de estado actualizados; nuevas `listar_cuentas` y `seguir_cuenta`. 17 tools.

## 2026-09-09 · Redacción por entrevista: skill antes que rutina

**Nazho propuso un skill para Cowork en vez de la cola de solicitudes + rutina en la nube** (docs/redaccion.md §2). Se adopta como primer paso: el criterio vive en Claude, la app solo guarda el stream. La cola y la rutina quedan como segunda fase si hace falta operar desde el teléfono sin abrir Claude.

**Skill `entrevistador-redaccion`** en `skills/` del repo (se sube a Cowork como zip). Cuatro modos: capturar, entrevistar (2–3 preguntas, máximo 2 rondas), redactar (delega en el guionista del formato, fidelidad `mis_palabras`, hipótesis obligatoria, revisión contra VOZ-MAESTRA), cerrar. Nombre según la doctrina `[rol]-[dominio]`; Nazho puede bautizarlo.

**Migración 010:** `pensamientos.pieza_id` (las ideas ya son piezas), `guion_versiones` y `guardar_guion` que versiona y actualiza la pieza. MCP: `stream_de`, `agregar_pensamiento`, `guardar_guion` (20 tools).

**Pendiente:** verificar que Cowork acepte el conector MCP con Bearer (hallazgo 8); si exige OAuth, construir el shim. En Claude Code el skill ya opera.

## 2026-09-13 · Stream de redacción en la web

**El conector MCP dio 401 porque el perfil de Nazho en producción nunca tuvo key.** Las corridas del 8-sep las hizo `prueba-mcp` con usuarios temporales. La key la genera Nazho con `scripts/api-key.mjs` y la exporta como `CONTENTOS_MCP_KEY` en `env` de `~/.claude/settings.json`; Claude no la toca. Con eso, el skill `entrevistador-redaccion` ya dejó su primera ronda de preguntas en IDE-04 desde Claude Code.

**Pantalla de Redacción, primera parte (docs/redaccion.md §4).** En `/piezas/[id]`, para el owner: bloque «Stream de redacción» cuando la pieza está en borrador o redacción, con las entradas en orden (voz, texto, link, pregunta, respuesta), caja para responder debajo de cada pregunta sin contestar, y captura de texto o link. Fuera de esos estados el stream queda plegado y de solo lectura. El guion muestra su versión vigente y un historial desplegable; «Volver a esta versión» no borra: entra como versión nueva con la instrucción `volver a vN`. En Ideas, cada borrador dice cuántas entradas tiene y si hay preguntas de Claude sin contestar (ámbar).

**Lo que no entra todavía:** grabador de voz en el navegador (depende del job `voz_transcribir`), cola de `solicitudes` y rutina en la nube (segunda fase, decisión del 9-sep), botón de voz en Inicio. Las escrituras humanas desde la web no dejan corrida; solo las de jobs y tools.

## 2026-09-15 · Base de reels importada desde Notion

**188 reels de Microcontenidos (formato Reel/Short) entraron a `piezas`** con `scripts/importar-reels.mjs`, idempotente por `notion_url`. Los guiones (cuerpo de la página) se copiaron literales para los 120 no archivados; los 68 archivados entraron solo con propiedades. Métricas de Notion → `metricas(fuente='notion')`. Notion queda intacto.

**Mapa de estados:** Para grabar → `grabacion` con `programa_aprobado` (los 30 CRI) · Diseño o edición → `diseno` · Buffer → `listo` · En trial → `en_trial` · Publicada con URL → `publicada` · **Publicada sin URL → `archivada`** con nota «Publicada según Notion el …, sin URL»: la base exige URL para publicar y 14 videos viejos no la tenían. Con la URL vuelven a Publicados. Archivado → `archivada`.

**Hipótesis legado.** El texto libre de Notion se guarda como `{texto, campo: multiplicador, legado: true}`, que pasa el check sin ser resoluble. Las 15 piezas en producción sin texto quedan con `requiere_hipotesis` y se pintan en rojo en la lista.

**IDs.** El check de `id_publico` no admite dígitos en el prefijo, así que FC01…FC05 se traducen: FC01→BRE (Brand Reels), FC02→ROB (Róbate), FC03→RMK (Robándole el marketing), FC04→VIN (Verdades Incómodas), FC05→CHK (Checklist relámpago); los frentes `-A…-E` se conservan. Los NUM-08…11 repetidos en Notion quedaron como NUM-08b…11b (HANDOFF §6). El ID original va en `notas`.

**Formato yap** para los CRI (FC-08) y los YAP-xx; el resto, reel. `serie` sale del prefijo (Criterio, NUM, Brand Reels, Róbate, Robándole el marketing, Verdades Incómodas, Checklist relámpago, Yap, Serie Fundador, Así uso Claude, Seang).

**Pestaña Reels como base de datos.** Vista Lista por defecto (búsqueda, etapa, serie, responsable, faltantes: sin hipótesis, sin guion, sin responsable), más Tablero, Publicados y Archivo. Cada fila muestra tarea abierta, siguiente paso del checklist, responsable y qué le falta. **Cola de Mariela en dos columnas** para escritorio: Mariela trabaja desde computadora, no desde el teléfono. El contenedor de la app pasa a 80 rem.

**Pendiente de este bloque:** las 30 ideas IDE-xx importadas el 7-sep del Banco de ideas se traslapan en parte con reels ahora importados (por ejemplo IDE-06 y BRE-03). Se resuelven a mano cuando se toque cada una; no se borran solas.

## 2026-09-15 · Piezas limpias (migración 011, aplicada en producción)

**Nazho pidió una pieza mínima y relaciones limpias** (docs/campos.md). Queda con: `tipo` (antes `formato`: reel, carrusel, artículo…), `estado`, `fecha_objetivo`, `responsable_id`, `contenido` (antes `guion`: guion, copy, artículo o edición, editable en la app y versionado en `contenido_versiones`), `notas` (absorbe la spec visual y cualquier anotación), `etiquetas` (libres: bugs, temas, origen), `url` + `plataforma` (siempre a la vista; Mariela la captura en cuanto existe con `guardar_url`), `etapa_embudo`, `serie`, `titulo`, `id_publico`. Por el sistema se quedan `comunidad_id` (unidad raíz), `programa_aprobado` (tope de 10) y `notion_url` (idempotencia del import mientras Notion exista).

**Se fueron:** `cta`, `fidelidad`, `spec_visual`, `requiere_hipotesis` (se calcula: hipótesis nula), `etapa_legado`, `idea_id`, `formato_sugerido` (→ notas), `origen` (→ etiqueta), el `checklist` de tareas y la tabla `ideas`. Respaldo en `respaldo_20260915_piezas`, `_tareas` y `_guion_versiones`; se borran al cerrar 1.0.

**Hipótesis con tabla propia.** `hipotesis` (texto, campo, número, fecha, estado abierta · verdadera · falsa · sin_datos, veredicto). Varias piezas apuntan a la misma hipótesis; el mismo texto en varias piezas se fundió en una fila (99 hipótesis, 3 resolubles hoy). La regla 1 sigue en el esquema: de grabación en adelante hace falta `hipotesis_id`, salvo piezas con etiqueta `legado`. `crear_hipotesis` exige campo, número y fecha futura. El trabajo fino de hipótesis (resolver, veredicto, pantalla) es el paso 2.

**Format Cards se llaman `formatos`** (la pieza apunta con `formato_id`). Sus campos propios son el paso 2.

**Assets con tabla propia.** `assets` (pieza, ruta, carpeta, nombre, quién) se alimenta con un trigger sobre Storage; subir un RAW crea la tarea «editar» sin webhook. El endpoint `api/hooks/storage` se eliminó.

**MCP:** `crear_pieza` y `actualizar_pieza` hablan de `tipo`, `formato` (card), `contenido`, `etiquetas`, `hipotesis` o `hipotesis_id`; `guardar_contenido` sustituye a `guardar_guion`; nueva `listar_hipotesis`. 23 tools. El skill de entrevista se actualizó. Prueba `prueba:mcp` contra producción: 21/21 en verde.

## 2026-09-16 · Paso 2: formatos con ficha e hipótesis con ciclo de vida (migración 012)

**Formatos recuperan lo que en Notion era columna:** `serie_propia`, `duracion`, `recompensa`, `cadencia` e `hipotesis_formato` (la que se resuelve con ocho episodios, no con una pieza). Se cargaron para las seis cards desde la base de Notion; la hipótesis de formato quedó escrita para FC-01, FC-02, FC-04 y FC-08 y vacía en FC-03 y FC-05. Los rollups no se guardan: `resumen_formato(id)` calcula episodios, publicadas, multiplicador promedio, views y follows con la última lectura de cada pieza. **Una pieza hereda la serie propia del formato** al elegirlo, si no traía serie (trigger). Pantalla Formatos con cifras, ficha editable por el owner y molde plegado. MCP: `listar_formatos` trae ficha y resumen; nueva `actualizar_formato`.

**Hipótesis con ciclo de vida.** Pantalla `/hipotesis` (owner y viewer) en cuatro vistas: por resolver (abiertas con fecha vencida), abiertas, sin número ni fecha (las 96 heredadas de Notion; «Completar» les pone campo, número y fecha) y resueltas. Cada fila muestra sus piezas y el valor que alcanzó cada una en el campo (`evidencia_hipotesis`; campos con sensor: multiplicador, views, likes, comentarios, saves, follows). Cerrar como verdadera o falsa exige veredicto; sin datos no. Reabrir vuelve a abierta. En el detalle de pieza el owner liga una hipótesis existente, crea una nueva o la quita. Inicio avisa cuando hay hipótesis vencidas por resolver. MCP: `listar_hipotesis` (con evidencia, `por_resolver`, `incompletas`), `resolver_hipotesis`, `actualizar_hipotesis`. 27 tools.

## 2026-09-16 · La pieza abierta: documento con ficha y camino de estados

**Nazho revisó cuatro acomodos en un canvas de diseño** (Actual, A «documento con ficha», B «mesa de trabajo», C «pestañas») y eligió la A con el camino de estados de la B. Diagnóstico de la anterior: nueve bloques en una columna de 1216 px, barra de siete selects que leía como formulario, el contenido en tercer lugar y la acción principal en un pie pegajoso.

**Lo construido:** arriba, el camino de estados según el tipo (borrador → redacción → grabación si aplica → diseño → listo → programada → publicada) con el paso actual resaltado y «qué sigue» a la derecha (la tarea abierta o la fecha objetivo). A la izquierda, el contenido como documento a 68 caracteres de línea, con versiones, notas plegables, stream plegado y comentarios. A la derecha, la ficha fija: estado, tipo, formato, serie, etapa, fecha y responsable como renglones; hipótesis; URL; tareas con «Asignar»; assets. Las acciones de avanzar y publicar viven en el encabezado. En pantallas menores a 1280 px la ficha baja debajo del contenido. Canvas: https://claude.ai/artifact/UonK1sCiq5ZcLmDMAaVdLR
