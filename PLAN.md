# ContentOS — Plan de trabajo del repo

**Fecha:** 2026-09-06, actualizado 2026-09-07 · **Repo:** `~/Repos/ContentOS`

> **Reencuadre del 2026-09-07:** se construyó la capa de sistemas «el Nodo» (`docs/nodo.md`) y después se simplificó todo (`docs/simplificacion.md`): una sola base de piezas que nacen como idea, seis pantallas (Inicio, Piezas, Formatos, Sistemas, Cola, Historias), tema claro con menú lateral, MCP con 15 herramientas. El estado vigente está en `docs/decisiones.md`.
**Fuentes leídas para este plan:**
- `HANDOFF-taller-contenido.md` (este repo) — versión operativa
- `03 ÁREAS/Contenidos/_sistema/taller-contenido/taller-contenido-diseno-2026-09-06.html` — diseño completo, incluye el SQL del núcleo (§4)
- `03 ÁREAS/Contenidos/_sistema/taller-contenido/NOMENCLATURA-sistema-contenido.html` — glosario vigente (manda sobre cualquier otro doc)
- `_Claude/Creaciones/design-systems/nazho-medina/DESIGN.md` — tokens
- `_Claude/Creaciones/format-lab/cards/FC-0{1..8}.md` — moldes para el seed

---

## 0. Qué se construye, en una página

Una app Next.js + Supabase que sustituye a Notion como capa operativa de la marca personal. Tres capas, una frontera:

| Capa | Guarda | Quién la opera |
|---|---|---|
| Claude (skills, VOZ-MAESTRA) | criterio | Nazho |
| App + MCP `taller` | estado, cola, datos, latidos | Nazho por MCP · Mariela por web |
| n8n | movimiento de datos externos (Apify, Kit, Go) | cron |

**La app no llama a ningún LLM.** Las reglas que antes eran documentos son restricciones del esquema: hipótesis resoluble, etapa del embudo, URL para publicar, tope de 10 en producción, latido por corrida.

**Jerarquía de datos:** `comunidad → idea → pieza → tarea`; al lado `historias`, `recursos`, `metricas`, `format_cards`, `corridas`, `indicadores_semana`.

**Orden de entrega:** Sprint 1 = cola de Mariela (3 pantallas) + import de Notion. Sprint 2 = MCP (13 tools) + pantallas de Nazho + jobs n8n. Radar (v2) y voz (v3) se documentan en migraciones que no se aplican.

---

## 1. Hallazgos del análisis

Lo que el handoff y el diseño no resuelven, o resuelven distinto. Cada uno trae la decisión que tomo por defecto para no frenar; Nazho corrige si no coincide.

### Bloquean el sprint 1 (esquema)

1. **`metricas.fuente` no admite `pendiente` ni `notion`.** El check del diseño es `('apify','tikhub','manual','yt_analytics','kit')`, pero `marcar_publicada` inserta `fuente='pendiente'` y el import inserta `fuente='notion'`. → Ampliar el check a los siete valores.
2. **El check de hipótesis solo valida llaves, no valores.** `hipotesis ? 'numero'` acepta `{"numero": null}`. Eso hace innecesaria la «columna legado que relaja el check» del §6, pero deja la regla de resolubilidad sin dientes. → Check real: `(hipotesis->>'legado')::boolean is true OR (campo, numero y fecha no nulos, numero numérico, fecha ISO)`. `legado` vive **dentro del JSON**, no como columna aparte. `crear_pieza_validada` valida lo mismo y devuelve el mensaje en español.
3. **Columnas mencionadas en el handoff que no están en el SQL del diseño:** `piezas.programa_aprobado boolean`, `piezas.requiere_hipotesis boolean`, `piezas.etapa_legado boolean`, `metricas.multiplicador numeric`, `recursos.leads int`. Tablas que faltan: `comentarios(pieza_id, autor, texto)`, `sistemas_registrados(nombre, esperado_cada interval)`. → Todas entran en `001_nucleo.sql`.
4. **El tope de 10 choca con el import.** El §6 importa 26 piezas (10 Buffer + 16 Diseño sin hipótesis) en `para_producir` con `programa_aprobado=false`, más las que ya estaban en «Para producir». El trigger del §2 las rechazaría. → El trigger respeta un GUC `app.import = 'on'` que solo el script de import activa. El excedente heredado queda visible en rojo en el kanban (el diseño ya lo prevé) y el trigger impide que **entren más** hasta que baje de 10.
5. **`marcar_publicada`: desde qué estado.** El detalle de pieza dice «Falta pasar por buffer», y la cadena del editor es `…→ buffer → programada → publicada`. → Se acepta desde `buffer` y `programada` (una historia o un reel se publican en vivo sin programar). Desde `edicion` se rechaza con mensaje.
6. **Orden de FKs.** `tareas.historia_id` referencia `historias`, que se crea después; `ideas.video_origen_id` referencia una tabla de v2. → `alter table … add constraint` al final de 001 para `tareas`; `ideas.video_origen_id` sin FK hasta `010_radar.sql`.

