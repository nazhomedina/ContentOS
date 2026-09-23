# Los campos de una pieza — qué hay, para qué sirve y qué sobra

**Fecha:** 2026-09-15 · **Estado:** foto del esquema *antes* de la limpieza. Nazho decidió el mismo día y la migración 011 lo aplicó (ver `decisiones.md`, «Piezas limpias»). Se conserva como registro de por qué cada campo se quedó o se fue.

---

## 1. Cómo está armado hoy, en un párrafo

Hay **una sola tabla `piezas`** para todo lo publicable (reel, yap, carrusel, artículo, newsletter, YouTube, X, canal de IG). Lo que cambia por formato no son las columnas sino las **sub-etapas** que aplican (en código: `subetapas(formato)`) y el **checklist por defecto** de cada tarea. Alrededor de la pieza viven tablas satélite con relación uno-a-muchos: tareas, métricas, comentarios, versiones del contenido y los archivos en Storage. **Historias** es la excepción: tiene tabla propia porque se opera como paquete semanal. **Formatos** es un catálogo aparte al que la pieza apunta; desde el 23-sep es una biblioteca con etiquetas, portada, referencias (tabla `referencias`) y la hipótesis del formato como fila de `hipotesis`.

---

## 2. Los 29 campos de una pieza

Una fila de `piezas` tiene 29 columnas. Un reel usa 25; las otras 4 son de borradores o de legado. La columna «Reels» dice cuántas de las 148 piezas con formato reel tienen el campo lleno hoy; sirve para ver qué se usa de verdad y qué está vacío por diseño o por descuido.

### Núcleo · identidad y estado (8) — se quedan

| Campo | Qué es | Quién lo llena | Reels |
|---|---|---|---|
| `id` | llave interna | sistema | 148 |
| `id_publico` | el ID que se dice en voz alta: `CRI-07`, `ROB-05-A` | sistema por prefijo de formato; el import respetó los de Notion | 148 |
| `titulo` | título de trabajo, con las palabras de Nazho | Nazho o Claude | 148 |
| `formato` | el contenedor: reel · yap · carrusel · historia · x · canal_ig · newsletter · articulo · youtube | Nazho al producir, Claude por MCP | 148 |
| `estado` | borrador → redaccion → grabacion → diseno → listo → programada → publicada (+ archivada, en_trial) | todos, cada quien su tramo | 148 |
| `comunidad_id` | a qué comunidad le habla (hoy una sola) | sistema | 148 |
| `created_at` · `updated_at` | cuándo nació y cuándo se tocó | sistema | 148 |

### Criterio editorial (5) — se quedan, con una duda

| Campo | Qué es | Quién lo llena | Reels | Veredicto |
|---|---|---|---|---|
| `serie` | nombre público de la colección: Criterio, Róbate, Brand Reels, NUM… | Claude o import | 88 | mantener (ver §4 sobre si merece tabla) |
| `format_card_id` | el molde repetible que sigue (FC-01…FC-08) | Claude o import | 46 | mantener; es opcional a propósito |
| `hipotesis` | `{texto, campo, numero, fecha}`: qué espera probar y con qué número se resuelve | Claude en redacción | 148, pero solo 56 con texto y 147 marcadas legado | mantener; es la regla 1 |
| `etapa_embudo` | atraer · capturar · convertir | Claude | 148, todas «atraer» por legado | mantener; hoy no discrimina nada porque el legado entró plano |
| `cta` | el llamado a la acción de la pieza | Claude | 1 | **duda**: en yaps no hay CTA por regla; en reels vive dentro del guion. Candidato a salir de la tabla o a quedarse solo para capturar/convertir |

### Contenido (3) — se quedan, con dos dudas

| Campo | Qué es | Quién lo llena | Reels | Veredicto |
|---|---|---|---|---|
| `guion` | el texto vigente: guion hablado, copy por lámina, texto del artículo, las seis secciones del newsletter | Claude (versionado en `guion_versiones`) | 76 | mantener |
| `spec_visual` | lo que Mariela necesita para producir: texto en pantalla, portada, láminas | Claude | 1 | **duda**: vacío porque en Notion iba dentro del cuerpo. Es el puente a Mariela; se queda si Claude lo llena de aquí en adelante |
| `fidelidad` | mis_palabras · reescribe: cuánto puede reescribir el guionista | Nazho al pedir | 148 (default) | **duda**: es una instrucción de redacción, no un atributo de la pieza. Ya vive en `guion_versiones`; podría salir de `piezas` |

