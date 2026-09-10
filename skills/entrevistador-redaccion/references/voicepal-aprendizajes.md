# VoicePal — qué hace y qué se toma

Fuente: diseño del Taller de Contenido (2026-09-06, §2 y anexo B). Sparkle Studios (Ali Abdaal), «a ghostwriter in your pocket». $9.99/mes.

## La mecánica, en el orden en que la usa alguien

1. **Captura sin fricción.** Un botón, grabación en segundo plano, también texto o audio subido. El timer corriendo empuja a seguir hablando: «la conciencia de que el silencio se graba me anima a no autoeditar».
2. **Dos transcripts.** Crudo y pulido, con un dial de cuánto limpiar.
3. **Shadow reader.** Tras cada grabación, preguntas de seguimiento contextuales, tipo entrevista; eliges cuáles contestar, grabas, salen nuevas. **Es el producto.** Las reseñas más lúcidas lo dicen: el valor no está en el newsletter que escribe, flojo, sino en el shadow reader.
4. **Stream.** Un tema que crece con varias grabaciones y respuestas; no «una nota».
5. **Preset.** Tono + formato + muestras propias + dial de creatividad («usa sobre todo mis palabras»).
6. **Borrador por formato** desde el stream.

## Quejas documentadas

Preguntas repetitivas y sin refresh · output genérico · sin export masivo · bugs de procesamiento.

## Traducción a ContentOS

| VoicePal | ContentOS |
|---|---|
| Grabar → transcript | `agregar_pensamiento(tipo: voz, transcript)` |
| Shadow reader | Este skill, modo Entrevistar; máximo dos rondas para no caer en la queja de «preguntas repetitivas» |
| Stream | La pieza en borrador o redacción; `stream_de` |
| Preset | VOZ-MAESTRA + registros (íntimo · editorial · estratégico); vive en los skills, no en la app |
| Dial de creatividad | `fidelidad`: `mis_palabras` · `reescribe` |
| Borrador por formato | Los guionistas por formato; `guardar_guion` versiona |

## Por qué invertir el orden funciona para Nazho

El reto CRI falló en «grabar el yap»: la tarjeta daba tema, contexto y tensión, pero el paso siguiente era pararse frente a la cámara con un guion. Hablar dos minutos sin cámara, contestando la pregunta de la tarjeta, produce el guion desde el transcript. El yap a cámara se vuelve la segunda toma, ya con lo que dijo.