### Decidir antes del sprint 2

7. **Impersonación en el MCP.** El §3 firma un JWT con `SUPABASE_JWT_SECRET` (que además no está en la lista de variables del §1). Los proyectos nuevos de Supabase usan llaves de firma asimétricas; el secreto HS256 «legacy» puede o no estar disponible. → Verificar el día que se cree el proyecto. Plan B si no hay secreto: el route handler usa el cliente `service_role` y ejecuta cada tool dentro de una transacción con `set local role authenticated; set local request.jwt.claims = '{"sub": "<user_id>", "role": "authenticated"}'` vía una función `mcp_ejecutar(user_id, sql)`. La RLS sigue aplicando.
8. **Cowork y el Bearer estático.** Claude Code acepta `headers` en `.mcp.json`; el conector remoto de Cowork/claude.ai favorece OAuth. → Construir primero para Claude Code (criterio de cierre alcanzable), y verificar en Cowork. Si exige OAuth, se añade un endpoint mínimo de OAuth 2.1 sobre las mismas API keys; no cambia el modelo.
9. **Streamable HTTP en Vercel.** Serverless = sin estado. → Transporte en modo *stateless* (`sessionIdGenerator: undefined`), sin SSE de reanudación. Una instancia de `McpServer` por request.
10. **Multiplicador con pocos datos.** Solo 15 de 229 piezas tienen views en Notion; la mediana de «las 12 anteriores del mismo formato» tendrá n<12 durante meses. → La función devuelve `null` si n<3 y guarda `n` junto al valor. Un multiplicador sin n miente.
11. **Import: ¿149 o 229 piezas?** El diseño importa las no archivadas (149) + 30 CRI; el handoff mapea `Archivado→archivada`, o sea todo. → Importar las 229. Notion queda de solo lectura y no conviene volver por lo archivado. Las archivadas no cuentan en nada.
12. **Dos comunidades.** Solo «Fundadores con criterio» tiene contenido. → Seed con una activa y una fila inactiva «(por definir)», como dice el §5. Todo el import cae en la activa.

### Detalles de implementación (no bloquean, no olvidar)

13. Zona horaria `America/Mexico_City` para «Hoy», `semana` (lunes) y `vence`. Fijarla en un solo helper.
14. Storage: la policy de escritura del editor en `assets/piezas/{pieza_id}/*` debe comprobar que la pieza es visible para él (mismo predicado que el select de `piezas`).
15. `pg_cron` para `multiplicador` nocturno y `latidos()`; n8n solo para datos externos. Cada corrida de pg_cron también inserta en `corridas`.
16. El webhook de Storage (`api/hooks/storage`) crea la tarea `editar` cuando llega un RAW (diseño §8). Es parte del sprint 1 aunque el handoff no lo lista en pantallas.
17. El diseño menciona `buying_stage` (Herubel) como campo sugerido. No entra en v1; queda anotado.
18. Herramientas locales: hay Node 22, npm 10 y Vercel CLI 59. **Faltan** `supabase` CLI y `pnpm`. Se usa npm salvo que Nazho prefiera otro; el CLI de Supabase se instala con Homebrew en el sprint 0.

---

## 2. Decisiones de Nazho (antes de tocar código)

Del checklist del §14 más lo que salió arriba. Con la decisión por defecto que uso si no hay respuesta.

| # | Decisión | Default si no hay respuesta | Bloquea |
|---|---|---|---|
| A | Nombre y dominio de la app | Carpeta y paquete `taller-contenido`; el nombre visible es una constante | S1 |
| B | Proyecto Supabase Pro en `us-west-1` | Lo crea Nazho (cuesta dinero); yo preparo migraciones contra local | S1 |
| C | Comunidad 1: ICP, dolor, promesa (tres líneas) | Seed con ICP A de abril, texto placeholder marcado | S1 |
| D | Hallazgos 1–6 | Los defaults de arriba | S1 |
| E | @nazho profesional + Mariela en Business Suite | No bloquea el código; bloquea el criterio de cierre de S1 | cierre S1 |
| F | Token de Apify vigente; TikHub rotado | S2 | S2 |
| G | Hallazgos 7–12 | Los defaults de arriba | S2 |
| H | Registrar en `_Claude/Memory/decisiones.md` | Lo hace Nazho (fuera de este repo) | — |

