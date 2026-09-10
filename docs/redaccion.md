# Redacción — propuesta del módulo

**Fecha:** 2026-09-09 · **Origen:** Nazho pide un módulo de redacción inspirado en VoicePal (Ali Abdaal).
**Base:** handoff §10 (Voz, v3) y diseño §2 (VoicePal: qué se toma). Este documento lo aterriza a la estructura vigente.

## 1. Qué se toma de VoicePal y qué no

| VoicePal | Se toma | Cómo queda en ContentOS |
|---|---|---|
| Grabar sin fricción, timer corriendo | sí | Botón de voz en el teléfono (web, sin app nativa) y Atajo de iOS / WhatsApp como entradas alternas |
| Dos transcripts: crudo y pulido | sí | `transcript_crudo` (Whisper) y `transcript_pulido` (Claude) en cada pensamiento |
| Shadow reader: preguntas de seguimiento | **es el producto** | Skill `entrevistador` vía MCP: 2–3 preguntas por ronda, máximo 2 rondas |
| Stream: un tema que crece | sí | = la pieza en borrador o redacción; sus pensamientos son el stream |
| Preset de tono + muestras propias | sí, fuera de la app | VOZ-MAESTRA y los registros viven en tus skills |
| Dial «usa mis palabras» | sí | Columna `fidelidad`: `mis_palabras` · `reescribe` |
| Borrador por formato | sí | El guion de la pieza, escrito por el guionista del formato |
| App nativa, modo conversacional hablado, trial 24 h, output genérico | no | — |

Regla que no cambia: **la app no llama a ningún LLM.** Claude escribe preguntas y guiones por MCP. La única llamada externa nueva es Whisper para transcribir, y la hace n8n como job con latido, no la app.

## 2. El flujo, paso a paso

```
1 · CAPTURA        Nazho habla 1–3 min desde el teléfono (o pega texto o un link)
                   → pieza en borrador (si no existía) + pensamiento tipo voz con audio en Storage
2 · TRANSCRIPCIÓN  n8n · job voz_transcribir: audio nuevo → Whisper → transcript_crudo · corrida
3 · ENTREVISTA     Claude (entrevistador) lee el stream y deja 2–3 preguntas como pensamientos
                   tipo pregunta. Nazho contesta por voz o texto → tipo respuesta. Máximo 2 rondas.
4 · REDACCIÓN      Nazho aprieta «Producir» con formato → redacción. Claude (guionista del
                   formato) escribe guion + hipótesis + spec con fidelidad = mis_palabras
                   → la pieza pasa a grabación o diseño. Nazho ve el guion, lo corrige, y si
                   quiere otra versión pide «reescribe» o «más corto» (nueva solicitud).
5 · DERIVACIÓN     (después) derivador: de una pieza salen hijas en otros formatos
```

**Cómo llega Claude sin que Nazho abra Claude.** Una cola de solicitudes en la base: al capturar voz, al pedir preguntas o al pedir borrador, la app inserta una `solicitud` (pieza, tipo, estado pendiente). Una rutina de Claude en la nube corre cada 30 minutos entre 7:00 y 22:00, lee `solicitudes_pendientes` por MCP, atiende cada una con el skill que corresponde y la marca hecha con corrida. Si Nazho está en Claude Code o Cowork, puede pedirlo en vivo y la solicitud se cierra igual. Así el módulo funciona desde el teléfono sin depender de que Nazho esté sentado frente a Claude.

## 3. Esquema que se agrega (migración 010)

```sql
-- pensamientos: se reapunta de ideas a piezas (las ideas ya son piezas)
alter table pensamientos add column pieza_id uuid references piezas on delete cascade;
-- tipos: voz · texto · link · pregunta · respuesta (ya existen)
-- audio_url · transcript_crudo · transcript_pulido · texto · responde_a · autor (ya existen)
alter table pensamientos add column duracion_s int, add column ronda smallint;

create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references piezas on delete cascade,
  tipo text not null check (tipo in ('transcribir','preguntar','redactar','pulir','reescribir')),
  instruccion text,                      -- «más corto», «registro editorial», «dame 3 aperturas»
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','hecha','error')),
  resultado text, atendida_por text, created_at timestamptz default now(), atendida_en timestamptz
);
-- guion_versiones: cada borrador de Claude se guarda; Nazho puede volver al anterior
create table guion_versiones (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references piezas on delete cascade,
  version int not null, guion text not null, hipotesis jsonb, spec_visual text,
  fidelidad text, instruccion text, autor text, created_at timestamptz default now()
);
```

