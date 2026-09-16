# Newsletter CRITERIO — cómo vive en ContentOS

**Fecha:** 2026-09-16 · **Spec del formato:** `02 PROYECTOS/NEWSLETTER 2026/00-FORMATO-CRITERIO.md` (copiada como molde de FC-09) · **Plantilla de correo:** `05-PLANTILLA-EMAIL-KIT.md` (v2, 600 px).

## 1. La edición es una pieza

- `tipo = newsletter`, formato **FC-09** (se pone solo), serie **Criterio** (heredada del formato), `id_publico` **NEW-NN**.
- El título lleva el número público: `Criterio #002 — Si tienes que explicar tu diferencia, no eres diferente.` Si se crea sin número, `crear_pieza` lo antepone con la siguiente edición (se lee de los títulos, no se guarda).
- `fecha_objetivo` = el día de envío. El día de la semana vive en el formato (`formatos.dia_envio` de FC-09, viernes hoy; se cambia desde la pantalla Newsletter o con `actualizar_formato`). Sin fecha, `crear_pieza` pone el siguiente envío (`siguiente_envio`). Cambiar el día recorre los próximos envíos y la fecha por defecto de las ediciones nuevas; las ya agendadas conservan su fecha.
- `contenido` = la edición completa en markdown, versionada en `contenido_versiones`: opciones de subject (2 mínimo) y preheader arriba, las 6 secciones, el PS y las notas de producción al final.
- Estados: **redacción** (entrevista en el stream y redacción) → **diseño** (cargada en Kit como borrador, revisión visual) → **listo** (programada en Kit para el viernes 9:00) → **publicada** (enviada, con URL pública). Newsletter no pasa por grabación.
- Hipótesis: obligatoria de diseño en adelante, como toda pieza. Campo típico: `replies` (respuestas al correo) o `leads` cuando el PS empuja un lead magnet. Open rate es salud, no hipótesis.

## 2. El puente con Kit (sin sincronización de regreso)

1. **Redacción en la app.** Claude entrevista en el stream (`agregar_pensamiento` tipo pregunta, 2-3 por ronda), Nazho contesta desde el teléfono, el skill redacta las 6 secciones y guarda con `guardar_contenido`. Antes de mover a diseño, Claude corre el checklist de 8 puntos del molde de FC-09.
2. **Borrador en Kit.** Claude crea el broadcast con su conector de Kit (`create_broadcast`) sobre la plantilla v2, con el subject elegido y el preheader. Guarda en `notas` de la pieza el id del broadcast (ejemplo: `kit: 25356283`). No hay API para programar.
3. **Programación.** Nazho programa el broadcast en la interfaz de Kit para el día de envío a las 9:00 (America/Mexico_City) y mueve la pieza a **listo**.
4. **Envío.** El viernes, tras el envío, la pieza pasa a **publicada** con la URL pública del broadcast (`guardar_url` o `actualizar_pieza`). «Publicada exige URL» aplica igual que a un reel.
5. **Señales.** El viernes siguiente se anotan respuestas y DMs como métrica manual (`registrar_metrica_manual`, campo `replies` / `dms`) y se resuelve la hipótesis cuando venza.

Lo que Kit sabe (opens, clicks) no regresa a la app en 1.0. Cuando exista el job `kit_suscriptores` en n8n, escribirá métricas con fuente `job`.

## 3. La cascada

Cada edición se re-empaca (no se clipea igual): 1 reel (El Criterio hablado), 1 carrusel (El Caso), 2-3 posts de texto. Se crean con `crear_pieza` (tipo reel / carrusel / x, serie Criterio, misma hipótesis o una propia) y se producen el jueves con Mariela. En 1.0 las hijas se crean a mano; la derivación automática queda para después.

## 4. Estado al 16 de septiembre de 2026

- **NEW-01 · Criterio #001 — Marca da dirección. Marketing da tracción.** Escrita desde el 8 de agosto y cargada en Kit como borrador `25356283` (subject «La troca atascada (Criterio #001)»). Registrada en la app en **diseño (en Kit)** con fecha objetivo viernes 18 de septiembre; cuando Nazho la programe en Kit pasa a listo.
- **NEW-02 · Criterio #002 — Si tienes que explicar tu diferencia, no eres diferente.** En **redacción** con tres preguntas de entrevista en el stream, esperando las respuestas de Nazho.

## 5. La pantalla Newsletter (16 de septiembre de 2026)

No usa los carriles de producción de Reels: la redacción pasa en Claude y aquí solo importa qué edición sale qué día y qué le falta. Izquierda, las ediciones agrupadas por lo que les falta (lista para enviar · en Kit por programar · en redacción · borradores), una línea por edición con su fecha y una sola señal (rojo: venció o sin hipótesis; ámbar: programar en Kit; azul: preguntas sin responder en el stream). Derecha, los próximos ocho envíos: cada uno tiene edición o dice «Sin edición · Agendar», y agendar crea el borrador con el siguiente número en esa fecha. El día de envío se elige ahí mismo. La vista Publicadas guarda las enviadas con su liga. Canvas: https://claude.ai/artifact/4wQCYiekYC59M3mXKU8Euu.
