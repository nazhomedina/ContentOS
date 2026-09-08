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