Funciones: `crear_solicitud`, `solicitudes_pendientes()` (owner y MCP), `cerrar_solicitud`. Storage: `assets/voz/{user}/{fecha}/{archivo}.webm|m4a`.

## 4. Pantallas

**Redacción de una pieza** (`/piezas/[id]` cuando está en borrador o redacción; también accesible desde Ideas y desde cada pestaña):

```
┌─ Stream ─────────────────────────┬─ Guion ───────────────────────────────┐
│ ● Grabar   ✎ Texto   🔗 Link    │ [versión 2 · Claude · mis palabras]   │
│                                  │                                       │
│ 🎙 voz · 2:14 · transcrito       │ ## Beats                              │
│   «…lo que nadie te dice de…»    │ 1. La afirmación…                     │
│ ❓ Claude: ¿Cuál fue el proyecto │ …                                     │
│    que te enseñó esto?           │                                       │
│ 🎙 respuesta · 1:02              │ Hipótesis: si… entonces… al…          │
│ ❓ Claude: ¿Qué te costó?        │                                       │
│ 🎙 respuesta · 0:48              │ [Pedir preguntas] [Pedir borrador ▾]  │
│                                  │  mis palabras ◉  reescribe ○          │
│ solicitud: preguntar · pendiente │ [Producir como reel ▾]                │
└──────────────────────────────────┴───────────────────────────────────────┘
```

- **Grabar** usa el micrófono del navegador (funciona en Safari de iPhone). Sube el audio y crea la solicitud `transcribir`.
- **Pedir preguntas** crea `preguntar`; **Pedir borrador** crea `redactar` con la instrucción opcional y la fidelidad elegida.
- Las solicitudes pendientes se ven en el stream con su estado; al atenderse, la pantalla se actualiza.
- Cada guion que escribe Claude entra a `guion_versiones`; hay «versión anterior» y «volver».

**Captura rápida por voz** en Inicio e Ideas: un botón grande de micrófono que crea borrador + pensamiento en un toque. Es el reemplazo del «Markie por WhatsApp» para contenido.

**Ideas** muestra por borrador cuántos pensamientos tiene y si hay preguntas sin contestar: ahí se ve qué stream está maduro para producir.

## 5. Qué hace cada quien

| Quién | Qué |
|---|---|
| Nazho | habla, contesta, aprieta Producir, corrige el guion |
| App | guarda audio, stream, solicitudes y versiones; muestra todo |
| n8n | transcribe (Whisper) y deja corrida |
| Claude (rutina cada 30 min o en vivo) | `entrevistador`: preguntas · guionistas: guion + hipótesis + spec · `pulir`: transcript pulido |
| Mariela | no toca este módulo; recibe la pieza cuando pasa a grabación o diseño |

## 6. Orden de construcción

1. Migración 010 (pensamientos → piezas, solicitudes, guion_versiones) + MCP: `stream_de`, `agregar_pensamiento`, `solicitudes_pendientes`, `cerrar_solicitud`, `guardar_guion` (versiona).
2. Pantalla Redacción con stream, grabador de voz, texto y link, botones de solicitud y versiones.
3. Job n8n `voz_transcribir` (Whisper) con latido; mientras no exista, la transcripción la hace Claude con Descript MCP cuando atiende la solicitud.
4. Rutina de Claude en la nube «atender solicitudes» cada 30 min con los skills entrevistador y guionistas. La escribo yo con el skill `schedule`; el criterio (prompts) lo revisas tú.
5. Botón de voz en Inicio e Ideas; Atajo de iOS opcional.

Criterio de cierre: desde el teléfono, Nazho graba 2 minutos sobre una tarjeta CRI, contesta dos preguntas de Claude sin abrir Claude, aprieta Producir como yap, y en menos de una hora tiene guion con hipótesis en grabación, con su voz y sin haber escrito una línea.

## 7. Lo que decido si no dices lo contrario

- Whisper en n8n como única llamada externa de transcripción; Descript como respaldo desde Claude.
- La rutina de Claude corre cada 30 minutos de 7:00 a 22:00, con tope de 20 solicitudes por corrida.
- Fidelidad por defecto: `mis_palabras`.
- Máximo dos rondas de preguntas por pieza; a la tercera, Claude redacta con lo que hay.
