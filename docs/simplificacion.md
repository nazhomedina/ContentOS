# Simplificación — qué está bien, qué sobra

**Fecha:** 2026-09-07 · **Origen:** Nazho, tras usar la plataforma: «la siento pesada y confusa». Pide interfaz blanca con menú a la izquierda, una sola base de piezas que nacen como ideas, una base de formatos, quizá una de hooks, menos campos por pieza y que las hipótesis las llene Claude.

## 1. Diagnóstico honesto

Construimos dos capas en dos días y las dos se notan:

1. **El handoff** venía de una sesión de diseño que modeló todo lo que el sistema de contenido podría necesitar: 15 tablas, 3 roles, 8 estados, historias como mundo aparte, comunidades como raíz. Es un modelo correcto para un sistema que ya opera. Pero el sistema no ha operado ni una semana, y la regla de Nazho es *vender antes de construir*: operar a mano antes de desarrollar. Se construyó el esquema completo antes de operar.
2. **El Nodo** lo pediste tú y lo sigo creyendo correcto como idea, pero lo desplegué en cuatro pantallas (Hoy, Semana, Máquina, Embudo) más Latidos. Un «nodo» es una vista, no cinco.

Resultado: nueve entradas de menú para el owner, un formulario de pieza con veinte campos, dos bases (ideas y piezas) para lo que en tu cabeza es una sola cosa, y una pantalla de Embudo que hoy es casi toda «sin sensor». Nada de eso está roto. Sobra.

## 2. Veredicto por pieza

| Qué | Veredicto | Por qué |
|---|---|---|
| `piezas` | **Queda y absorbe a `ideas`** | Tu modelo mental: una pieza nace como idea y se transforma. Un solo lugar, un solo listado, filtrado por estado. |
| `ideas` + pantalla Ideas | **Se funde en piezas** (estado `idea`) | Dos bases para una sola cosa. Las 30 importadas pasan a piezas en estado idea sin perder nada. |
| `format_cards` | **Queda y gana pantalla** | Es tu segunda base. Hoy solo existe en el seed, sin vista. |
| `hooks` | **Queda, ligera, después** | Tabla simple (texto, categoría, formato, pieza de origen). La llena Claude. No urge. |
| `tareas` + Cola | **Queda** | Es lo que Mariela usa. Se simplifica el checklist. |
| `historias` + pantalla | **Queda por ahora; candidata a fundirse** | Tienen campos propios (día, serie, registro, keyword). Fundirlas en piezas con `formato = historia` es la dirección, en una segunda fase. |
| `comunidades` | **Se esconde** | Tienes una. Queda como columna con default; desaparece de formularios y pantallas. |
| `pensamientos` | **Se esconde** | Es la voz (v3). No se toca. |
| `recursos`, `campanas`, `indicadores_semana` | **Se esconden** | Sin sensores no aportan. Las tablas se quedan para cuando lleguen los jobs. |
| `sistemas`, `metas_semana`, `huecos`, `corridas` | **Quedan** | Son el Nodo. Se muestran en una sola vista. |
| Pantalla **Hoy** | **Queda como Inicio** y absorbe Semana | Lo que espera tu mano + cuota de la semana + estado de la máquina en una pantalla. |
| Pantalla **Semana** | **Se funde en Inicio** | Era la cuota; cabe arriba de Inicio. |
| Pantalla **Máquina** | **Queda como Sistemas** y absorbe Latidos | Vista secundaria, desde Inicio. Los latidos son una fila más de cada sistema. |
| Pantalla **Embudo** | **Se esconde** | Hoy son placeholders. Vuelve cuando existan sensores (Kit, Meta Ads, go.folklore). |
| Pantalla **Latidos** | **Se funde en Sistemas** | Duplicaba información. |
| Formulario **Nueva pieza** (20 campos) | **Se reduce a un título** | Capturar es escribir una línea. Lo demás lo completa Claude por MCP o se llena solo. |
| **Hipótesis obligatoria al crear** | **Se mueve de sitio** | Sigue siendo regla del esquema, pero exigida al pasar a `para_grabar` (guion listo), que es cuando Claude escribe guion e hipótesis juntos. Nazho nunca la teclea. |
| `id_publico` a mano | **Se genera solo** | Prefijo por serie o formato, número consecutivo. |
| `etapa_embudo`, `cta`, `fidelidad`, `spec_visual`, `programa_aprobado` | **Salen del formulario** | Los llena Claude o tienen default. Se ven en el detalle, plegados. |
| Tema **oscuro** | **Cambia a blanco** | Petición directa. El negro queda para botones y el sidebar como en nazho.mx. |
| Navegación superior + barra inferior | **Cambia a menú lateral** | Petición directa. Escritorio con sidebar fijo; móvil con el mismo menú plegable. |
| MCP (19 tools) | **Queda; se recorta a 12** | `crear_idea`/`mover_idea`/`listar_ideas` se vuelven `crear_pieza` con estado idea y `listar_piezas`. Menos superficie, mismo poder. |
| Roles owner/editor/viewer | **Quedan owner y editor** | Viewer no tiene pantalla útil todavía; se activa cuando haya algo que ver. |

