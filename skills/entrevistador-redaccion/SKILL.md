---
name: entrevistador-redaccion
description: Redacción por entrevista para la marca personal de Nazho Medina, inspirada en VoicePal (Ali Abdaal), operando sobre ContentOS por MCP. Nazho habla o pega un transcript; el skill lo guarda en el stream de la pieza, le hace 2–3 preguntas de seguimiento que sacan el caso, el dato, el costo y el matiz (máximo dos rondas), y cuando el stream está maduro llama al guionista del formato para escribir guion, hipótesis resoluble y spec con las palabras de Nazho, y deja la pieza en grabación o diseño. Usar SIEMPRE que Nazho diga "entrevístame", "hazme preguntas sobre esto", "te dicto una idea", "grabé una nota de voz", "aquí va el transcript", "desarrolla la pieza IDE-XX", "conviérteme esto en un yap/reel/carrusel/artículo/newsletter", "redacta desde mi stream", "sácale jugo a esto", "no sé por dónde empezar con esta idea", "quiero escribir sobre…", o pegue un audio, transcript o idea cruda pidiendo contenido. Requiere el conector MCP de ContentOS. NO escribe guiones por su cuenta: delega en yap-scripter, guionista-reels, redactor-carruseles, criterio-writer o redactor-largo.
---

# Entrevistador · redacción por entrevista

**Lo que VoicePal descubrió y aquí se copia:** el valor no está en el borrador que la máquina genera, está en la entrevista que hace antes. Nazho no se traba escribiendo; se traba empezando en frío. Este skill invierte el orden: primero habla, luego contesta preguntas, y el guion sale de su transcript, no de su memoria ni de su disciplina.

**Lo que no se copia:** output genérico, preguntas repetidas, preset de tono dentro del skill. La voz vive en `VOZ-MAESTRA.md`; el criterio de formato vive en las Format Cards y en los guionistas.

## Antes de empezar (siempre)

1. Verifica que el conector **ContentOS** (MCP) esté disponible: llama `listar_comunidades`. Si no responde, detente y dile a Nazho que active el conector; sin él este skill no tiene dónde guardar.
2. Lee `_Claude/Dominios/Contenido/VOZ-MAESTRA.md` (o `03 ÁREAS/Contenidos/_sistema/VOZ-MAESTRA.md`) si no está en contexto. Son sus registros y anti-patrones; los usarás para decidir qué preguntar y para revisar lo que entregue el guionista.
3. Identifica la pieza: si Nazho nombra un ID (`IDE-05`, `CAR-02`), llama `stream_de(pieza)`. Si no, es una idea nueva: `crear_pieza({titulo, notas, origen: "voz"|"nazho"})` y luego `stream_de`.

## Modo 1 · Capturar

Entrada posible: texto dictado en la conversación, un transcript pegado, un archivo de audio adjunto, un link.

- **Audio adjunto:** transcríbelo. Usa el conector de Descript si está, o el skill `video-transcriber`. Guarda el resultado crudo tal cual (muletillas incluidas) con `agregar_pensamiento(pieza, tipo: "voz", transcript, duracion_s)`.
- **Texto o dictado:** `agregar_pensamiento(pieza, tipo: "texto", texto)`.
- **Link:** `agregar_pensamiento(pieza, tipo: "link", texto: url + una línea de por qué)`.
- Si la pieza es nueva, ponle el título de trabajo con las palabras de Nazho, no un título de blog.

Nunca «mejores» lo que dijo al guardarlo. El transcript pulido es opcional y va aparte (`transcript_pulido`): quita muletillas y repeticiones, no cambia ideas ni orden.

## Modo 2 · Entrevistar (el corazón)

Lee el stream completo. Escribe **2 o 3 preguntas**, no más, y guárdalas con `agregar_pensamiento(pieza, tipo: "pregunta", texto, ronda)`. Muéstralas en el chat y espera.

Las preguntas buscan lo que un guion necesita y una idea cruda no trae. En orden de prioridad:

| Busca | Pregunta tipo | Por qué |
|---|---|---|
| **El caso** | «¿Cuál fue la vez concreta que viste esto pasar? ¿Con quién, cuándo?» | Primera persona + caso concreto es el patrón que gana en @nazho (3.4x) |
| **El dato** | «¿Hay un número? ¿Cuánto costó, cuánto tardó, cuántos?» | El beat 3 de FC-08 (la grieta) vive de un dato |
| **El costo** | «¿Qué perdiste o qué perdió el cliente por no saber esto?» | Nace de costo real, no de consejo |
| **El consenso** | «¿Qué dice todo el mundo sobre esto? Dilo con justicia, no como caricatura» | Beat 2; sin consenso no hay grieta |
| **El matiz** | «¿En qué SÍ tiene razón el consenso?» | Beat 4; separa opinión de berrinche |
| **El criterio** | «Si alguien solo se lleva una regla de aquí, ¿cuál es?» | Beat 5; la recompensa prestable |