### Operación (4) — dos se quedan, dos se calculan o se van

| Campo | Qué es | Quién lo llena | Reels | Veredicto |
|---|---|---|---|---|
| `responsable_id` | quién la tiene | Nazho | 1 | mantener; hoy casi vacío porque nadie ha asignado |
| `fecha_objetivo` | cuándo debería publicarse | Nazho | 1 | mantener; alimenta Calendario y cuota semanal |
| `programa_aprobado` | exenta del tope de 10 (el reto CRI) | Nazho, import | 1 reel, 31 yaps | mantener; es lo que hace posible tener 30 CRI en grabación |
| `requiere_hipotesis` | bandera roja: está en producción sin hipótesis | import | 15 | **calcular, no guardar**: es `hipotesis.texto is null`. Una columna que se puede derivar termina desincronizada |

### Publicación (3) — se quedan

| Campo | Qué es | Quién lo llena | Reels |
|---|---|---|---|
| `url` | dónde quedó publicada | Mariela al marcar publicada | 24 |
| `plataforma` | instagram · youtube · kit · blog… | Mariela | 24 |
| `publicada_en` | cuándo | sistema al publicar | 2 |

La base exige URL para pasar a publicada. Por eso 14 reels que Notion decía «publicados» sin URL quedaron en Archivo con nota.

### Procedencia (5) — dos se quedan, dos sobran, una es temporal

| Campo | Qué es | Reels | Veredicto |
|---|---|---|---|
| `origen` | legado · nazho · radar · markie · destilado · claude… | 147 | mantener: dice de dónde vino la idea |
| `notas` | cajón: variante, batch de Notion, RAW en Drive, avisos del import | 116 | mantener, vigilando que no se vuelva un segundo guion |
| `notion_url` | la página original | 147 | mantener mientras Notion exista; es lo que hace idempotente el import |
| `formato_sugerido` | lista de formatos posibles para un borrador | 0 (27 en borradores) | **descartar** cuando los borradores tengan formato; sirve un día |
| `idea_id` | FK a la tabla `ideas`, que ya no se usa | 0 | **descartar**, junto con la tabla `ideas` |

### Marca de legado (1) — sobra

| Campo | Qué es | Reels | Veredicto |
|---|---|---|---|
| `etapa_legado` | «la etapa del embudo se puso en atraer por default en el import» | 147 | **descartar**: no informa nada que `origen = legado` no diga |

**Resumen de la poda propuesta:** de 29 columnas, 25 se quedan, 1 se calcula (`requiere_hipotesis`) y 3 se van (`etapa_legado`, `idea_id`, `formato_sugerido`). Tres más quedan en observación: `cta`, `spec_visual`, `fidelidad`.

---

## 3. Lo que no está en la pieza y por qué

Todo lo que puede ocurrir varias veces por pieza vive en una tabla al lado, una fila por evento. Meterlo como columnas obligaría a decidir cuántas veces cabe.

| Tabla | Qué guarda | Relación |
|---|---|---|
| `tareas` | grabar · editar · diseñar · publicar · capturar métricas · revisar, con checklist, vencimiento, bloqueo | muchas por pieza (o por historia) |
| `metricas` | una lectura por fecha y fuente: views, likes, comentarios, saves, follows, multiplicador | serie en el tiempo |
| `comentarios` | conversación entre Nazho y Mariela sobre la pieza | muchas |
| `guion_versiones` | cada guion que Claude guardó, con su hipótesis, spec e instrucción | muchas; la pieza guarda solo el vigente |
| Storage `assets/piezas/{id}/` | RAW, portada, final | archivos |
| `hooks` | banco de ganchos, ligados opcionalmente a la pieza de origen | muchos |

---

## 4. Pieza, formato, serie, Format Card: cómo se relacionan