## 3. El modelo que queda

Tres bases visibles y una máquina:

```
PIEZAS      idea → para_producir → para_grabar → edicion → buffer → programada → publicada → archivada
            (una fila desde la primera línea hasta la URL publicada)
FORMATOS    las Format Cards: código, nombre, estado, molde, episodios
HOOKS       (después) texto, categoría, formato, pieza de origen
MÁQUINA     sistemas · cuota · huecos · corridas, en una vista
```

**La pieza, para el humano:** título · formato · estado · fecha objetivo · responsable · guion. Seis cosas.
**La pieza, para Claude:** además hipótesis, format card, serie, etapa, CTA, spec visual, fidelidad. Se ven en el detalle, plegadas bajo «Lo que llenó Claude».

**Regla de la hipótesis, reformulada:** una pieza no pasa a `para_grabar` sin hipótesis resoluble. Sigue siendo el esquema quien lo impide, no un documento. Cambia quién la escribe: Claude, al escribir el guion.

## 4. Las pantallas que quedan

Menú lateral, fondo blanco, cinco entradas para Nazho, dos para Mariela.

| Pantalla | Qué muestra | Quién |
|---|---|---|
| **Inicio** | Lo que espera tu mano (aprobar, bloqueos, grabar) · cuota de la semana con huecos · estado de los sistemas en una línea cada uno | Nazho |
| **Piezas** | Una lista con filtros por estado y formato. Arriba, una caja para capturar una idea en una línea. Detalle con guion, tareas, assets, comentarios y lo que llenó Claude, plegado. | ambos |
| **Formatos** | Las Format Cards con estado, molde y piezas ligadas | Nazho |
| **Sistemas** | La máquina: cada sistema con sus nodos y evidencia; latidos incluidos; declarar hueco | Nazho |
| **Cola** | Tareas por hoy, semana, bloqueadas, hechas | ambos |
| **Historias** | Como hoy, hasta que se fundan en piezas | ambos |

## 5. Qué cambia en la base (migración 007)

- `piezas.estado` acepta `idea`. `hipotesis`, `etapa_embudo` y `formato` pasan a `nullable`; un check exige los tres a partir de `para_grabar`. El tope de 10 se sigue contando en `para_producir` + `para_grabar`.
- Las 30 filas de `ideas` se copian a `piezas` con `estado = 'idea'`, conservando origen, notas y `notion_url`. La tabla `ideas` se queda vacía y se deja de usar (se borra en una migración posterior, cuando nada la lea).
- `id_publico` se genera por trigger si viene vacío: prefijo de la serie (si tiene) o del formato (`REE`, `CAR`, `HIS`, `NEW`, `YT`, `IDE` para ideas), número consecutivo.
- `comunidad_id` con default a la comunidad activa.
- Tabla `hooks` mínima, sin pantalla todavía.

## 6. Qué se pierde y qué no

No se pierde ningún dato: las tablas escondidas siguen ahí, las 30 ideas pasan a piezas con su historia intacta, las migraciones aplicadas no se revierten. Se pierde superficie: cuatro pantallas menos, catorce campos menos en el formulario, un menú en vez de dos.

Lo que sí cambia de fondo: la pieza deja de ser «una unidad publicable con hipótesis» para ser «una cosa que nace como idea y algún día tiene URL». La hipótesis sigue siendo obligatoria para grabar, no para pensar.

## 7. Orden de trabajo propuesto

1. Migración 007 + mover las 30 ideas a piezas.
2. Layout blanco con sidebar; quitar barra inferior y tema oscuro.
3. Piezas: lista única con captura de una línea; detalle simplificado con «Lo que llenó Claude» plegado.
4. Inicio (Hoy + Semana) y Sistemas (Máquina + Latidos). Esconder Embudo, Ideas, Semana, Latidos.
5. Formatos: pantalla de lectura.
6. MCP: recorte a 12 tools; `crear_pieza` acepta estado idea sin hipótesis.
7. Pruebas actualizadas y commit.
