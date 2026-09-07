# HANDOFF — Taller de Contenido (nombre provisional)

**Para:** Claude Code · **De:** sesión de diseño en Cowork, 2026-09-06 · **Dueño:** Nazho Medina
**Documento de diseño completo:** `taller-contenido-diseno.html` (misma carpeta). Este handoff es la versión operativa: qué construir, en qué orden, con qué criterios de cierre.

---

## 0. Qué es y qué no es

Capa visual de trabajo en la nube para la marca personal de Nazho. Sustituye a Notion como capa operativa. La usan Nazho (owner), Mariela (editor: edita reels, diseña carruseles, publica historias) y, más adelante, Evelyn y Fernando (viewer). Nazho la opera principalmente **desde Claude vía MCP**; Mariela la opera desde la web.

**Fronteras duras**
- La app **no llama a ningún LLM**. Todo lo que necesita criterio (guiones, análisis de videos, propuestas de parrilla, preguntas) entra por MCP desde la cuenta de Claude de Nazho, donde viven los skills y la voz (VOZ-MAESTRA).
- La app **guarda estado, cola, datos y latidos**. Los jobs de datos (scraping, métricas, Kit, leads) corren en n8n y escriben en Supabase.
- Reglas que antes vivían en documentos ahora son restricciones del esquema: hipótesis obligatoria y resoluble, etapa del embudo obligatoria, «publicada» exige URL, tope de 10 piezas en producción.

**Decisiones ya tomadas (no reabrir)**
- Unidad raíz = **comunidad** (una audiencia a la que Nazho le habla).
- App **independiente**: proyecto propio de Supabase (plan Pro desde el día uno — el gratis se pausa a los 7 días) y de Vercel. No es módulo de Brain.
- v1 = cola de Mariela (reels + historias) + capa MCP para Nazho. Radar de outliers (v2) y captura por voz (v3) quedan documentados, no construidos.
- Stack lockeado: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres, Auth, Storage, Edge Functions) + Vercel. MCP con el SDK oficial (`@modelcontextprotocol/sdk`), transporte Streamable HTTP.
- Sin gamificación, sin créditos, sin Collections, sin escritura de guiones en la app.

---

## 1. Estructura del repo

```
taller-contenido/
├── app/
│   ├── (auth)/login/                 # magic link
│   ├── (editor)/cola/                # Mi cola (Mariela)
│   ├── (editor)/piezas/[id]/         # Detalle de pieza
│   ├── (editor)/historias/           # Historias de la semana
│   ├── (owner)/ideas/                # Inbox de ideas
│   ├── (owner)/piezas/               # Kanban
│   ├── (owner)/tablero/              # Tablero + latidos
│   ├── api/mcp/route.ts              # Servidor MCP (Streamable HTTP)
│   └── api/hooks/                    # webhooks entrantes (Storage, n8n)
├── lib/supabase/{client,server,admin}.ts
├── lib/mcp/tools/*.ts                # una tool por archivo
├── lib/dominio/                      # validaciones (hipótesis, estados, tope)
├── supabase/
│   ├── migrations/001_nucleo.sql
│   ├── migrations/002_rls.sql
│   ├── migrations/003_funciones.sql
│   ├── migrations/010_radar.sql      # v2, se escribe pero no se aplica
│   └── seed.sql
├── scripts/importar-notion.ts        # una sola vez
├── scripts/espejo-md.ts              # cron diario → .md
└── CLAUDE.md                         # reglas del repo (copiar §0 de este handoff)
```

Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo server), `MCP_KEY_PEPPER` (para hashear API keys), `NOTION_TOKEN` (solo para el import).

---

## 2. Migración 001 — núcleo

Aplicar tal cual (está en el diseño, §4) con estos ajustes de implementación:

