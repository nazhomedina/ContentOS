# Taller de Contenido — reglas del repo

Capa visual de trabajo en la nube para la marca personal de Nazho Medina. Sustituye a Notion como capa operativa. La usan Nazho (owner, principalmente desde Claude vía MCP), Mariela (editor, desde la web) y más adelante Evelyn y Fernando (viewer).

Plan de trabajo y hallazgos: `PLAN.md`. Handoff original: `HANDOFF-taller-contenido.md` (no se edita). Diseño completo y glosario: `~/Documents/03 ÁREAS/Contenidos/_sistema/taller-contenido/`.

## Fronteras duras

- La app **no llama a ningún LLM**. Todo lo que necesita criterio (guiones, análisis, parrillas, preguntas) entra por MCP desde la cuenta de Claude de Nazho.
- La app **guarda estado, cola, datos y latidos**. Los jobs de datos (scraping, métricas, Kit, leads) corren en n8n y escriben en Supabase.
- Reglas que eran documentos ahora son restricciones del esquema: hipótesis obligatoria y resoluble (campo, número, fecha), etapa del embudo obligatoria, «publicada» exige URL, tope de 10 piezas en producción.
- Toda escritura automática (job, tool de MCP) inserta una fila en `corridas`. Sin fila no hubo corrida.

## Decisiones ya tomadas (no reabrir)

- Unidad raíz = **comunidad**.
- App **independiente**: proyecto propio de Supabase (Pro) y de Vercel. No es módulo de Brain.
- v1 = cola de Mariela (reels + historias) + capa MCP para Nazho. Radar (v2) y voz (v3) se documentan, no se construyen.
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres, Auth, Storage) + Vercel. MCP con `@modelcontextprotocol/sdk`, Streamable HTTP stateless.
- Sin gamificación, sin créditos, sin Collections, sin escritura de guiones en la app.

## Convenciones

- Idioma: español en SQL, tools, mensajes de error y UI. `snake_case` en base de datos y tools; kebab-case en rutas.
- Migraciones en `supabase/migrations/`; una vez aplicada no se edita, se agrega otra. `010_radar.sql` existe pero no se aplica en v1.
- Zona horaria de negocio: `America/Mexico_City`, centralizada en `lib/dominio/tiempo.ts`.
- Diseño: `DESIGN.md` de nazho-medina — negro `#121212`, azul `#0034FF` único acento, Gilroy (fallback Outfit). Semáforos ok/ámbar/rojo son semánticos. Móvil primero.
- Decisiones del repo con fecha en `docs/decisiones.md`.
