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

Hay dos rutas. La A es la buena; la B es el respaldo si el diálogo de conectores de tu cuenta todavía no muestra «Request headers» (está en beta).

**Ruta A · Conector personalizado con cabecera** (Cowork, claude.ai y la app de escritorio comparten conectores).

1. Genera la key (sección 1) y cópiala.
2. Ajustes → **Customize → Connectors** → **Add custom connector** (en Team/Enterprise: **Organization settings → Connectors → Add → Custom → Web**).
3. Name: `ContentOS`. MCP server URL: `https://content-os-nazho-flkmxs-projects.vercel.app/api/mcp`.
4. Authentication: **No sign-in** (el servidor no hace OAuth; la key es la identidad).
5. **Request headers** → header `authorization`, valor `Bearer cos_…` (con la palabra Bearer y el espacio), marcado como **Required**. Claude no vuelve a mostrar el valor.
6. Add. En el chat, «+» → Connectors → activa ContentOS. Primera prueba: «lista mis comunidades».

Las cabeceras no se editan después: para rotar la key, elimina el conector y agrégalo de nuevo.

**Ruta B · App de escritorio (config local).** Cowork también ve los servidores de `claude_desktop_config.json` (en macOS: `~/Library/Application Support/Claude/`). Agrega:

```json
{
  "mcpServers": {
    "contentos": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://content-os-nazho-flkmxs-projects.vercel.app/api/mcp", "--header", "Authorization:${CONTENTOS_MCP_KEY}"],
      "env": { "CONTENTOS_MCP_KEY": "Bearer cos_…" }
    }
  }
}
```

Reinicia la app por completo. `mcp-remote` corre en tu máquina y reenvía las llamadas con la cabecera; si no lo tienes, `npx` lo baja la primera vez.

**Qué esperar.** Sin key el servidor responde 401 («Couldn't reach the MCP server» en el diálogo casi siempre es eso: falta `Bearer ` o la key es de otro perfil). La key es la identidad: con la de Nazho, Claude es owner y la RLS aplica igual que en la web; cada tool que escribe deja su fila en `corridas`.

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

## 5. Herramientas (31)

| Tool | Para qué | Latido |
|---|---|---|
| `listar_comunidades` · `latidos` | contexto: ICP, última corrida por sistema | — |
| `listar_formatos` · `crear_formato` · `agregar_referencia` | la biblioteca de formatos: etiquetas, hipótesis del formato, referencias de terceros y propias, rollups; dar de alta uno al analizar una cuenta y colgarle los reels que lo sostienen | `crear_formato`, `agregar_referencia` |
| `actualizar_formato` | ficha de un formato: estado, etiquetas, serie propia, duración, recompensa, cadencia, molde, día de envío y la hipótesis del formato (resoluble con campo, número y fecha) | `actualizar_formato` |
| `listar_series` · `guardar_serie` | las series declaradas con descripción, activas y piezas; prenderlas, apagarlas, renombrarlas | `guardar_serie` |
| `crear_pieza` | una pieza nace con solo título (borrador). Con tipo → redacción. Con tipo + etapa + hipótesis → grabación | `crear_pieza` |
| `actualizar_pieza` | **así Claude desarrolla una idea**: tipo, hipótesis (o hipotesis_id), etapa, formato (card), contenido, notas, etiquetas, estado. Acepta id_publico | `actualizar_pieza` |
| `listar_piezas` | por estado (borradores incluidos), tipo, serie, etiqueta o semana objetivo | — |
| `guardar_contenido` | las versiones del contenido; lo usan los skills de redacción de Cowork al terminar la entrevista (el stream se retiró el 17-sep) | `guardar_contenido` |
| `listar_hipotesis` · `resolver_hipotesis` · `actualizar_hipotesis` | las hipótesis con piezas y evidencia; cerrarlas con veredicto; completar las heredadas | `resolver_hipotesis` |
| `listar_cuentas` · `seguir_cuenta` | la watchlist | `seguir_cuenta` |
| `asignar_tarea` · `cola_de` | la cola de Mariela o de Nazho | `asignar_tarea` |
| `proponer_historias` · `agendar_historia` · `aprobar_historias` | historias con día (paquete semanal) o sin fecha (buffer); agendar una del buffer la aprueba; tipo: lead_magnet · amplificacion · frase · pregunta · archivo | las tres |
| `listar_recursos` · `guardar_recurso` | los lead magnets con keyword, liga en Go, tag de Kit, leads (a mano con fecha de corte) y las historias que los empujaron | `guardar_recurso` |
| `leer_metricas` · `registrar_metrica_manual` | métricas y multiplicador | `registrar_metrica_manual` |
| `listar_sistemas` · `definir_sistema` | los grafos del Nodo | `definir_sistema` |
| `estado_semana` · `declarar_hueco` | cuota y estado por nodo; huecos | `declarar_hueco` |

Se retiraron `crear_idea`, `listar_ideas`, `mover_idea` y `agregar_pensamiento`: las ideas son piezas en estado `idea` (docs/simplificacion.md).

## 6. Cómo usa esto Claude desde Cowork

1. `listar_comunidades` + `estado_semana` al arrancar el sprint del lunes.
2. `listar_piezas(estado=borrador)` → `actualizar_pieza` por cada idea que entra a la parrilla (tipo, hipótesis, contenido, estado) → `asignar_tarea`. La entrevista pasa en el chat con el skill; el resultado entra con `guardar_contenido`.
3. `proponer_historias(semana)` o sin semana al buffer; `agendar_historia` para poner día; Nazho aprueba desde Inicio, Historias o con `aprobar_historias`.
4. El viernes: `leer_metricas(desde, hasta)` → hallazgos; `declarar_hueco` para lo que no corrió.
