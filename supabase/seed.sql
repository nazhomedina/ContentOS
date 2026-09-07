-- Seed de ContentOS (handoff §5). Idempotente: se puede correr más de una vez.
-- Comunidades · Format Cards (moldes de _Claude/Creaciones/format-lab/cards/) ·
-- lista blanca de perfiles · sistemas registrados.

-- ---------------------------------------------------------------------------
-- Comunidades (docs/comunidades.md)
-- ---------------------------------------------------------------------------
insert into comunidades (id, nombre, icp, dolor, promesa, tono_default, canales, activa) values
(
  '11111111-0000-4000-8000-000000000001',
  'Fundadores con criterio',
  'Fundador o dueño de negocio en México, con poder de decisión y capital disponible, que está lanzando algo nuevo o siente que su marca se quedó atrás de lo que ya opera y cobra. Ya se equivocó al menos una vez contratando barato.',
  'Su marca no refleja su nivel ni atrae al cliente que quiere; le llegan clientes que regatean y preguntan precio antes que valor. Sabe que tiene el problema, pero no distingue entre un diseñador barato y un estratega, así que no sabe en quién confiar.',
  'Criterio para decidir sobre su marca y su marketing sin depender de proveedores: qué cambiar, en qué orden y qué ignorar. «No necesitas más marketing. Necesitas mejor marketing.»',
  'intimo',
  array['instagram','newsletter','youtube','x'],
  true
),
(
  '11111111-0000-4000-8000-000000000002',
  '(por definir)',
  null, null, null, null, '{}', false
)
on conflict (id) do update set
  nombre = excluded.nombre, icp = excluded.icp, dolor = excluded.dolor, promesa = excluded.promesa,
  tono_default = excluded.tono_default, canales = excluded.canales, activa = excluded.activa;

-- ---------------------------------------------------------------------------
-- Lista blanca de acceso (correo de Mariela confirmado 2026-09-07).
-- ---------------------------------------------------------------------------
insert into perfiles_permitidos (email, nombre, rol, comunidades) values
  ('nazho@flk.mx', 'Nazho Medina', 'owner', array['11111111-0000-4000-8000-000000000001'::uuid]),
  ('mariela@sacredadsociety.com', 'Mariela', 'editor', array['11111111-0000-4000-8000-000000000001'::uuid])
on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol, comunidades = excluded.comunidades;

-- ---------------------------------------------------------------------------
-- Sistemas que deben latir (handoff §5)
-- ---------------------------------------------------------------------------
insert into sistemas_registrados (nombre, esperado_cada, descripcion) values
  ('post_scraper_grilla', interval '1 day', 'n8n 6:00 · piezas publicadas <30d → Apify → metricas(apify) → multiplicador'),
  ('snapshot_seguidores', interval '1 day', 'n8n 5:00 · perfil @nazho → indicadores_semana.seguidores'),
  ('kit_suscriptores',    interval '1 day', 'n8n · Kit get_growth_stats → indicadores_semana.suscriptores'),
  ('go_leads',            interval '1 day', 'n8n · Supabase Folklore Leads → recursos.leads, indicadores_semana.leads'),
  ('sprint_lunes',        interval '7 days', 'Milo por MCP · propone parrilla y paquete de historias'),
  ('review_viernes',      interval '7 days', 'Milo por MCP · lee métricas, escribe hallazgos y huecos'),
  ('espejo_md',           interval '1 day', 'script · exporta .md fechados al bucket espejo/'),
  ('recalcular_multiplicadores', interval '1 day', 'pg_cron nocturno · metricas.multiplicador')
on conflict (nombre) do update set esperado_cada = excluded.esperado_cada, descripcion = excluded.descripcion;

