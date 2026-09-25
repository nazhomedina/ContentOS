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

## 2026-09-16 · Series declaradas (migración 013)

**Nazho pidió que la serie deje de ser texto libre.** Ahora hay tabla `series` (nombre único, descripción, activa) con pantalla propia junto a Formatos e Hipótesis: se declaran, se describen, se prenden y se apagan, y se ve cuántas piezas lleva cada una. En la pieza, `series` es una lista (text[]) que se elige como etiquetas entre las series activas; una pieza puede pertenecer a varias. Si una serie se escribe en una pieza y no existía, se declara sola. Renombrar una serie la renombra en todas las piezas y en el formato que la declara como serie propia. Al elegir formato, la pieza suma la serie propia del formato si no la trae. Las 11 series que había en piezas y formatos quedaron declaradas y activas. MCP: `listar_series`, `guardar_serie`; `crear_pieza` y `actualizar_pieza` hablan de `series`; `listar_piezas` filtra por serie. 29 tools.

## 2026-09-16 · Reels: carriles limpios

**La pestaña de un tipo abre en Producción**, cuatro carriles por etapa (Redacción · Grabación · Diseño · Listo, o tres si el tipo no se graba) con el conteo en la cabecera y **solo el título por fila**. Nazho lo pidió así: «lo único relevante es saber en dónde estamos; con el título y la cantidad de piezas por columna es más que suficiente». Arriba, una sola línea dice cómo va la semana contra `metas_semana` (publicadas de la meta · listas para programar · en producción) y una fila de chips filtra por serie. Nada más.

**Una señal, no seis columnas.** Cada fila lleva a lo sumo un punto de color: rojo si la tarea está bloqueada o vencida o la pieza no tiene hipótesis (salvo `legado`), ámbar si vence esta semana, azul si está en curso o tiene RAW. Sin punto, va bien. El detalle (responsable, tarea, faltantes, fechas) vive en la vista Lista, que conserva la tabla y los filtros.

**Frentes y series se agrupan.** Los frentes `-A…-E` cuentan bajo su pieza madre («3 frentes», con enlace a la lista filtrada); una serie con ocho o más piezas en el mismo carril se muestra como grupo con las primeras cinco y «y N más». Así 104 filas se leen como unos veinte renglones sin ocultar nada. Diseño en `components/formato/carriles.tsx`; canvas: https://claude.ai/artifact/TiVXb9nvu8LEn1rFGdQPLg.

## 2026-09-16 · Lead magnets (migración 014, aplicada en producción)

**Los recursos tienen pantalla y tools.** `/recursos` en el menú, debajo de Historias, para los tres roles: Mariela y los viewers leen, Nazho edita. Cada lead magnet muestra su keyword del DM, la liga en go.folklore.mx, el tag de Kit, el estado (idea · en producción · publicado en Go · contado en historia · retirado), los leads con fecha de corte y las historias que lo han empujado con views, replies y DMs sumados (`resumen_recurso`, calculado, no guardado). La tarjeta de historia enlaza al recurso. MCP: `listar_recursos` y `guardar_recurso` (30 tools en total).

**La URL pública no se guarda:** es `https://go.folklore.mx/<slug_go>`, se deriva. Se agregan `tipo` (resumen de video, megaprompt, mini app…) y `descripcion`; nada más.

**Los leads se anotan a mano** con número y fecha de corte (`registrar_leads`, fuente `manual`, quién lo anotó) hasta que corra `go_leads` en n8n, que escribirá fuente `job`. Sin dato se dice «sin dato», no cero.