```
Formato        ─ el contenedor. Decide sub-etapas, quién produce y qué métrica cuenta.
                 Enum cerrado en la pieza (9 valores). No se inventan formatos nuevos a la ligera.

Format Card    ─ la receta repetible con hipótesis de formato: tesis, beats, duración, cadencia,
                 estado de validación (detectado → experimentando → validado → firma → retirado).
                 Catálogo aparte (FC-01…FC-08). Una pieza apunta a una card o a ninguna.

Serie          ─ el nombre público de la colección de episodios: Criterio, Róbate, Brand Reels,
                 Verdades Incómodas, NUM, Así uso Claude… Texto libre en la pieza.

Etapa embudo   ─ para qué sirve la pieza en el negocio: atraer, capturar, convertir. Ortogonal a todo.

Hipótesis      ─ de pieza (la resuelve el multiplicador de esa pieza) y de formato (la resuelve el
                 rollup de la Format Card con ≥ 8 episodios). La primera diagnostica, la segunda decide.
```

- **Formato ≠ Format Card.** Reel es el contenedor; FC-04 «Verdades Incómodas» es la receta que ese reel sigue. Un reel puede no seguir ninguna card (60 de 148 no tienen serie; 102 no tienen card).
- **Serie ≈ Format Card, pero no siempre.** Cada card declara su «serie propia» (FC-08 → Criterio, FC-02 → Róbate). Pero hay series sin card (NUM, Así uso Claude, Serie Fundador, Seang) y podría haber una card con dos series. Por eso hoy son campos separados.
- **¿Serie merece tabla?** Solo si se quiere contar episodios, llevar estado por serie o cerrar una serie con veredicto. Hoy la lista tiene 11 nombres y se filtra bien como texto. Recomendación: texto libre hasta que una pantalla pida algo que el texto no pueda dar.
- **Batch / campaña de Notion** (24JULIO, Q1 2026, NUM) era un agrupador temporal. Entró a `notas`. No se reintroduce como campo; `campanas` en la base es para pauta, otra cosa.

### 4b. La base de Format Cards, campo por campo

Las Format Cards tienen base propia en los dos lados. En Notion son 8 propiedades más 4 rollups; en ContentOS son 8 columnas. Lo que cambió al migrar es que **cuatro campos estructurados de Notion se volvieron prosa** dentro del molde.

| Notion (🧪 Format Cards) | Tipo | ContentOS (`format_cards`) | Estado hoy |
|---|---|---|---|
| Card (FC-01) | texto | `codigo` | igual |
| Nombre | título | `nombre` | igual |
| Estado (detectado · experimentando · validado-propio · firma · retirado) | select | `estado` | igual |
| Serie propia | texto | dentro de `molde` («**Serie propia:** Criterio») | **perdió estructura** |
| Duración | texto | dentro de `molde` | **perdió estructura** |
| Recompensa | texto | dentro de `molde` | **perdió estructura** |
| Cadencia | texto | dentro de `molde` | **perdió estructura** |
| Microcontenidos | relación | `piezas.format_card_id` (al revés: la pieza apunta a la card) | igual, mejor |
| Piezas vinculadas | rollup (count) | se calcula en la pantalla Formatos | igual |
| Multiplicador promedio | rollup (avg) | no se calcula todavía | **falta** |
| Follows totales | rollup (sum) | no se calcula todavía | **falta** |
| Score promedio | rollup de una fórmula de Notion | no existe | se descarta: la fórmula era de Notion |
| — | — | `origen` (de quién se robó el formato) | nuevo |
| — | — | `molde` (la receta completa en markdown: tesis, beats, evidencia) | nuevo |
| — | — | `notas` | nuevo |

Lo que el molde guarda hoy como prosa y valdría tener como columna, porque las pantallas lo pueden usar: `serie_propia` (para que la pieza herede la serie al elegir card), `duracion`, `recompensa`, `cadencia`, y la **hipótesis de formato** (la que se resuelve con ocho episodios). Los rollups no se guardan: se calculan desde `piezas` y `metricas` cuando se abre la card, igual que hoy se calcula «piezas · publicadas · para validar».

