# ContentOS

Capa de trabajo en la nube para la marca personal de Nazho Medina. Sustituye a Notion como capa operativa: ideas por comunidad, piezas con hipótesis, cola de producción, historias de la semana, métricas y latidos. Nazho la opera desde Claude por MCP; Mariela desde la web.

- Plan de trabajo, hallazgos y orden de construcción: [PLAN.md](PLAN.md)
- Reglas del repo: [CLAUDE.md](CLAUDE.md)
- Decisiones con fecha: [docs/decisiones.md](docs/decisiones.md)
- Handoff original de la sesión de diseño: [HANDOFF-taller-contenido.md](HANDOFF-taller-contenido.md)

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · Vercel · MCP por Streamable HTTP.

## Correr en local

```bash
cp .env.example .env.local   # llenar con el proyecto Supabase ContentOS
npm install
supabase start               # stack local; requiere Docker
npm run dev
```

## Estructura

Ver la sección 3 de [PLAN.md](PLAN.md).
