# MCP de ContentOS

Servidor MCP propio, expuesto por la app en `/api/mcp` (Streamable HTTP, sin estado). Autentica con `Authorization: Bearer <api_key>`; la key pertenece a un perfil y el servidor **impersona a ese usuario**, así que la RLS aplica igual que en la web. La key de Nazho es owner; una tarea programada puede tener una key de editor.

## 1. Generar la key

Requiere que el perfil exista (haber entrado una vez a la app).

```bash
cd ~/Repos/ContentOS
node --env-file=.env.local scripts/api-key.mjs nazho@flk.mx
```

Imprime la key una sola vez. Correrlo de nuevo la rota.

## 2. Registrar en Claude Code

`.mcp.json` ya apunta a `http://localhost:3017/api/mcp` y lee la key de la variable `CONTENTOS_MCP_KEY`:

```bash
export CONTENTOS_MCP_KEY=cos_…      # en ~/.zshrc o antes de abrir claude
claude                              # acepta el servidor "contentos" cuando lo pregunte
```

Con la app en producción, cambia la URL a `https://<dominio>/api/mcp`.

## 3. Registrar en Cowork / claude.ai

Ajustes → Conectores → Añadir conector remoto → URL `https://<dominio>/api/mcp`. Si el conector exige OAuth en vez de Bearer estático, se agrega un endpoint OAuth 2.1 sobre las mismas keys (PLAN.md hallazgo 8). Por eso el orden: primero Claude Code, luego Cowork.

## 4. Prueba con curl

```bash
KEY=cos_…
curl -s http://localhost:3017/api/mcp \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

curl -s http://localhost:3017/api/mcp \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

Sin key responde 401.

## 5. Herramientas

| Tool | Para qué | Latido |
|---|---|---|
| `listar_comunidades` | ICP, dolor, promesa, tono | — |
| `latidos` | última corrida por sistema | — |
| `listar_ideas` · `crear_idea` · `mover_idea` · `agregar_pensamiento` | el embudo de ideas | `crear_idea`, `mover_idea` |
| `crear_pieza` | exige hipótesis {texto, campo, numero, fecha}; error legible | `crear_pieza` (lo escribe la función SQL) |
| `actualizar_pieza` · `listar_piezas` | guion, spec, fecha, responsable, estado | `actualizar_pieza` |
| `asignar_tarea` · `cola_de` | la cola de Mariela (o de Nazho) | `asignar_tarea` |
| `proponer_historias` · `aprobar_historias` | paquete semanal | `proponer_historias`, `aprobar_historias` |
| `leer_metricas` · `registrar_metrica_manual` | métricas y multiplicador | `registrar_metrica_manual` |
| `listar_sistemas` · `definir_sistema` | los grafos del Nodo | `definir_sistema` |
| `estado_semana` · `declarar_hueco` | cuota y estado por nodo; huecos | `declarar_hueco` |

Las tools de v2 (`escribir_analisis`, `videos_outlier`) llegan con la migración del radar.

## 6. Cómo usa esto Milo

1. `listar_comunidades` + `estado_semana` al arrancar el sprint del lunes.
2. `listar_ideas(estado=shortlist)` → `crear_pieza` por cada pieza de la parrilla (con hipótesis) → `asignar_tarea`.
3. `proponer_historias(semana)`; Nazho aprueba desde Hoy o con `aprobar_historias`.
4. El viernes: `leer_metricas(desde, hasta)` → hallazgos; `declarar_hueco` para lo que no corrió.