- `piezas.hipotesis jsonb NOT NULL` con check `hipotesis ? 'campo' AND hipotesis ? 'numero' AND hipotesis ? 'fecha'`. Forma: `{"texto": "...", "campo": "multiplicador", "numero": 3, "fecha": "2026-10-31"}`.
- `piezas.etapa_embudo NOT NULL` ∈ `atraer | capturar | convertir`.
- Check `estado <> 'publicada' OR url IS NOT NULL`.
- `piezas.id_publico` único, formato `^[A-Z]{2,5}-\d{2,3}$`. Prefijos existentes en Notion: FC01, FC02, FC03, FC04, FC05, CRI, NUM, YAP, CLA, SEA, HIS, CAR, FUN, REF, SLT. **Ojo:** NUM-08..NUM-11 están duplicados en Notion; el import los renumera y lo registra.
- Estados de pieza: `para_producir · para_grabar · edicion · buffer · programada · publicada · archivada · en_trial`.
- Tope: trigger `BEFORE INSERT OR UPDATE ON piezas` que rechaza si `count(*) where estado in ('para_producir','para_grabar') > 10` **salvo** que la pieza tenga `serie` marcada como programa aprobado (columna `programa_aprobado boolean default false` en `piezas`; el reto CRI se importa con `true`).
- `metricas` con `unique (pieza_id, fecha, fuente)`.
- **Multiplicador:** implementarlo como función `multiplicador(pieza_id uuid) returns numeric` — views más recientes ÷ mediana (`percentile_cont(0.5)`) de las views más recientes de las últimas 12 piezas publicadas **del mismo formato** anteriores a esta. La vista `v_multiplicador` del diseño es ilustrativa; la función es la fuente. Guardar el valor calculado en `metricas.multiplicador` por job nocturno para que las pantallas no calculen en caliente.
- `corridas`: todo job y toda tool de escritura del MCP insertan una fila (`sistema`, `estado`, `resumen`). Sin fila no hubo corrida.

## 3. Migración 002 — RLS

- Función `rol_actual() returns text` leyendo `perfiles.rol` del `auth.uid()`.
- `owner`: todo.
- `editor`:
  - `piezas` select si `estado in ('para_grabar','edicion','buffer','programada','publicada')` **o** `responsable_id = auth.uid()`; update **solo** vía `marcar_publicada(pieza_id, url, plataforma)` y `cambiar_estado_pieza(pieza_id, nuevo_estado)` (security definer, validan transiciones permitidas al editor: `para_grabar→edicion→buffer→programada→publicada`).
  - `tareas` select/update donde `asignado_a = auth.uid()` (estado, checklist, nota_bloqueo, hecha_en).
  - `historias` select si `estado in ('aprobada','programada','publicada')`; update de `estado` (aprobada→programada→publicada), `publicada_en`, `views`, `replies`, `dms`.
  - `ideas`, `pensamientos`, `indicadores_semana`, `corridas`: sin acceso (`pensamientos` tampoco por join).
  - Storage bucket `assets`: lectura de todo, escritura en `assets/piezas/{pieza_id}/*` y `assets/historias/{semana}/*`.
- `viewer`: select en `piezas` publicadas, `historias` publicadas, `indicadores_semana`; insert en `comentarios` (tabla simple: `pieza_id, autor, texto`).
- MCP: la request trae `Authorization: Bearer <key>`; el route handler busca `perfiles.api_key_hash = sha256(key || pepper)` y ejecuta con un cliente que impersona ese usuario (JWT firmado con `SUPABASE_JWT_SECRET`, `sub = user_id`), de modo que **la RLS también aplica al MCP**.

## 4. Migración 003 — funciones y triggers

- `marcar_publicada(pieza_id, url, plataforma)`: valida URL, pone `estado='publicada'`, `publicada_en=now()`, cierra tareas `publicar` de la pieza, inserta fila en `metricas` con `fuente='pendiente'` (para que el post-scraper la tome), inserta `corridas`.
- `crear_pieza_validada(payload jsonb)`: la usa el MCP; aplica todas las validaciones y devuelve la pieza o un error legible en español («Falta hipótesis.fecha»).
- `asignar_tarea(pieza_id|historia_id, tipo, asignado_a, vence, checklist)`.
- `aprobar_historias(semana)`: todas las `propuesta` de esa semana → `aprobada` y crea tareas `publicar` para el editor por historia.
- `latidos()`: última corrida por sistema con `esperado_cada interval` (tabla `sistemas_registrados(nombre, esperado_cada)`) y flag `atrasado`.