**Recomendación:** agregar esas cinco columnas a `format_cards`, dejar `molde` para la receta (beats, evidencia, mecánica visual) y que la pantalla Formatos calcule episodios, publicadas, multiplicador promedio y follows. Es una migración chica y no toca `piezas`.

---

## 5. ¿Artículos, newsletter, largo y corto en la misma tabla?

**Sí, una tabla.** Un artículo, un newsletter y un reel comparten lo que importa para operar: nacen como borrador, pasan por producción, se publican con URL, tienen tareas, métricas y comentarios, cuentan para la cuota semanal y aparecen en el mismo calendario. Separarlos en tablas repetiría tareas, métricas, comentarios, assets y bitácora cinco veces y rompería Calendario e Inicio. Es la decisión de `estructura.md` y la práctica la confirma.

Lo que sí cambia por formato es **el significado** de tres campos y **los datos extra** que cada uno necesita:

| | Reel / yap | Carrusel | Artículo | Newsletter | YouTube | Historia |
|---|---|---|---|---|---|---|
| `guion` significa | guion hablado | copy por lámina | texto completo | las 6 secciones | guion largo con capítulos | copy de la historia |
| `spec_visual` significa | texto en pantalla, portada | láminas, portada | portada, maquetación | plantilla de Kit | miniatura, capítulos | asset o fondo |
| Sub-etapas | redacción · grabación · diseño · listo | redacción · diseño · listo | redacción · diseño · listo | redacción · diseño (armado en Kit) · listo | redacción · grabación · diseño · listo | copy · asset |
| Métrica que manda | views, saves, multiplicador | saves, alcance | lecturas, tiempo | opens, clicks, respuestas | views, retención, suscriptores | views, replies, DMs |
| Datos que solo este formato tiene | duración, RAW en Drive | número de láminas | slug, meta description | número de edición, subject, id del broadcast en Kit | duración, capítulos, id del video | semana, día, registro, keyword, recurso |

**Regla para decidir dónde va un dato nuevo:**

1. Si lo usan tres formatos o más y las pantallas filtran por él → columna en `piezas`.
2. Si lo usa un solo formato → un campo `detalle jsonb` en la pieza, con forma validada por formato. Una columna, no seis; ni una tabla por formato.
3. Si es una serie en el tiempo (métricas, versiones, tareas) → tabla satélite.

Con esa regla, lo que hoy falta se resuelve así:

- **Newsletter:** número de edición, subject y el id del borrador de Kit van en `detalle`. Sus métricas (opens, clicks) entran a `metricas` como columnas nuevas o en un `extra jsonb`; los suscriptores no son de la pieza, son de la cuenta (`indicadores_semana`).
- **Artículo:** slug y meta description en `detalle`; la URL final en `url`.
- **YouTube:** duración y capítulos en `detalle`; retención en `metricas`.
- **Historias:** se quedan en su tabla hasta operar el paquete semanal una vez (decisión del 8-sep). Después se funden como `formato = historia` con `detalle = {semana, dia, registro, keyword, recurso_id}`.

---

## 6. Qué decidir (con mi default si no dices lo contrario)

1. **Podar cuatro columnas:** `etapa_legado`, `idea_id`, `formato_sugerido` se van; `requiere_hipotesis` se calcula. Default: sí, en una migración de limpieza cuando cierre 1.0.
2. **`cta`:** se queda solo como campo opcional para piezas de capturar y convertir. Default: se queda.
3. **`spec_visual`:** se queda y Claude lo llena en cada guion nuevo como «lo que Mariela necesita ver». Default: se queda.
4. **`fidelidad`:** sale de `piezas` y vive solo en `guion_versiones`. Default: se queda por ahora; es barato y el skill lo lee.
5. **`serie`:** texto libre. Default: texto libre.
6. **`detalle jsonb` por formato:** se agrega cuando entre el primer newsletter. Default: sí, esta semana con CRITERIO #001.
7. **Historias:** fusión después de la primera semana operada. Default: no antes.
8. **Format Cards:** sacar del molde a columnas `serie_propia`, `duracion`, `recompensa`, `cadencia` e `hipotesis_formato`; calcular los rollups en pantalla. Default: sí, junto con la poda del punto 1.