**Datos:** RORY, 90 y BEAST cargados desde la colección «Recursos de historias» de Notion, con los tags de Kit verificados contra la cuenta (22364040 · 22364041 · 22364042 = go/rory-sutherland · go/marca-personal-90-dias · go/mrbeast-negocios). El cuarto registro de Notion («If you aren't selling these 4 things») entra como idea sin liga.

## 2026-09-16 · Newsletter CRITERIO (migración 015, aplicada en producción)

**La edición es una pieza `newsletter` con formato FC-09.** FC-09 «CRITERIO (newsletter semanal)» entra a `formatos` con la spec canónica (6 secciones, checklist de 8 puntos, reglas editoriales, puente con Kit) como molde: Claude lo lee con `listar_formatos(con_molde)` antes de redactar. La serie Criterio se hereda del formato, igual que en los yaps de FC-08: CRITERIO es una sola serie con dos contenedores.

**El número de edición vive en el título** («Criterio #002 — …») y en el `id_publico` (NEW-02); no hay columna nueva. `crear_pieza` con tipo newsletter antepone la siguiente edición si el título no la trae (`siguiente_edicion_criterio`, leída de los títulos), pone FC-09 y el viernes siguiente como fecha objetivo (`viernes_siguiente`). La pestaña Newsletter muestra esa fecha junto al título en los carriles.

**El checklist de 8 puntos no es una tarea:** se corre antes de pasar a diseño y vive en el molde del formato. Los checklists por tarea se eliminaron el 15-sep y no vuelven.

**Puente con Kit sin regreso** (docs/newsletter.md): el contenido vive aquí versionado; Claude crea el borrador en Kit por su conector; Nazho programa en la interfaz de Kit; al enviarse, publicada con URL. Estados del newsletter: redacción → diseño (en Kit) → listo (programada) → publicada.

**Datos:** NEW-01 «Criterio #001 — Marca da dirección. Marketing da tracción.» registrada para el viernes 18 (en diseño = cargada en Kit, pasa a listo al programarse) con su contenido (versión 1), el id del borrador de Kit en notas y una hipótesis propuesta por Claude que Nazho puede cambiar: ≥ 5 respuestas al correo al 25-sep (`replies`). NEW-02 «Si tienes que explicar tu diferencia, no eres diferente.» en redacción con tres preguntas de entrevista en el stream (ronda 1).

## 2026-09-16 · Newsletter: pantalla propia y día de envío (migración 016, aplicada en producción)

**La pestaña Newsletter deja los carriles de producción.** Nazho: «un newsletter no requiere producción; la redacción sucede en Claude con el skill. Aquí hay que ver los que tenemos en borrador y listos para publicar, y una vista de calendario para agendar hacia adelante». Se eligió la Opción A del canvas (https://claude.ai/artifact/4wQCYiekYC59M3mXKU8Euu): izquierda, las ediciones por lo que les falta; derecha, los próximos ocho envíos con hueco para agendar. Sin calendario mensual: el newsletter es semanal y seis de siete columnas quedarían vacías.

**El día de envío no está fijo en viernes.** Vive en `formatos.dia_envio` (FC-09 = 5 hoy; Nazho contempla martes) y se cambia desde la pantalla o con `actualizar_formato`. `siguiente_envio(formato)` sustituye a `viernes_siguiente()`; `crear_pieza` lo usa como fecha por defecto. Cambiar el día recorre los próximos envíos y las ediciones nuevas; las agendadas conservan su fecha.

**Estados del newsletter, ahora honestos:** redacción → diseño («En Kit», cargada como borrador) → listo (programada en Kit) → publicada. NEW-01 pasó de listo a diseño porque está en Kit sin programar; la pantalla lo señala en ámbar. «Agendar» crea la edición como borrador con el siguiente número en esa fecha (`agendarEdicion`).

## 2026-09-16 · Historias desde la web

**Nazho ya crea y edita historias sin pasar por MCP.** En Historias, «Nueva historia» (día, serie, registro, copy, keyword, recurso, pieza amplificada) la deja en propuesta; «Aprobar la semana · N» vive también ahí, no solo en Inicio. En cada tarjeta el owner edita (lápiz) o descarta (x); descartar borra la tarea «publicar» si seguía abierta, y cambiar el día recorre su vencimiento.

**Mariela sube el asset desde la tarjeta.** Cuando la historia es producida y no tiene asset, la tarjeta ofrece «Subir asset» y avisa en ámbar que falta; el archivo va a `assets/historias/{semana}/{id}/` (la política de Storage del editor ya lo permitía) y queda en `asset_url`. Mientras esté en propuesta, la tarjeta dice que Mariela lo sube al aprobarse. Sin migración: todo cabía en las políticas existentes.

## 2026-09-16 · Claridad sobre Mariela

**Desde Inicio, sin abrir nada más, Nazho contesta «¿en qué está Mariela y qué le sigue?».** El bloque Equipo muestra por persona: *Ahora* (la tarea en curso con su pieza o historia, o el último archivo que subió hoy), *Sigue* (la siguiente tarea abierta por vencimiento) y el conteo de abiertas, vencidas y bloqueadas, además de la bitácora de hoy y de ayer que ya estaba. La pantalla Equipo abre con el mismo bloque, con la nota del bloqueo si la hay. Un solo componente (`AhoraPersona`) alimenta ambas; sin migración.

**No hay «paso del checklist que sigue»:** los checklists por tarea se eliminaron el 15-sep. Lo que sigue es la tarea siguiente, no un punto dentro de ella.

## 2026-09-16 · Historias: la semana en filas, buffer y tipo (migración 017, aplicada en producción)

**La pantalla deja las siete columnas.** Nazho: «se aprieta mucho; lo que busco es delegarle a Mariela la publicación de historias: desde ideas concretas con DM para lead magnet hasta frases, reflexiones o cualquier cosa que genere interacción». Se eligió la Opción A del canvas (https://claude.ai/artifact/RqyyGoMDVVKAkwaQzsJ3vp): un bloque por día de lunes a viernes y el fin de semana en uno; hoy se abre con el copy completo, el asset y los botones; los demás días son una fila por historia; los días vacíos dicen «Sin historia · Tomar del buffer · Proponer una».

**Hay buffer.** Una historia puede nacer sin semana ni día mientras esté en propuesta (`semana` y `dia` ahora admiten nulo, con check: aprobada en adelante exige fecha). `agendar_historia` la pone en un día, la aprueba y crea la tarea «publicar»; `desagendar_historia` la devuelve al buffer. Por MCP, `proponer_historias` sin semana manda al buffer y `agendar_historia` agenda (31 tools). Mariela no ve el buffer: su política de lectura sigue en aprobada · programada · publicada.

**«Serie» pasa a «tipo».** La serie (te_lo_resumo, archivo_folklore, criterio_viernes, espontánea) no decía qué busca la historia. Ahora `historias.tipo` ∈ lead_magnet (DM con keyword y recurso) · amplificacion (de una pieza) · frase · pregunta · archivo. Los datos se tradujeron (te_lo_resumo → lead_magnet, archivo_folklore → archivo, criterio_viernes → amplificacion, espontanea → frase) y `proponer_historias` sigue aceptando `serie` como alias. El registro (orgánico · producido) se queda: dice si Mariela diseña un asset. Nazho vio la propuesta en el canvas y eligió el diseño que la asume; si prefiere otra taxonomía, es un `update` sobre `tipo` y el check.

## 2026-09-16 · Entrar con código, sin correo

**Nazho no quiere instalar Resend.** El login pasa a correo + código: el código es una contraseña de Supabase Auth que Nazho genera en la pantalla **Accesos** (menú, solo owner) y le pasa a la persona en persona. Se muestra una sola vez; uno nuevo reemplaza al anterior. Dar de alta a alguien también se hace ahí (lista blanca `perfiles_permitidos`); al generar su primer código se crea el usuario de Auth y el trigger le da su perfil. Cada código generado deja una fila en `corridas` (`generar_codigo`).

**El enlace por correo queda como respaldo** («¿Sin código? Recibir un enlace por correo»): con el SMTP de fábrica solo llega a los miembros del proyecto de Supabase, o sea a Nazho. `scripts/enlace-acceso.mjs` sigue existiendo por si hace falta un enlace sin correo. El punto 1 del plan de cierre (SMTP con Resend) queda sin efecto.

## 2026-09-16 · Inicio: tablero de números

**Inicio es el tablero de Nazho; Mariela entra por su Cola.** Se eligió la Opción C del canvas (https://claude.ai/artifact/DUcWmeLLPCZf5QYD8SoyvA): cuatro cifras arriba (publicadas contra la meta, buffer con semáforo, en producción con grabación y diseño, y cuántas cosas esperan su mano), los tres sensores de crecimiento (que dicen «sin sensor» hasta que corran los jobs), las metas de la semana con sus huecos, y la máquina con los sistemas, los latidos y una línea por editora.

**«Esperan tu mano» se calcula, no se declara.** Junta en una lista, solo cuando hay algo: historias por aprobar, bloqueos de Mariela, ediciones en Kit por programar, preguntas del stream sin contestar, tareas de grabar e hipótesis vencidas. Antes eran tres bloques distintos que aparecían y desaparecían. La lista del buffer ya no está en Inicio: la cifra enlaza a la lista de Reels.

## 2026-09-17 · El stream sale de la plataforma (migración 018, aplicada en producción)

**Nazho: «retira el stream del sistema; lo voy a dejar como un skill en Claude Cowork».** La entrevista (preguntas, respuestas, notas de voz) ya no se guarda en la app: pasa en el chat de Cowork y el resultado entra como versión de contenido con `guardar_contenido`. Se retiran el bloque «Stream de redacción» de la pieza abierta, las señales de «preguntas sin responder» (Ideas, Inicio, Newsletter), la acción `agregarAlStream`, las tools `stream_de` y `agregar_pensamiento` (quedan 29) y la carpeta `skills/entrevistador-redaccion` del repo (el skill vive en Cowork). La tabla `pensamientos` queda como `respaldo_20260917_pensamientos` con sus 11 filas y se borra al cerrar 1.0. Las tres preguntas de Criterio #002 se copiaron a las notas de NEW-02 para contestarlas en Cowork. docs/redaccion.md queda como historia.

## 2026-09-23 · Formatos como biblioteca (migración 019, aplicada en producción)

**Nazho: «los formatos son una base de datos que usamos para generar tracción y organizar la producción; quiero una galería visual, organizada por etiquetas, que se alimente al analizar cuentas de terceros y tenga vínculo con las hipótesis».** Canvas: https://claude.ai/artifact/SUX9ow8Zf83XXQecYnXobM.

**Modelo.** `formatos.etiquetas` (libres; la galería las agrupa en cuatro facetas: dónde se graba, quién aparece, mecánica, duración; el resto cae en «Otras»), `formatos.portada` (ruta en Storage `formatos/{id}/`), `formatos.hipotesis_id` (la tesis del formato es una fila real de `hipotesis`, resoluble con campo, número y fecha; `hipotesis_formato` texto desapareció y sus siete textos migraron a filas incompletas) y la tabla `referencias` (formato, cuenta, url o pieza propia, multiplicador, views, duración, nota). Las doce referencias que vivían en markdown dentro de los moldes se extrajeron a la tabla con `scripts/importar-referencias.mjs`. Las etiquetas iniciales de los siete formatos se leyeron de cada molde; Nazho las ajusta desde la ficha.

**Pantalla.** `/formatos` es una galería de tarjetas (portada, estado, multiplicador, episodios, serie, etiquetas y la señal de la hipótesis: verde verdadera, ámbar sin número o vencida, rojo sin hipótesis o falsa) con filtros por faceta y «Nuevo formato». `/formatos/[id]` es la ficha: portada, camino de estados, etiquetas, campos, cifras, referencias con alta, hipótesis del formato (escribir, completar, resolver) y lo que dicen las de sus episodios, episodios y molde plegado.

**MCP (31 tools).** `crear_formato` (código FC-NN automático, nace detectado) y `agregar_referencia` son la vía para que Cowork alimente la biblioteca al analizar cuentas; `listar_formatos` filtra por etiqueta y trae hipótesis y referencias; `actualizar_formato` acepta etiquetas y la hipótesis del formato. La moratoria de «no crear cards» deja de ser regla del sistema: es decisión de Nazho.

## 2026-09-24 · La máquina: jobs en la app, nada en n8n, rituales a mano (migración 020, aplicada en producción)

**Nazho decidió:** n8n queda para sus otros procesos, no para ContentOS; Apify para todo lo que sea Instagram (la cuenta es business, la Graph API queda para después); y ninguna rutina automática de Claude: «difícilmente tengo la computadora abierta; me quedo con rituales que yo corra a mano».

**Dónde corre cada cosa** (docs/jobs.md): los cuatro sensores corren en la app como Vercel Cron (`/api/cron/{job}`, protegidos con `CRON_SECRET`, `maxDuration` 300 s): seguidores y métricas de piezas por Apify, suscriptores por Kit v4, leads leyendo el Supabase de Folklore Leads. `recalcular_multiplicadores` corre en pg_cron dentro de Supabase a las 03:00. Cada job abre su fila en `corridas` en estado `corriendo` y la cierra con ok, vacío o error. En Sistemas hay una lista de latidos con «Correr ahora» para el owner, y dice qué variable falta en Vercel cuando un job no puede correr.

**Los rituales no son jobs.** `sprint_lunes` y `review_viernes` siguen registrados con cadencia de 7 días, pero su evidencia son las corridas de las herramientas que Nazho usa desde Cowork (`fuentes`: proponer_historias, agendar_historia, crear_pieza; resolver_hipotesis, registrar_metrica_manual, declarar_hueco). Si una semana no corre el ritual, el latido se pone rojo solo. `espejo_md` se apagó. Los grafos del Nodo ya no nombran a n8n ni a tareas de nube: dicen app (cron), pg_cron o Claude desde Cowork.

**Variables pendientes de Nazho en Vercel:** `CRON_SECRET`, `APIFY_TOKEN`, `KIT_API_KEY`, `FOLKLORE_LEADS_URL`, `FOLKLORE_LEADS_SERVICE_KEY`. Hasta entonces los cuatro sensores siguen en rojo y lo dicen.

## 2026-09-24 · Cierre de v1.0

- Se borran las tablas `respaldo_20260915_*` y `respaldo_20260917_pensamientos` (migración 023). Lo que valía ya vive en las tablas actuales.
- Tag `v1.0` en git. Desde aquí el trabajo es operar: cola de Mariela, sensores diarios, rituales desde Cowork por MCP. No hay desarrollo pendiente en la plataforma.

## 2026-09-24 · Identidad dentro de ContentOS

- La verdad universal de quién es Nazho y cómo escribe vive en la tabla `identidad` (siete filas: quien-soy, audiencia, postura, voz, oferta, reglas, evidencia), con historial en `identidad_versiones` (migración 024). Seed inicial desde `docs/identidad/*.md`.
- Se lee desde la app (`/identidad`, todos los roles), por MCP (`leer_identidad`) y por HTTP para clientes sin MCP como Grok (`/api/identidad`, `/api/identidad/{clave}.md`, `/api/identidad.md`) con la misma key del MCP. Se escribe solo por MCP y solo owner (`actualizar_identidad`), con motivo obligatorio; cada cambio guarda la versión anterior y deja corrida.
- Los skills de Cowork leen `voz` y `reglas` antes de redactar y `audiencia` y `postura` antes de planear. La identidad no guarda estado ni aprendizajes de piezas: eso sigue en hipótesis, veredictos y notas.

## 2026-09-25 · El tablero de Mariela: tres bolsas, no una cola

- `/cola` deja de ser una lista de tareas por urgencia y pasa a ser el tablero de Mariela: **objetivos de la semana** arriba (cuota 3 reels · 2 carruseles · 4 días de historias · 1 newsletter, con publicadas y programadas) y **una sola tabla** con tres bolsas por chip: *Listo para publicar* (el buffer del que sale la meta), *Para trabajar* (lo grabado por Nazho y lo escrito con texto final: piezas en `diseno`) y *En mis manos* (lo que ella tomó). Un filtro por tipo cruza las tres.
- Dos verbos en Listo, **Programar** (fecha) y **Publicada** (cierra; pide URL solo si la pieza la necesita), y uno en cada otra bolsa: **Tomar** y **Lista**. «Agendar» y «Copiar» desaparecen como acciones: copiar el texto de una historia es un icono junto al texto.
- Cada botón deja registro en `bitacora` con `origen = 'auto'` (RPCs `tomar_pieza`, `pieza_lista`, `programar_pieza`, `publicar_desde_tablero`, `publicar_historia`; migración 025). **Mi día** muestra automáticos y manuales; sigue en ámbar hasta que ella declara algo a mano.
- La editora ahora puede leer `cuota_semana` y `tablero_material()` (piezas en diseño con quién las tiene). Las tareas siguen existiendo debajo; ella ya no las ve como lista.
- La prueba e2e se puso al día: las páginas de la semana demo se consultan con `?semana=2026-09-07`.

## 2026-09-25 · CRITERIO es el newsletter y vive aparte

- El newsletter deja de ser el formato FC-09 y la serie «Criterio». Su casa es la tabla `newsletter` (una fila: promesa, día de envío, cadencia, plataforma, dominio, receta, hipótesis). FC-09 se borró de la biblioteca; su molde es la receta. Migración 026.
- Las ediciones siguen siendo piezas tipo newsletter (contenido versionado, hipótesis, tareas, cuota), pero el esquema les prohíbe formato y serie (`newsletter_sin_formato`, `newsletter_sin_serie`).
- La serie de los 30 yaps de postura se llamaba «Criterio»; ahora se llama **Postura** (nombre elegido por Claude a falta de otro; se cambia con `guardar_serie`). Los id_publico CRI-NN se conservan. La serie duplicada «CRITERIO» se borró.
- Derivadas: `piezas.madre_id` liga el reel hablado o el carrusel del caso con su edición. MCP: `leer_newsletter`, `actualizar_newsletter`, y `madre` en `crear_pieza` / `actualizar_pieza`. `actualizar_formato` ya no tiene día de envío.