## 5. Seed

- Comunidades: «Fundadores con criterio» (ICP A de abril: capital, decisión autónoma, ya se equivocó) y una segunda que Nazho definirá (¿PyMEs MHF?). Dejar la segunda como fila inactiva con nombre «(por definir)».
- Format Cards: FC-01 React-Análisis · FC-02 Róbate · FC-03 Serie con contador · FC-04 Lección contraintuitiva · FC-05 Checklist relámpago · FC-08 Criterio (yap). Estados como en Notion (`experimentando`, FC-05 `detectado`). Los moldes vienen de `_Claude/Creaciones/format-lab/cards/*.md`.
- Perfiles: Nazho (`owner`, nazho@flk.mx), Mariela (`editor`). Evelyn y Fernando **no** todavía.
- `sistemas_registrados`: `post_scraper_grilla` (1 day) · `snapshot_seguidores` (1 day) · `kit_suscriptores` (1 day) · `go_leads` (1 day) · `sprint_lunes` (7 days) · `review_viernes` (7 days) · `espejo_md` (1 day).

## 6. Import desde Notion (una sola vez)

Data source Microcontenidos `collection://a8c639e2-4c7e-41ed-9c7e-2ea1328aa0f1` (229 filas) y Format Cards `collection://121d6aac-ddfb-45f9-8e87-f6c263db8b1c`.

Mapa de campos: `ID → id_publico` · `Nombre → titulo (en ideas) / guion encabezado` · `Status → estado` (Para producir→para_producir, Para grabar→para_grabar, Diseño o edición→edicion, Buffer→buffer, Publicada→publicada, En trial→en_trial, Archivado→archivada) · `Formato` (Reel/Short→reel, Carruseles→carrusel, Historia→historia, IG canal→canal_ig, Reflexiones→x) · `Hipótesis → hipotesis.texto` · `Format Card → format_card_id` · `URL → url` · `Publicación → publicada_en` · `Responsable → responsable_id` · `Views/Likes/Comentarios/Saves/Follows → metricas (fuente='notion', fecha=Publicación)` · cuerpo de página → `guion`.

Reglas del import:
- Filas sin `Hipótesis`: se importan con `hipotesis = {"texto": null, "campo": "multiplicador", "numero": null, "fecha": null, "legado": true}` **solo si** `estado in ('publicada','archivada')`. Las 10 del Buffer y las 16 de Diseño sin hipótesis se importan en `estado='para_producir'` con `programa_aprobado=false` y quedan marcadas `requiere_hipotesis=true`; la app las muestra en rojo hasta que Nazho la complete. (El check NOT NULL se satisface; el check de llaves se relaja en el import con una columna `legado boolean`.)
- `etapa_embudo`: todo legado → `atraer` con `etapa_legado=true`.
- Las 30 `CRI-XX` se importan en `para_grabar`, `programa_aprobado=true`, con su cuerpo completo (pregunta, contexto, tensión, apuesta, frentes) en `guion`.
- IDs duplicados (NUM-08..11): la segunda ocurrencia se renumera `NUM-08b` etc. y se registra en `corridas` con `sistema='import_notion'`.
- 💡 Banco de ideas (`collection://3f0ea657-6cef-4ff3-9d25-3647f8d1006f`) → `ideas` con `origen='markie'|'radar'|'destilado'` según la fila, `estado='shortlist'` si estaba en Propuesta.
- 🎁 Recursos de historias (`collection://7dbb2b26-933f-4792-a1ab-b20c1962f30b`) → `recursos` (RORY, 90, BEAST con sus slugs de go.folklore.mx y tags de Kit 22364040 / 22364041 / 22364042).
- Notion queda intacto. No se borra ni se sincroniza de regreso.

## 7. Pantallas del sprint 1 (Mariela primero)

**Mi cola** (`/cola`): grupos Hoy · Esta semana · Bloqueadas · Hechas (últimos 7 días). Fila: id_publico · título · formato · tipo de tarea · vence · estado · botón «Bloqueada» (nota obligatoria). Encabezado: «N para hoy · N bloqueadas · buffer N» con semáforo (≥5 verde, 2–4 ámbar, <2 rojo). Filtros: reels · carruseles · historias.

