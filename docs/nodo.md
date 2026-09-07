# El Nodo — la capa que falta

**Fecha:** 2026-09-07 · **Origen:** Nazho, al ver el sprint 1: «lo que veo no lo siento funcional; necesito un nodo digital donde visualizar los sistemas con nodos de IA y nodos humanos».

## 1. Diagnóstico

Lo que Nazho pide no contradice el handoff: lo completa por arriba. El handoff diseñó los **átomos** (pieza, tarea, historia, métrica, corrida) y la cola de Mariela. Lo que no diseñó es la **máquina**: qué sistemas existen, quién es cada nodo, qué evidencia prueba que corrió, y cuánto falta esta semana contra la cuota.

Esa capa es justo donde han muerto los intentos anteriores, y el patrón es siempre el mismo:

| Síntoma documentado | Qué faltaba |
|---|---|
| Review del viernes ABANDONED dos semanas seguidas | Nadie vio que no corrió hasta que dolió |
| Snapshot de seguidores caído desde el 25-ago | Sin latido visible, no existe |
| Radar sin corrida desde el 7-ago | Ídem |
| 30 tarjetas CRI, 0 grabadas | El nodo humano «Nazho graba» no tenía cola ni hueco declarado |
| 229 piezas, 0 con multiplicador | El sensor nunca cerró el ciclo |
| Notion + n8n + Cowork + Mac Mini + Kit + ManyChat + go.folklore | Piezas sueltas sin un mapa que las una |

La regla del 27 de agosto ya lo dice: *un sistema está sin sistema, agendado y sin correr, o corriendo con evidencia*. El Nodo es esa regla convertida en pantalla, para cada nodo de cada sistema, cada semana.

## 2. Qué es el Nodo

Tres vistas sobre el mismo esquema, más una tabla nueva.

### 2.1 Máquina — el mapa vivo

Cada **sistema** es un grafo de **nodos** con tipo, dueño, disparador y evidencia:

| Tipo de nodo | Quién | Evidencia de que corrió |
|---|---|---|
| `ia` | Un skill de Claude vía MCP (Milo, guionistas, criterio-writer) | fila en `corridas` con ese `sistema` |
| `humano` | Nazho, Mariela | `tareas` del tipo y semana en `hecha`, o pieza que cambió de estado |
| `automatizacion` | n8n, pg_cron, webhook | fila en `corridas` |
| `plataforma` | Business Suite, Kit, Meta Ads, go.folklore | dato de sensor (`indicadores_semana`, `metricas`, `historias.publicada_en`) |

Cada nodo se pinta con su estado de la semana: **corrió** (verde, con fecha), **agendado y sin correr** (ámbar), **sin sistema** (rojo: nadie lo dispara), **hueco declarado** (gris con nota). Clic en un nodo → su evidencia (las tareas, las corridas, las piezas). Es la pantalla que hubiera mostrado el snapshot caído el 26 de agosto, no el 6 de septiembre.

Los sistemas **se definen como datos**, no se dibujan a mano. Los escribe Claude por MCP (`definir_sistema`) o yo en el seed; la app los visualiza y los vigila. Un editor visual de arrastrar nodos es un producto entero y no es lo que falta: lo que falta es ver la máquina y saber dónde está trabada. Criterio en Claude, estado en la app, como en todo lo demás.

### 2.2 Semana — cuota contra realidad

La cuota de Nazho, como tabla, no como intención:

| Entregable | Por semana | Evidencia |
|---|---|---|
| Newsletter CRITERIO | 1 | pieza `newsletter` publicada con URL |
| Reels (incluye yaps) | 3 | piezas `reel`/`yap` publicadas |
| Carruseles | 2 | piezas `carrusel` publicadas |
| Juegos de historias | 4 | días con ≥1 historia `publicada` |

La vista muestra los 10 huecos de la semana y qué los llena: una pieza con dueño y fecha, o nada. Lo vacío se declara **hueco** con quién lo tenía que disparar. Nunca se estima. Al cerrar la semana, los huecos se escriben solos en `indicadores_semana.huecos`.

### 2.3 Embudo — la audiencia como flujo

Tres anillos con el número de la semana y su sensor. Donde no hay sensor, se ve vacío a propósito:

```
ATRAER      reels · carruseles · pauta fría        → views (Apify), alcance pauta (Meta Ads)
CAPTURAR    historias + keyword → lead magnet      → DMs (manual), leads (go.folklore), suscriptores (Kit)
            pixel → audiencias cálidas              → tamaño de audiencia (Meta Ads)
CONVERTIR   CRITERIO → libro NUM                   → ventas (Stripe · sin sensor todavía)
```

Cada lead magnet es un `recurso` con keyword, slug y tag de Kit; cada historia que lo empuja queda ligada; cada campaña de pauta que lo amplifica queda registrada con su gasto y su audiencia. Así la cadena *historia → keyword → recurso → Kit → CRITERIO → libro* se ve de una pieza, y la pauta deja de ser un lente aparte para ser un nodo más con su propio sensor.