---

## 3. Estructura objetivo del repo

```
ContentOS/                         # renombrar cuando haya nombre (decisión A)
├── PLAN.md                        # este archivo
├── CLAUDE.md                      # reglas del repo (§0 del handoff)
├── HANDOFF-taller-contenido.md    # se queda como referencia; no se edita
├── docs/
│   ├── decisiones.md              # decisiones del repo con fecha (no confundir con _Claude/Memory/decisiones.md)
│   ├── mcp.md                     # cómo registrar el MCP + curl de prueba (S2)
│   └── jobs-n8n.md                # contrato de cada job: lee → escribe → corridas (S2)
├── app/
│   ├── (auth)/login/
│   ├── (editor)/cola/  (editor)/piezas/[id]/  (editor)/historias/
│   ├── (owner)/ideas/  (owner)/piezas/  (owner)/tablero/
│   ├── api/mcp/route.ts
│   └── api/hooks/{storage,n8n}/route.ts
├── lib/supabase/{client,server,admin}.ts
├── lib/dominio/                   # hipotesis.ts · estados.ts · tope.ts · tiempo.ts (TZ)
├── lib/mcp/{server.ts,auth.ts,tools/*.ts}
├── supabase/
│   ├── config.toml
│   ├── migrations/001_nucleo.sql · 002_rls.sql · 003_funciones.sql · 010_radar.sql (no se aplica)
│   ├── seed.sql
│   └── tests/                     # pgTAP: checks, trigger de tope, transiciones, RLS por rol
├── scripts/importar-notion.ts     # una sola vez, idempotente, escribe corridas
├── scripts/espejo-md.ts
├── .mcp.json                      # registro local del MCP (S2)
└── .env.example
```

Convenciones: SQL y tools en español y `snake_case` (igual que el handoff); rutas en kebab-case; mensajes de error en español legible («Falta hipótesis.fecha»); ninguna escritura automática sin fila en `corridas`; las migraciones no se editan después de aplicadas, se agrega otra.

---

## 4. Orden de construcción

Cada paso dice qué archivos produce y cómo se verifica que quedó. No se avanza al siguiente sin la verificación.

### Sprint 0 — Cimientos (1 día)

| # | Paso | Produce | Verificación |
|---|---|---|---|
| 0.1 ✅ | `CLAUDE.md`, `docs/decisiones.md` con los defaults del §1 | archivos | existen |
| 0.2 ✅ | Instalar `supabase` CLI y arrancar stack local (`supabase init/start`) | `supabase/config.toml` | `supabase status` |
| 0.3 ✅ | `create-next-app` (Next 15, App Router, TS, Tailwind) + shadcn/ui + fuente Gilroy/Outfit + tokens de DESIGN.md en `globals.css` | scaffold | `npm run build` pasa |
| 0.4 ✅ | `.env.example` con las 6 variables (las 5 del handoff + `SUPABASE_JWT_SECRET` condicional) | archivo | — |
| 0.5 ✅ | Nazho crea el proyecto Supabase Pro (decisión B) y el proyecto Vercel; `supabase link` | remoto | `supabase db push --dry-run` |

### Sprint 1 — Cola de Mariela

**Bloque A · Esquema (primero, porque todo depende de él)**

| # | Paso | Produce | Verificación |
|---|---|---|---|
| 1.1 ✅ | `001_nucleo.sql`: las 13 tablas del diseño + `comentarios`, `sistemas_registrados` + columnas del hallazgo 3 + checks corregidos (hallazgos 1, 2) + trigger de tope con GUC de import (4) + `alter` de FKs (6) + `updated_at` por trigger | migración | `supabase db reset` sin error |
| 1.2 ✅ | `002_funciones.sql`: `multiplicador(pieza_id)` con n mínimo (10), `marcar_publicada` (5), `cambiar_estado_pieza`, `crear_pieza_validada`, `asignar_tarea`, `aprobar_historias`, `latidos()`, `rol_actual()` | migración | pgTAP: cada función con su caso feliz y su rechazo |
| 1.3 ✅ | `003_rls.sql` + `004_endurecer.sql`: policies por rol para todas las tablas + Storage bucket `assets` (hallazgo 14) | migración | pgTAP: editor no ve `ideas`, no ve piezas en `para_producir` ajenas, no hace `update` directo en `piezas`; viewer solo publicadas |
| 1.4 ✅ | `seed.sql`: 2 comunidades, 6 Format Cards con molde copiado de `format-lab/cards/`, perfiles Nazho (owner) y Mariela (editor), 7 `sistemas_registrados` | seed | `supabase db reset` deja los conteos esperados |
| 1.5 ✅ | `supabase/pendientes/010_radar.sql` copiado del §9 del handoff, con encabezado «NO APLICAR EN v1» y excluido del `db push` | archivo | no aparece en `supabase migration list` remoto |