**Detalle de pieza** (`/piezas/[id]`): cabecera (id, formato, FC, serie, fecha objetivo, responsable, hipótesis en una línea, solo lectura); guion en markdown; spec visual; assets (upload a Storage, lista con preview); checklist por tipo; comentarios; **acción final «Publicada»** con URL obligatoria y plataforma → llama `marcar_publicada`. Si el estado no permite publicar, el botón explica por qué («Falta pasar por buffer»).

**Historias de la semana** (`/historias?semana=YYYY-MM-DD`): calendario lun–dom, solo historias `aprobada|programada|publicada`. Card: serie · registro · copy (copiar al portapapeles) · asset (descargar) · keyword · pieza amplificada (link). Acciones: «Programada» (hora), «Publicada», y al día siguiente campos views / replies / DMs (manual; se guardan con `fuente='manual'`).

Diseño: DESIGN.md de nazho-medina (`_Claude/Creaciones/design-systems/nazho-medina/DESIGN.md`): negro `#121212`, azul `#0034FF` como único acento, Gilroy (fallback Outfit). Semáforos ok/ámbar/rojo son semánticos, no acento. Móvil primero para Mariela.

**Criterio de cierre del sprint 1:** Mariela, con su login, publica una historia y un reel desde la app, el reel queda `publicada` con URL, aparece una fila `metricas(fuente='pendiente')` y una fila en `corridas`. Nazho ve el cambio en el kanban.

## 8. Sprint 2 — MCP, pantallas de Nazho, jobs

**MCP** (`/api/mcp`, Streamable HTTP). Tools, con esquema zod y descripción en español:

| tool | input | output |
|---|---|---|
| `listar_comunidades` | — | comunidades activas con icp, dolor, promesa, tono |
| `listar_ideas` | comunidad_id?, estado?, limite? | ideas con conteo de pensamientos |
| `crear_idea` | comunidad_id, titulo, origen, etapa_embudo?, notas?, video_origen_id? | idea |
| `mover_idea` | idea_id, estado | idea |
| `agregar_pensamiento` | idea_id, tipo, texto?, transcript?, responde_a? | pensamiento |
| `crear_pieza` | id_publico, idea_id?, comunidad_id, formato, serie?, format_card, hipotesis{texto,campo,numero,fecha}, etapa_embudo, cta?, guion?, spec_visual?, fidelidad?, fecha_objetivo?, responsable? | pieza o error legible |
| `actualizar_pieza` | pieza_id, campos parciales | pieza |
| `asignar_tarea` | pieza_id\|historia_id, tipo, asignado_a (nombre o id), vence, checklist? | tarea |
| `cola_de` | persona | tareas por estado + bloqueos |
| `proponer_historias` | semana, historias[] | historias en `propuesta` |
| `aprobar_historias` | semana | n aprobadas + tareas creadas |
| `leer_metricas` | pieza_id? \| desde/hasta | métricas + multiplicador; indicadores por semana |
| `registrar_metrica_manual` | pieza_id\|historia_id, campo, valor, fecha | fila |
| `latidos` | — | sistemas con última corrida y `atrasado` |
| `escribir_analisis` *(v2)* | video_id, análisis{...} | analisis_video |
| `videos_outlier` *(v2)* | comunidad_id, outlier_min, dias, analizado? | videos |

Registro: en Cowork como conector MCP remoto (URL + Bearer); en Claude Code en `.mcp.json`. Documentar en el README el `curl` de prueba.

**Pantallas:** Ideas (inbox por comunidad, S/D/C con atajos), Piezas (kanban con tope visible; drag a `publicada` bloqueado sin URL), Tablero (tres métricas norte con fecha de corte y vacío explícito para YouTube; barras de multiplicador de las últimas 12; latidos con atraso en rojo; huecos de la semana).

