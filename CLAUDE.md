# Nazho Content Studio

## Proyecto
App web local (localhost) que funciona como centro de comando del sistema de contenido de Nazho.
Lee carpetas de `contenido/` como fuente de verdad.

## Stack
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Vite + Tailwind CSS
- **Parseo:** gray-matter para frontmatter YAML en archivos .md
- **File watching:** chokidar

## Estructura de contenido
La carpeta `contenido/` tiene subcarpetas por etapa del pipeline:
- `contenido/ideas/` — Ideas sin desarrollar
- `contenido/redaccion/` — En proceso de escritura
- `contenido/produccion/` — Grabación/edición
- `contenido/buffer/` — Listo para publicar
- `contenido/publicado/` — Ya publicado
- `contenido/sprints/` — Sprints semanales

## Frontmatter de piezas de contenido
```yaml
---
titulo: "Título de la pieza"
formato: "reel" | "carrusel" | "story" | "newsletter" | "youtube" | "thread"
pilar: "educativo" | "entretenimiento" | "inspiracional" | "promocional"
canal: "instagram" | "youtube" | "newsletter" | "twitter"
serie: "nombre-de-serie"
etapa: "idea" | "redaccion" | "produccion" | "buffer" | "publicado"
fecha_creacion: "2026-03-15"
fecha_publicacion: "2026-03-20"
---
```

## Comandos
```bash
npm run dev      # Server + client en paralelo
npm run server   # Solo backend (puerto 3001)
npm run client   # Solo frontend (puerto 5173, proxy a 3001)
npm run build    # Build de producción del client
npm start        # Producción
```

## Reglas
- Las carpetas .md siempre mandan. SQLite es cache y datos derivados.
- No crear archivos innecesarios.
- Respetar la paleta visual dark con acento naranja (#cc6633).