Estado 2026-09-07 (tarde): bloques B y C construidos y probados de extremo a extremo con una editora temporal (20/20). Bloque A aplicado al proyecto remoto `gnzsaafoxphmkwvvfmoy` con prueba de humo (tope, hipótesis, publicación, RLS editor) en verde. Falta el correo de Mariela en `perfiles_permitidos`. Nota sobre el orden 001 → 003 → 002: las policies del editor llaman a las funciones `security definer`, así que las funciones deben existir antes. Se numeran como dice el handoff pero se aplican en ese orden (o 002 se escribe con `create or replace` diferido). Se decide en 1.2.

**Bloque B · Auth y base de la app**

| # | Paso | Produce | Verificación |
|---|---|---|---|
| 1.6 ✅ | Magic link, `perfiles` al primer login, middleware que enruta por rol (`editor→/cola`, `owner→/piezas`, `viewer→/tablero`) | `(auth)/login`, `middleware.ts`, `lib/supabase/*` | Mariela entra con su correo y cae en `/cola` |
| 1.7 ✅ | `lib/dominio/`: validación de hipótesis (espejo del check SQL), tabla de transiciones por rol, semáforo del buffer, helper de TZ (13) | módulos + tests unitarios | `npm test` |

**Bloque C · Las tres pantallas (móvil primero)**

| # | Paso | Produce | Verificación |
|---|---|---|---|
| 1.8 ✅ | **Mi cola** `/cola`: grupos Hoy · Esta semana · Bloqueadas · Hechas 7d; encabezado con semáforo; filtros; botón «Bloqueada» con nota obligatoria (server action sobre `tareas`) | pantalla | con seed de tareas de prueba, los grupos y el semáforo cambian según fecha y buffer |
| 1.9 ✅ | **Detalle de pieza** `/piezas/[id]`: cabecera solo lectura con hipótesis en una línea; guion en markdown; spec visual; upload a `assets/piezas/{id}/`; checklist por tipo; comentarios; botón «Publicada» con URL + plataforma → `marcar_publicada`; si no procede, el botón explica por qué | pantalla | publicar desde `edicion` muestra «Falta pasar por buffer»; desde `buffer` deja `publicada`, tarea hecha, `metricas(fuente='pendiente')`, `corridas` |
| 1.10 ✅ | **Historias de la semana** `/historias?semana=`: calendario lun–dom; card con copiar copy / descargar asset / pieza amplificada; acciones «Programada» (hora), «Publicada»; campos views / replies / DMs con `fuente='manual'` | pantalla | el editor solo ve `aprobada|programada|publicada`; el flujo deja `publicada_en` y métricas |
| 1.11 ✅ (falta registrar el webhook en el dashboard) | Webhook de Storage → tarea `editar` al subir RAW (16) | `api/hooks/storage` | subir un archivo crea la tarea en la cola |

**Bloque D · Import de Notion (una sola vez)**

| # | Paso | Produce | Verificación |
|---|---|---|---|
| 1.12 | `scripts/importar-notion.ts` con las reglas del §6: mapa de campos, hipótesis legado, `requiere_hipotesis`, 30 CRI en `para_grabar` con `programa_aprobado=true`, renumeración `NUM-08b…` registrada en `corridas`, ideas, recursos; `app.import='on'` durante la corrida; idempotente por `id_publico` | script | corrida en local: 229 piezas, 6 FC, ~40 ideas, 4 recursos; segunda corrida no duplica |
| 1.13 | Corrida contra el proyecto remoto | datos | conteos iguales; fila en `corridas(sistema='import_notion')` |

**Bloque E · Deploy y cierre**

