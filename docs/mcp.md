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

`.mcp.json` apunta a producción (`https://content-os-nazho-flkmxs-projects.vercel.app/api/mcp`) y lee la key de la variable `CONTENTOS_MCP_KEY`. Para desarrollo local cambia la URL a `http://localhost:3017/api/mcp`.

```bash
export CONTENTOS_MCP_KEY=cos_…      # en ~/.zshrc o antes de abrir claude
claude                              # acepta el servidor "contentos" cuando lo pregunte
```


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

## 5. Herramientas (20)

| Tool | Para qué | Latido |
|---|---|---|
| `listar_comunidades` · `listar_formatos` · `latidos` | contexto: ICP, Format Cards, última corrida por sistema | — |
| `crear_pieza` | una pieza nace con solo título (estado idea). Con formato → para_producir. Con formato + etapa + hipótesis → para_grabar | `crear_pieza` |
| `actualizar_pieza` | **así Claude desarrolla una idea**: formato, hipótesis, etapa, format card, guion, spec, estado. Acepta id_publico | `actualizar_pieza` |
| `listar_piezas` | por estado (borradores incluidos), formato o semana objetivo | — |
| `stream_de` · `agregar_pensamiento` · `guardar_guion` | el stream de redacción (voz, texto, link, preguntas, respuestas) y las versiones del guion; los usa el skill `entrevistador-redaccion` | `agregar_pensamiento`, `guardar_guion` |
| `listar_cuentas` · `seguir_cuenta` | la watchlist | `seguir_cuenta` |
| `asignar_tarea` · `cola_de` | la cola de Mariela o de Nazho | `asignar_tarea` |
| `proponer_historias` · `aprobar_historias` | paquete semanal | ambas |
| `leer_metricas` · `registrar_metrica_manual` | métricas y multiplicador | `registrar_metrica_manual` |
| `listar_sistemas` · `definir_sistema` | los grafos del Nodo | `definir_sistema` |
| `estado_semana` · `declarar_hueco` | cuota y estado por nodo; huecos | `declarar_hueco` |

Se retiraron `crear_idea`, `listar_ideas`, `mover_idea` y `agregar_pensamiento`: las ideas son piezas en estado `idea` (docs/simplificacion.md).

## 6. Cómo usa esto Milo

1. `listar_comunidades` + `estado_semana` al arrancar el sprint del lunes.
2. `listar_piezas(estado=idea)` → `actualizar_pieza` por cada idea que entra a la parrilla (formato, hipótesis, guion, estado para_grabar) → `asignar_tarea`.
3. `proponer_historias(semana)`; Nazho aprueba desde Hoy o con `aprobar_historias`.
4. El viernes: `leer_metricas(desde, hasta)` → hallazgos; `declarar_hueco` para lo que no corrió.