**Jobs n8n** (cada uno inserta `corridas` al inicio y al fin):
1. `post_scraper_grilla` — diario 6:00: piezas `publicada` con `publicada_en > now()-30d` → Apify `apify/instagram-scraper` con `directUrls` (devuelve `videoPlayCount`; likes de carruseles pueden venir −1 → guardar null) → upsert `metricas(fuente='apify')` → recalcular `multiplicador`.
2. `snapshot_seguidores` — diario 5:00: perfil @nazho (handle `nazho`, **no** `nazhomedina`) → `indicadores_semana.seguidores` del día. Sustituye a la tarea de la Mac Mini, que se apaga cuando este job tenga 7 corridas ok.
3. `kit_suscriptores` — diario: Kit API `get_growth_stats` → `indicadores_semana.suscriptores`.
4. `go_leads` — diario: Supabase «Folklore Leads» (`mixbxbqurmoxatsvdvut`, tabla `leads`) → `recursos` (conteo) e `indicadores_semana.leads`. Sustituye a `trig_014Hqtc7qDyit98vdYbuSdSd` cuando corra.
5. `espejo_md` — diario 6:30: exporta `comunidades`, `ideas` (shortlist), `piezas` (no archivadas), `indicadores_semana` a `.md` fechados. Destino: bucket `espejo/` + descarga a `_Claude/Dominios/Contenido/espejo/` por la tarea local existente de la Mini.

**Tareas de Claude que se reescriben para usar MCP:** sprint del lunes (`trig_01NC7FGpBrmUa4XCf3ZE5f5V`) y review del viernes (`trig_01W9opv2WM9Fq93KUHUXsJgy`). El review ya no captura: lee `leer_metricas` y escribe hallazgos. Si no corre, los números existen igual.

**Criterio de cierre del sprint 2:** desde Cowork, `crear_pieza` sin fecha en la hipótesis devuelve error legible; Milo propone la parrilla por MCP; Nazho aprueba historias desde el teléfono; el viernes `leer_metricas` devuelve multiplicador para toda pieza publicada con URL sin intervención humana.

## 9. Migración 010 — radar (v2, escribir ahora, aplicar después)

```sql
create table cuentas_referencia (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades,
  handle text not null, plataforma text not null check (plataforma in ('instagram','tiktok','youtube')),
  format_card_sugerida uuid references format_cards,
  activa boolean default true, ultimo_scrape timestamptz,
  unique (handle, plataforma)
);
create table videos_referencia (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid references cuentas_referencia,
  shortcode text unique not null, url text, caption text, thumbnail_url text,
  views int, likes int, comentarios int, publicado_en timestamptz, duracion_s int,
  fuente text, capturado_en timestamptz default now(),
  outlier numeric,      -- views / mediana(12 anteriores del canal), lo escribe el job
  engagement numeric generated always as (case when views>0 then (coalesce(likes,0)+coalesce(comentarios,0))::numeric/views end) stored,
  analizado boolean default false, candidato boolean default false
);
create table analisis_video (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos_referencia, pieza_id uuid references piezas,
  transcript text, tema text, angulo text, creencia_comun text, realidad_contraria text,
  hook_texto text, hook_madlib text, hook_categoria text,
  formato text, layout_visual text, beats jsonb, por_que_funciona text, como_personalizar text,
  format_card_id uuid references format_cards, autor text, created_at timestamptz default now()
);
create table hooks (
  id uuid primary key default gen_random_uuid(),
  texto text not null, madlib text, categoria text,
  video_origen_id uuid references videos_referencia, outlier_origen numeric, favorito boolean default false
);
create table reglas_radar (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid references comunidades, cuenta_id uuid references cuentas_referencia,
  outlier_min numeric default 3, views_min int default 0, engagement_min numeric default 0.02,
  tope_diario int default 3, activa boolean default true
);
```

Job `radar_scrape` (diario): por cuenta activa → últimos 30 posts → upsert → recalcular `outlier` → aplicar `reglas_radar` → `candidato=true` hasta `tope_diario`. El análisis lo hace un skill vía `escribir_analisis`; al escribirlo, se crea `idea(origen='radar')`.

Categorías de hook (de Sandcastle, para `hook_categoria`): List · Secret Reveal · Authority · Tutorial · Case Study · Scenario · Comparison · Ranking · Problem · Question · Personal Experience · Trap/Mistake.