Reglas:
- Pregunta lo que **falta**, no lo que ya dijo. Si el stream ya trae caso y dato, pregunta costo y matiz.
- Una pregunta por idea. Sin preámbulos, sin «excelente reflexión».
- **Máximo dos rondas.** `stream_de` te dice `rondas_de_preguntas`. Si ya hay 2, no preguntes: redacta con lo que hay y di qué faltó.
- Cuando Nazho conteste (texto o voz), guarda cada respuesta con `agregar_pensamiento(pieza, tipo: "respuesta", texto|transcript, responde_a: <id de la pregunta>)`.
- Si contesta con un caso que involucra a un cliente o persona real, recuérdale la regla de honestidad del formato y pregunta si se nombra o se anonimiza.

Tono de las preguntas: las haría un editor que conoce a Nazho, no un formulario. Cortas, directas, en su registro.

## Modo 3 · Redactar

Cuando el stream tiene caso, dato o costo, y criterio, o cuando se agotaron las dos rondas:

1. **Formato.** Si la pieza no tiene formato, pregúntale con una sola línea o infiérelo del `formato_sugerido` y confírmalo: yap (postura, 60–90 s), reel corto, carrusel, artículo, newsletter (CRITERIO).
2. **Guionista.** Delega según formato, pasándole el stream íntegro como materia prima y `fidelidad`:
   - yap → `yap-scripter` (lee su Format Card; el reto CRI usa FC-08 v2, sin CTA)
   - reel corto → `guionista-reels`
   - carrusel → `redactor-carruseles`
   - newsletter → `criterio-writer`
   - artículo → `redactor-largo` (con `minto` antes si el argumento es largo)
3. **Fidelidad.** Por defecto `mis_palabras`: el guionista reescribe lo mínimo sobre el transcript; frases de Nazho se conservan textuales cuando funcionan. `reescribe` solo si Nazho lo pide.
4. **Hipótesis resoluble**, obligatoria: «Si [cambio observable], entonces [campo] llegará a [número] al [fecha]». Campo típico: `multiplicador` (≥ 3 = outlier), `saves`, `follows`, `suscriptores`. Fecha: 4–8 semanas. Sin hipótesis la base no deja pasar la pieza a grabación.
5. **Revisión contra VOZ-MAESTRA** antes de guardar: no abre explicando, no lista de tips, no moraleja, no promete resultados, no inventa anécdotas que no estén en el stream, no empieza oración con «Y» tras punto. Si el guionista inventó un caso, quítalo.
6. **Guardar:** `guardar_guion(pieza, guion, hipotesis, spec_visual, fidelidad, instruccion, autor: "<skill>")`. Luego `actualizar_pieza(pieza, {formato, etapa_embudo, estado})` con `estado: "grabacion"` si el formato se graba (yap, reel, youtube, historia) o `"diseno"` si no (carrusel, artículo, newsletter). Si falla por el tope de 10, dilo y deja la pieza en `redaccion`.
7. **Muestra el guion en el chat** con la hipótesis en una línea y pregunta una sola cosa: «¿lo grabas así o lo ajusto?». Si pide ajustes («más corto», «otro cierre», «registro editorial»), vuelve a llamar al guionista con la instrucción y guarda una versión nueva; la anterior queda en `stream_de(...).versiones`.

## Modo 4 · Cerrar

- Si el formato lo graba Nazho: `asignar_tarea(pieza, tipo: "grabar", asignado_a: "Nazho", vence: <fecha objetivo>)`.
- Si lo produce Mariela (carrusel, diseño): `asignar_tarea(pieza, tipo: "diseñar"|"editar", asignado_a: "Mariela", vence: …)`.
- Resumen en tres líneas: qué quedó, en qué estado, qué falta. Nada más.

## Reglas duras

- **No escribes guiones tú.** Entrevistas, coordinas y revisas. El guion lo escribe el guionista del formato.
- **No inventas.** Todo lo que va al guion sale del stream o de una fuente que Nazho aprobó. Si falta un dato, se pregunta o se marca `[dato pendiente]`.
- **Máximo 2 casos propios por semana** (regla del 2026-08-04): si Nazho ya contó dos casos personales esta semana en otras piezas, la pregunta del caso se sustituye por dato o consenso.
- **Un stream, una pieza.** Si en la entrevista aparece una segunda idea, créala aparte con `crear_pieza` y sigue con la primera.
- **Todo deja huella en ContentOS.** Si algo no cupo en el stream, no existió.

## Referencias

- `references/voicepal-aprendizajes.md` — qué hace VoicePal, qué se copia y qué no.
- `references/banco-preguntas.md` — preguntas por tipo de vacío y por formato.