-- ---------------------------------------------------------------------------
-- Format Cards. Estados como en Notion (2026-09-06).
-- ---------------------------------------------------------------------------
insert into format_cards (codigo, nombre, estado, origen, molde) values
('FC-01', 'React-Análisis de anuncios (Brand Reels)', 'experimentando', '@brendankane', $md$# FC-01 · React-Análisis de anuncios y campañas

**Estado:** experimentando (batch Julio 2026, Ep. 1-4 en Notion "Para producir")
**Serie propia:** Brand Reels
**Cadencia objetivo:** 1-2/semana

## Estructura

1. **Gancho (0-1.7s):** el anuncio/campaña ajena arranca reproduciéndose — atención prestada de marca conocida. Texto overlay con la premisa.
2. Clip del material (5-20s, editado a lo esencial)
3. Corte a Nazho a cámara: análisis en 2-3 beats (qué parece que hace vs qué hace en realidad)
4. Cierre con principio aplicable o aforismo. Sin moraleja.

**Mecánica visual:** clip primero o tela dividida; lo-fi a cámara en el análisis. Mismo encuadre siempre.
**Duración:** 45-90s · **Recompensa:** insight ("ahora entiendo por qué me gustó")
**Por qué retiene:** curiosidad + payoff de experto; el material ajeno hace el trabajo de hook.

## Evidencia externa

- @brendankane — "Best ad I've seen this week" (Jack in the Box): **854x**, 24M views — https://www.instagram.com/reel/CsrXJznAbSZ/
- @brendankane — React a MetLife: **787x**, 22M — https://www.instagram.com/reel/CqDyeFyjzOg/
- @brendankane — "Dos videos, mismo concepto, solo uno hizo 419M": **7.2x** — https://www.instagram.com/reel/DQfHwTkkyLb/ (variante comparativa)

## Piezas propias

| Ep | Título | Notas |
|---|---|---|
| 1 | El país que ganó Cannes sin hacer anuncios | Coyuntural Cannes 2026 |
| 2 | Oreo ganó 7 leones con unas vacas | |
| 3 | La terquedad de Victoria | Meta-tesis de repetición |
| 4 | Tecate no hizo un comercial, hizo contratos | |
$md$),
('FC-02', 'Micro-reel visual «Róbate»', 'experimentando', '@iranicadesignlab', $md$# FC-02 · Micro-reel visual con payoff (variante "Róbate")

**Estado:** experimentando (9 piezas "Róbate" + 4 guiones visuales, batch Julio 2026)
**Serie propia:** Róbate (comando imperativo)
**Cadencia objetivo:** 2/semana

## Estructura

1. **Gancho (0-2s):** creador a cámara, plano fijo, texto grande imperativo: "Róbate estas/estos [X] para tu marca" — el "róbate" convierte contenido en botín.
2. Assets visuales en pantalla (paletas, reveals, checklists, prompts), un beat por asset, cortes al ritmo de la música
3. Cierre pidiendo save o sembrando la parte 2 en comentarios

**Mecánica visual:** apertura a cámara 1-2s + motion graphics/mockups. Sin voz o voz mínima. Serialización explícita ("Parte 2…").
**Duración:** 7-12s · **Recompensa:** satisfacción visual + utilidad guardable (saves)
**Por qué retiene:** dura menos que el umbral de decisión de skip; loop de replay; FOMO de la serie.

## Evidencia externa

- @iranicadesignlab — "Brand reveal al final", 7s: **186x**, 322K — https://www.instagram.com/reel/DVpewJDEaba/
- @iranicadesignlab — "Paleta de colores para tu marca", 8s: **143x** — https://www.instagram.com/reel/DWCmtAViAss/
- @iranicadesignlab — "Parte 2… inspirados en comida", 8s: **47x** — https://www.instagram.com/reel/DaV_xxao5sC/ (la serialización es la mecánica)
- @prizmastudiomx — showcase de trabajo 11s: **11x** — https://www.instagram.com/reel/DN6hD6nib8u/

## Señal en contra

Contraejemplo del propio canal: trial de 6.5s = 115 plays = **0.22x**. Corto y sin primera persona es lo peor medido de la ventana (2026-07-27).

## Aprendizajes

- Pendiente validar con Nazho antes de producir: frases reales de "caro", preguntas filtro, prompts reales.
$md$),
('FC-03', 'Serie con contador público', 'experimentando', '@brock11johnson', $md$# FC-03 · Serie con contador público

**Estado:** experimentando (Ep. 1-2 en Notion, batch Julio 2026)
**Serie propia:** "Robándole el marketing a las marcas más grandes de México"
**Cadencia comprometida:** 2 episodios/semana (contador por episodio, NO por día — no se rompe la racha)

## Estructura

1. **Apertura fija (0-4s):** "Episodio [X]: robándole el marketing a las marcas más grandes de México. Hoy le toca a: [marca]." — el contador es el gancho; la marca conocida es el segundo gancho.
2. Cuerpo: qué parece que vende vs qué vende en realidad (mecánica Anatomía de Marca en video)
3. **Cierre fijo:** "Lo que te robas hoy: [táctica aplicable]. En el episodio [X+1] le toca a [marca]" — botín numerado coleccionable + rutina instalada. Variante: pedir la siguiente marca en comentarios.

**Mecánica visual:** a cámara, lo-fi, mismo encuadre siempre. Batch de 4 por sesión de jueves.
**Duración:** 60-90s · **Recompensa:** insight + táctica robable
**Por qué retiene:** el loop de Hanah explícito — la audiencia se suscribe al viaje, no al video.

## Decisión de encuadre (2026-07-10)

Se descartó "analizando marcas" (beneficiario = Nazho) por "robándole el marketing" (beneficiario = espectador, cada episodio entrega botín). "Regalando prompts" se descartó como premisa: duplicaba FC-02 y erosionaba autoridad.

## Evidencia externa

- @brock11johnson — "Day 138 of Reviewing a Reel Every Day until I hit 1M": **4.2x sostenido** — https://www.instagram.com/reel/DaTsgEEhgjH/
- Mecánica raíz: loop gatillo-rutina-recompensa (FCC/Hanah Franklin)

## Banco de episodios

Publicados/guionizados: Ep.1 OXXO · Ep.2 Dr. Simi
Candidatas: Bimbo, La Costeña, Chedraui, Cinépolis, Elektra, Aeroméxico, Julio Regalado + las que pida la audiencia.
$md$),
('FC-04', 'Lección contraintuitiva (Verdades Incómodas)', 'experimentando', '@calebralston', $md$# FC-04 · Lección contraintuitiva desde experiencia real

**Estado:** experimentando (4 guiones en Notion, batch Julio 2026)
**Serie propia:** Verdades Incómodas (estructura El Contraste)
**Cadencia objetivo:** 1/semana

## Estructura

1. **Gancho (0-4s):** contradicción directa a un consejo popular: "Todos te dicen [X]. Yo [credencial real: 15 años de agencia] te digo: [anti-X]."
2. Escena o imagen concreta que aterriza (opcional, muy Nazho: la tortillería, la boda ajena)
3. Desarrollo: el reencuadre — por qué el consejo popular falla y qué mirar en su lugar
4. Cierre aforismo. Sin moraleja, sin CTA.

**Mecánica visual:** a cámara, lo-fi, 35-50s. El más barato de producir (4 piezas en 30 min).
**Recompensa:** validación + reencuadre ("por fin alguien lo dijo")
**Por qué retiene:** disonancia abierta en el gancho que exige resolución.
**Rol en el portafolio:** multiplicador modesto (3-4x) pero seguidor MUY calificado — alimenta newsletter, libro y MHF. Formato de autoridad, no de reach.

## Evidencia externa

- @calebralston — "No esperes nada meaningful los primeros 36 meses", 30s: **12.2x**, 58K views — https://www.instagram.com/reel/DbYled6xSfu/ (clip de podcast, un plano fijo, captions palabra por palabra; contradice el consejo popular con una cifra específica e incómoda)
- @calebralston — "Do the opposite", 36s: **3.3x** — https://www.instagram.com/reel/DWASWqDkqEU/
- @laurahiggins — "Why you need a fake employee in your business", 55s: **276x**, 676K views — https://www.instagram.com/reel/DQS8qOdkpgk/ — el reencuadre cierra con táctica ejecutable con nombre propio. FC-04 multiplica más cuando entrega botín accionable.

## Fuente de ángulos

Los 12 ángulos de creencia contraria (`_Claude/Library/frameworks/creencia-contraria-nazho.md` §8.6). Todos rastrean a la tesis paraguas: "Marca da dirección. Marketing da tracción."
Usados: #1 tortillería · #3 descuento · #6 IA no decide · #9 boda ajena. En banco: #2 pauta · #4 full service · #5 mensaje camaleón · #7 buen producto · #8 explicar precio · #10 ocurrencias · #11 fundador vendedor · #12 dejar ir clientes.

## Mecánica de la serie (fusión de verdades-incomodas, 2026-08-01)

**Creencia popular** → **Verdad incómoda** (experiencia real de Nazho con ejemplo concreto) → **Argumento** (muestra, no moraliza) → **Cierre aforismo**. Registro: íntimo-editorial.

Test de las cuatro preguntas antes de producir: ¿es una creencia REAL? · ¿la verdad viene de EXPERIENCIA vivida? · ¿incomoda PRODUCTIVAMENTE? · ¿tiene MATIZ?
$md$),
('FC-05', 'Checklist relámpago (carrusel-en-video)', 'detectado', '@herasmedia · propio C2IHtrLrirG', $md$# FC-05 · Checklist relámpago (carrusel-en-video con caption-recompensa)

**Estado:** detectado
**Serie propia:** por definir (propuesta: "En 6 segundos")
**Cadencia objetivo:** 1/semana, dentro del 20% experimental hasta juntar repeticiones

## Estructura

1. **Gancho (0-3s):** una sola pregunta en segunda persona escrita en pantalla sobre un plano de apoyo. Sin voz, sin cara. La pregunta nombra un problema operativo con costo.
2. **Tarjetas relámpago (3-6.5s):** 4-5 tarjetas de texto sobre fondo oscuro, título en versalitas + regla amarilla + 2 párrafos. Pasan a ~0.7-0.9s por tarjeta: **físicamente ilegibles a velocidad normal**.
3. **Cierre:** la última tarjeta se corta sin resolución. Sin CTA.
4. **Recompensa fuera del video:** el caption reproduce íntegro el contenido de las tarjetas (1,500-2,500 caracteres). El video es el índice; el caption es el documento.

**Mecánica visual:** vertical, sin voz, solo música. Gancho con movimiento humano (mano escribiendo en iPad, subrayado amarillo en vivo). Tarjetas numeradas con logo. Cero apariciones de Nazho.
**Duración:** 6-9s · **Recompensa:** utilidad guardable + lectura larga en el caption
**Por qué retiene:** la ilegibilidad ES el mecanismo. Replay en loop, pausa/scroll-back y salida al caption. El espectador no consume el video: lo archiva.

## Evidencia

- @nazho — "¿Cómo despedir a un cliente malo?" (2024-01-15), 6.5s: **≈90x** vs mediana 2,799 — https://www.instagram.com/reel/C2IHtrLrirG/
- @nazho — "¿Cómo elevar el ticket promedio?" (2026-07-26), FC05-01, trial sin datos.
- Ejemplo MALO del mismo linaje: "La psicología dice que puedes subir tus precios" (2025-05-27), 6.0s: **≈0.5x**. Sin tarjetas, con CTA explícito. **Las tarjetas son la variable, no el caption.**

## Diagnóstico del trial FC05-01

Cuatro variables cambiaron a la vez respecto al original (gancho stock, sin numerar, sin logo, caption de una línea). El caption sin contenido **rompe el formato**: promete un checklist y no lo entrega.

## Hipótesis a testear (una por episodio)

1. Ep.2 — gancho manuscrito en iPad con subrayado en vivo.
2. Ep.3 — tarjetas numeradas vs sin numerar.
3. Ep.4 — 4 tarjetas vs 6, misma duración.

## Riesgos

- No construye reconocimiento de Nazho: formato de alcance, no de autoridad.
- Depende de que Instagram siga premiando replays de loops cortos.
- Si el caption es el entregable, tiene que sonar a Nazho o el formato erosiona la voz.
$md$),
('FC-08', 'Criterio (yap de decisión)', 'experimentando', 'propio · outlier 3.4x', $md$# FC-08 · Criterio (yap de decisión)

**Estado:** experimentando · **Molde v2** · **Serie propia:** Criterio · **Cadencia:** 1/día durante el reto de 30 yaps (10 ago – 8 sep 2026), luego 2-3/semana
**Prefijo de IDs:** `CRI-`
**Origen:** ingeniería reversa del propio outlier del canal. Creada 2026-08-04.

## La tesis de la card

El único patrón que ha despegado en @nazho no es un formato copiado: es **primera persona + largo (50-150s) + un criterio aplicado a un caso concreto**.

## Estructura — el molde de 5 beats (v2, 2026-08-04)

El molde se dispara con un **tema con contexto** (la tarjeta), no con un recuerdo. Máximo 2 episodios por semana pueden pedir un caso propio.

1. **La afirmación (0-5s) — Calm Hook.** La postura dicha completa, sin preámbulo. "Yo creo que [X]."
2. **El consenso (5-20s).** Qué dice todo el mundo, repetido con justicia. Aquí se abre el loop.
3. **La grieta (20-45s).** Dónde se rompe el consenso: el dato, la observación, el caso. Beat de mayor valor.
4. **El matiz (45-70s).** Qué SÍ tiene de cierto el consenso. Produce el "no estoy de acuerdo… pero tiene un punto".
5. **El criterio (70-90s).** Qué hacer con esto mañana. Una regla prestable. **Cierre aforismo. Sin moraleja, sin CTA.**

**Regla de honestidad del formato:** cuando un dato venga de alguien con interés en el resultado, decirlo en cámara.

### Molde v1 (para los días con caso propio)
El caso → la tentación → la señal → el criterio → el costo.

## Pilar visual

Vertical, celular, una sola toma. Oficina o coche. Subtítulos siempre. Cortar silencios y muletillas, cero transiciones. Sin B-roll. Nazho siempre en cámara.

## Pilar roteiro

Identificación → incongruencia → efecto ahá → credibilidad → utilidad. Registro conversa de bar: se opina, no se enseña.

## Evidencia propia

| Reel | Fecha | Duración | Plays | Multiplicador |
|---|---|---|---|---|
| DbLlA4KxQQZ — "Cada sí a un mal proyecto es un no a uno bueno" | 2026-07-24 | 51s | 1,790 | **3.4x** |
| Daqg4DwsKh_ — "Lo de HEINZ fue planeado" | 2026-07-11 | 149s | 1,437 | 2.7x |

Mediana de plays de reels del canal (n=6): **525**. Umbral outlier 3x: **≥1,575**.

## La arena de 3 frentes (protocolo del reto)

Cada yap se graba con **3 aperturas distintas y un solo cuerpo**: A Confesión (control) · B Costo con número · C Contradicción o aforismo. Cambian los primeros 1.5s, el overlay, el audio y el caption. Tope de IG: 5 trials/día.

## Riesgos

- Fatiga del molde a 30 episodios: si al día 15 el multiplicador mediano no se mueve, variar el beat 1, no abandonar la card.
- Dependencia del research: datos con fuente; caducan entre 6 y 18 meses.
- Si el beat 1 no es una afirmación propia, la pieza se cae al montón educativo, que en esta cuenta se hunde.
- Formato de autoridad, no de alcance.
$md$)
on conflict (codigo) do update set
  nombre = excluded.nombre, estado = excluded.estado, origen = excluded.origen, molde = excluded.molde;