### 2.4 Hoy — lo que Nazho toca

La pantalla de inicio de Nazho, móvil primero, con lo único que requiere su mano: aprobar el paquete de Milo en un toque, ver bloqueos de Mariela, lo que le toca grabar, latidos en rojo. Un solo punto de contacto por entregable.

## 3. Esquema que se agrega

```sql
create table sistemas (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,            -- 'maquina_semanal', 'historias_lead_magnets', 'criterio', 'pauta_pixel'
  nombre text not null, proposito text,
  cadencia interval not null default '7 days',
  nodos jsonb not null default '[]',      -- [{clave, nombre, tipo, dueno, disparador, evidencia:{fuente, filtro}}]
  aristas jsonb not null default '[]',    -- [{de, a, etiqueta}]
  activo boolean not null default true,
  version int not null default 1, updated_at timestamptz default now()
);
create table metas_semana (
  formato text primary key,               -- 'newsletter','reel','carrusel','historia_dia'
  cantidad int not null, desde date not null default current_date
);
create table campanas (                   -- pauta como nodo con sensor
  id uuid primary key default gen_random_uuid(),
  nombre text not null, objetivo text check (objetivo in ('frio','calido','conversion')),
  recurso_id uuid references recursos, pieza_id uuid references piezas,
  meta_campaign_id text, presupuesto_semanal numeric, activa boolean default true
);
-- estado por nodo y semana lo calcula una función, no se guarda:
--   estado_nodos(sistema_clave, semana) → (nodo, estado, evidencia, cuando)
```

`sistemas_registrados` y `corridas` se quedan: son la evidencia de los nodos `ia` y `automatizacion`.

## 4. Los cuatro sistemas iniciales

Seedeados por mí a partir del handoff §8, la estrategia de historias v1.2 y el embudo del 27-ago. Nazho los corrige con Claude.

1. **Máquina semanal** (reels + carruseles): Milo propone (ia, dom 20:00) → Nazho aprueba (humano, lun) → guionistas escriben (ia) → Nazho graba (humano, mar–jue) → Mariela edita/diseña (humano) → Mariela publica con URL (humano) → post-scraper (automatización, diario) → review (ia, vie).
2. **Historias y lead magnets**: Milo propone paquete (ia) → Nazho aprueba (humano) → Mariela publica desde Business Suite (humano+plataforma) → keyword → DM automático (plataforma) → recurso en go.folklore (plataforma) → tag en Kit (automatización) → Mariela anota DMs (humano, día siguiente).
3. **CRITERIO**: criterio-writer borrador (ia, jue) → Nazho revisa y programa en Kit (humano, vie, un clic) → Kit envía (plataforma) → suscriptores (automatización diaria).
4. **Pauta y pixel**: pieza fría con mejor multiplicador (dato) → campaña fría (humano: Fer) → pixel/audiencia cálida (plataforma) → campaña cálida a lead magnet (humano: Fer) → leads (automatización) → CRITERIO → libro.

## 5. Orden de construcción propuesto (sustituye al «siguiente paso» del PLAN)

| # | Qué | Por qué primero |
|---|---|---|
| A | Migración `005_nodo.sql` + seed de los 4 sistemas y las metas | Sin datos no hay mapa |
| B | Vista **Semana** (cuota vs realidad, huecos con dueño) | Es la que Nazho abre el lunes; se hace con lo que ya existe |
| C | Vista **Máquina** con estado por nodo y evidencia al clic | La razón de ser del Nodo |
| D | **Hoy** para Nazho + acciones de dueño (crear pieza, asignar, mover estado, aprobar historias) | Cierra el ciclo desde su lado |
| E | Vista **Embudo** con sensores existentes (Kit, go.folklore) y vacíos explícitos (pauta, ventas) | Muestra dónde faltan sensores |
| F | Diseño: oscuro por defecto, jerarquía tipográfica, densidad de escritorio para Máquina y Embudo | Que se sienta suya |
| G | MCP mínimo (crear_idea, crear_pieza, asignar_tarea, cola_de, proponer/aprobar_historias, definir_sistema, latidos) | Para que Milo y los guionistas escriban en el Nodo |
| H | Import de Notion | Con la máquina lista, las 229 piezas caen en su lugar |
| I | Jobs n8n + sensores de Meta Ads y Kit | Los nodos `automatizacion` y `plataforma` dejan de estar en rojo |

Lo que no cambia: la app no llama a ningún LLM; los sistemas los diseña Claude y la app los muestra; nada corre sin corrida.

## 6. Supuestos que tomo si Nazho no dice lo contrario

- Máquina y Embudo son de escritorio; Hoy y Semana también funcionan en el teléfono.
- Oscuro por defecto, siguiendo DESIGN.md.
- Fer es el nodo humano de pauta; Evelyn no tiene nodo todavía.
- La cuota arranca con los números de este mensaje: 1 newsletter, 3 reels, 2 carruseles, 4 juegos de historias.