## 10. Voz (v3) — solo esquema

Ya cubierto por `pensamientos(tipo in ('voz','pregunta','respuesta'), audio_url, transcript_crudo, transcript_pulido)`. Falta: endpoint `POST /api/hooks/voz` (Atajo de iOS sube audio a Storage y llama con `idea_id`), job de transcripción (Whisper script existente en `03 ÁREAS/Contenidos/_sistema/scripts/` o Descript MCP), y el skill `entrevistador` del lado de Claude. No construir en v1.

## 11. Historias en la cuenta personal — cómo se delega

- Requisito: @nazho como cuenta Creator/Business ligada a una página de Facebook. En Meta Business Suite, Mariela recibe acceso a la página + Instagram con permiso de contenido, con **su** cuenta.
- v1: Mariela programa desde Business Suite (historias de imagen/video sin stickers interactivos; reels con fecha). La app es la fuente (copy, asset, orden); Business Suite es el actuador. Nunca compartir contraseña ni sesión.
- v2b: publicación por API de contenido de Instagram para historias `producido` (sin stickers). Historias con encuesta/pregunta o link con texto siguen siendo manuales.

## 12. Anexo A — Sandcastle, referencia rápida

- Planes: Starter $5 (10 créditos, sin MCP) · Pro $49 (100, MCP) · Visionary $99 (250) · Titan $499 (1,500, API, guests solo lectura). Créditos: 1 por análisis profundo, 1 por guion; Reports según videos.
- Plataformas: IG, TikTok, YouTube Shorts. Scraping público, sin OAuth. Watchlist recomendada 15–20 canales; importa backlog en 15–20 min.
- Outlier = views ÷ promedio de views del canal en 3 meses. Engagement = (likes+comentarios)/views; <2% se trata como pauta y se excluye por defecto.
- Deep analysis = transcript con timestamps + topic/ángulo/creencia común vs realidad contraria/hook (categoría + madlib)/formato/layout visual/beats con timestamps.
- Automations: canal · outlier mín · views mín · engagement mín · tope diario → Ideas inbox. Regla default: ≥1x, ≥25K views, ≥2%, 3/día.
- Ideas: inbox/shortlist/discard con notas y «cómo personalizar a tu nicho» (Persona). Hooks: favoritos + extraídos + curados. Collections: 100+ curadas por ellos. Scripts: prompt→research→hook→style→script; remix; fix.
- MCP en `mcp.sandcastles.ai` (Pro+), skills `/analyze`, `/videos-watchlist`, `/hooks-global`, `/rules`… API REST solo Titan (`video/search`, `video/analyze`, `channel/watchlist`, `automation/rules`, `project`).
- Quejas: solo video corto, créditos se agotan, guiones formulaicos, sin editores multiusuario, MCP no se auto-actualiza.

## 13. Anexo B — VoicePal, referencia rápida

- Sparkle Studios (Ali Abdaal) / Voicepal Limited (UK, director Pablo Simko). $9.99/mes, trial 24 h. iOS/Android/web. Stack observable: Firebase Auth + Convex.
- Mecánica: grabar (background, timer) → transcript crudo + pulido (dial de limpieza) → «shadow reader»: preguntas de seguimiento contextuales, opcionales, en loop → stream (tema que crece) → draft por formato con preset (tono + muestras propias + dial de creatividad «usa mis palabras»).
- Lo valioso: la entrevista, no la generación; dos capas de transcript; unidad «stream».
- Quejas: preguntas repetitivas y sin refresh, output genérico, sin export masivo, bugs de procesamiento.

## 14. Checklist antes de arrancar (Nazho)

- [ ] Nombre y dominio de la app.
- [ ] Proyecto Supabase en Pro, región us-west-1 (misma que noooise).
- [ ] Comunidad 1 con ICP, dolor y promesa escritos (tres líneas bastan).
- [ ] Confirmar @nazho profesional + página de Facebook; agregar a Mariela en Business Suite.
- [ ] Token de Apify vigente (y decidir TikHub, que es exacto pero tiene token filtrado — rotar antes de usar).
- [ ] Registrar la decisión en `decisiones.md`.