| # | Paso | Verificación |
|---|---|---|
| 1.14 | Deploy en Vercel con variables; dominio (decisión A) | `/cola` responde en producción |
| 1.15 | **Criterio de cierre S1 (textual):** Mariela, con su login, publica una historia y un reel desde la app; el reel queda `publicada` con URL; aparece `metricas(fuente='pendiente')` y una fila en `corridas`; Nazho ve el cambio en el kanban | Como el kanban es de S2, en S1 se verifica con una consulta o una lista mínima en `/piezas` |

### Sprint 2 — Capa MCP, pantallas de Nazho, jobs

**Bloque F · MCP**

| # | Paso | Verificación |
|---|---|---|
| 2.1 | `lib/mcp/auth.ts`: Bearer → `sha256(key‖pepper)` → perfil → cliente impersonado (hallazgo 7) | key inválida = 401; key de editor no puede `crear_idea` |
| 2.2 | `api/mcp/route.ts` con transporte stateless (9) | `curl` del README responde `tools/list` |
| 2.3 | Las 13 tools de v1, una por archivo, zod + descripción en español; todas las de escritura insertan `corridas` | `crear_pieza` sin `hipotesis.fecha` → «Falta hipótesis.fecha» |
| 2.4 | `.mcp.json` local + `docs/mcp.md`; registro en Cowork (8) | desde Claude Code, `listar_comunidades` responde |

**Bloque G · Pantallas de Nazho**

| # | Paso | Verificación |
|---|---|---|
| 2.5 | Ideas: inbox por comunidad, atajos S/D/C, tope shortlist 20, formulario mínimo de conversión (5 campos obligatorios) | convertir sin fecha en la hipótesis no crea la pieza |
| 2.6 | Piezas: kanban por estado, tope visible en rojo, drag bloqueado a `publicada` sin URL; vista calendario por canal | — |
| 2.7 | Tablero: 3 métricas norte con fecha de corte (YouTube vacío a propósito), barras de multiplicador (12), latidos con atraso en rojo, huecos | un sistema sin corrida en su ventana aparece en rojo |

**Bloque H · Jobs y espejo**

| # | Paso | Verificación |
|---|---|---|
| 2.8 | pg_cron: recálculo nocturno de `metricas.multiplicador`; `latidos()` | fila en `corridas` cada noche |
| 2.9 | n8n (contrato en `docs/jobs-n8n.md`): `post_scraper_grilla`, `snapshot_seguidores` (handle `nazho`), `kit_suscriptores`, `go_leads`; cada uno inserta `corridas` al inicio y al fin; `api/hooks/n8n` recibe y valida | 7 corridas ok de `snapshot_seguidores` → se apaga la tarea de la Mini |
| 2.10 | `scripts/espejo-md.ts` + bucket `espejo/` | archivos `.md` fechados |
| 2.11 | Reescribir prompts de Milo (sprint lunes, review viernes) para leer/escribir por MCP | fuera del repo; se documenta el contrato de tools que usan |
| 2.12 | **Criterio de cierre S2 (textual):** desde Cowork, `crear_pieza` sin fecha devuelve error legible; Milo propone la parrilla por MCP; Nazho aprueba historias desde el teléfono; el viernes `leer_metricas` devuelve multiplicador para toda pieza publicada con URL sin intervención humana | — |

### v2 y v3 — solo documentación en este repo

- `010_radar.sql` escrito en S1, no aplicado. Job `radar_scrape` y tools `escribir_analisis` / `videos_outlier` documentados en `docs/`, no construidos.
- Voz: el esquema ya está en `pensamientos`. Falta `api/hooks/voz`, transcripción y skill `entrevistador`. Señal para promover: la cola de Mariela se llena y lo que falta es la grabación de Nazho.
- v2b: publicación de historias `producido` por API de Instagram.

---

## 5. Qué no se construye (para no reabrirlo)

Escritura de guiones en la app · LLM dentro de la app · gamificación · créditos · Collections · sincronización de regreso a Notion · roles viewer activos (Evelyn, Fernando) antes de que haya pantalla útil · Radar y Voz en v1.

---

## 6. Dependencias fuera del repo

- Proyecto Supabase Pro y proyecto Vercel (Nazho).
- Acceso de Mariela en Meta Business Suite (Nazho).
- n8n con credenciales de Apify, Kit y Supabase Leads (S2). El conector n8n de claude.ai está sin autorizar en esta sesión; se autoriza desde los ajustes de conectores cuando toque.
- Tarea local de la Mini que descarga `espejo/` a `_Claude/Dominios/Contenido/espejo/`.
- Tareas de nube de Milo (`trig_01NC7…`, `trig_01W9o…`) que se reescriben en S2.
