# Cierre de ContentOS 1.0 — semana del 14 al 20 de septiembre de 2026

**Para qué:** que esta semana Nazho y Mariela trabajen dentro de la app y no fuera. Cuatro frentes, un entregable verificable por día, y una lista corta de lo que no entra.

**Definición de 1.0:** el viernes 18 se cumplen estos cinco hechos, todos comprobables con una consulta a la base:

1. Salió una edición de CRITERIO y existe como pieza `newsletter` publicada con URL de Kit y guion versionado.
2. Las historias de la semana se aprobaron en la app, Mariela las publicó desde su Cola y anotó métricas de al menos una.
3. Los lead magnets tienen pantalla, y cada historia de captura de la semana apunta a su recurso.
4. Mariela declaró bitácora tres días o más, y Nazho vio desde Inicio en qué pieza estaba y qué paso le faltaba.
5. Hay tag `v1.0` en git y las decisiones de la semana están en `docs/decisiones.md`.

---

## 0. Dónde estamos (13 de septiembre)

| Frente | Ya existe | Falta para operar |
|---|---|---|
| **Newsletter** | Formato `newsletter`, pestaña con columnas Redacción · Diseño · Listo, stream de redacción y versiones de guion, sistema CRITERIO en el Nodo. Spec canónica en `02 PROYECTOS/NEWSLETTER 2026/00-FORMATO-CRITERIO.md`; mapa de 10 ediciones; #001 escrita y en borrador de Kit desde el 8 de agosto (nunca enviada). Skill `criterio-writer`. | Cero piezas newsletter en la base. Sin número de edición ni serie. El checklist de 8 puntos no existe como tarea. El puente con Kit (borrador, URL pública) no está documentado como paso. |
| **Historias** | Tabla, paquete semanal por MCP, aprobación en Inicio que genera tareas «publicar» por día para Mariela, pantalla semanal con copy, asset, programar, publicar y métricas manuales. 4 historias aprobadas en la base. | Nazho no puede crear ni editar una historia desde la web, solo por MCP. Mariela no puede subir el asset que produce. Aprobar solo se ve en Inicio. Mariela nunca ha entrado. Acceso a Meta Business Suite pendiente. |
| **Lead magnets** | Tabla `recursos` (nombre, slug de go.folklore, keyword, tag de Kit, estado, leads), FK desde historias, la tarjeta muestra el recurso, sistema «Historias y lead magnets» en el Nodo. Un recurso cargado (RORY); el handoff nombra tres (RORY, 90, BEAST). | No hay pantalla ni tools. Leads sin dato porque `go_leads` vive en n8n y n8n sigue sin autorizar. |
| **Pantalla de Mariela** | Cola por Hoy · Semana · Bloqueadas · Hechas, filtros por formato, bloque «Tu día» (bitácora), detalle de pieza con checklist por tarea y subida de assets, tableros de Reels y Carruseles, pantalla Equipo con declarado vs evidencia, bloque «Cierre del día» en Inicio. | Nada de esto se ha usado con una persona real. Nazho no ve de un vistazo en qué pieza está Mariela y qué paso del checklist le falta. El webhook de Storage que crea la tarea «editar» al subir un RAW no está registrado. |

**Bloqueo transversal:** Mariela entra por magic link y el SMTP de Supabase sigue siendo el de fábrica, que solo entrega a miembros del proyecto y con límite por hora. Sin SMTP propio (Resend) Mariela no puede entrar, y sin Mariela adentro los frentes 2 y 4 no se pueden dar por cerrados. Es lo primero del lunes.

---

## 1. Plan por día

Cada día tiene lo que construye Claude en el repo, lo que hace Nazho fuera del repo, y cómo se verifica. No se pasa al siguiente frente sin la verificación.

### Lunes 14 · Accesos y historias

**Nazho (fuera del repo, primera hora):**
- Supabase Auth: SMTP con Resend (dominio nazho.mx o flk.mx), Site URL `https://content-os-nazho-flkmxs-projects.vercel.app` y redirect `/auth/callback`.
- Mandarle a Mariela el link de la app. Su correo ya está en la lista blanca; al entrar se crea su perfil.
- Meta Business Suite: darle acceso a Mariela a la cuenta de Instagram para programar historias.

**Claude (repo):**
- Pantalla Historias para el owner: formulario «Nueva historia» (día, serie, registro, copy, keyword, recurso, pieza amplificada) y edición del copy en la tarjeta. Botón «Aprobar la semana» también en Historias, no solo en Inicio.
- Tarjeta de historia para Mariela: «Subir asset» a `assets/historias/{id}/` cuando el registro es `producido` y no hay asset.
- Registrar el webhook de Storage como trigger en la base (migración 011), para que subir un RAW cree la tarea «editar».
- Proponer por MCP el paquete de historias de esta semana (cuatro días: reflexión, encuesta, pregunta abierta, amplificación del reel o carrusel que esté en buffer), con keyword y recurso donde aplique. Nazho lo aprueba con un toque.

**Verificación:** Mariela abre `/cola` desde el teléfono con su login y ve las tareas «publicar» de la semana con día de vencimiento. Nazho crea una historia desde la web y la ve en la Cola de Mariela tras aprobar.

### Martes 15 · Lead magnets

**Claude (repo):**
- Pantalla `/recursos` en el menú, debajo de Historias: lista de lead magnets con estado (idea · producción · publicado · contado), slug de go.folklore, keyword, tag de Kit, leads con fecha de corte («sin dato» si nunca corrió el job), e historias ligadas por semana con sus views, replies y DMs sumados.
- Alta y edición por el owner desde la web. Leads capturables a mano con fecha, marcados como fuente manual, hasta que exista `go_leads`.
- MCP: `listar_recursos`, `guardar_recurso`. `proponer_historias` ya acepta `recurso_slug`.
- Cargar 90 y BEAST con sus slugs y tags de Kit, tomados de la colección de Notion del handoff.
- En la tarjeta de historia, el recurso es un link a su ficha.

**Nazho:** confirmar los tres slugs y tags de Kit, y qué keyword responde ManyChat por cada uno.

**Verificación:** la historia de captura de esta semana aparece en la ficha de su recurso; la ficha dice cuántas historias la han empujado y cuándo se contaron leads por última vez.

### Miércoles 16 · Claridad sobre Mariela

**Claude (repo):**
- Tarjetas de los tableros de Reels y Carruseles: responsable, tarea en curso y avance del checklist (por ejemplo «editar · 3 de 6»), en rojo si está bloqueada, en ámbar si venció.
- Bloque «Equipo» en Inicio: por persona, la pieza en la que está ahora (última tarea en curso o último archivo subido), qué paso del checklist le falta, y su bitácora de hoy y ayer.
- Pantalla Equipo: columna «en curso» además de declarado y evidencia.
- Cola de Mariela: en cada tarea, el paso del checklist que sigue, para que abra la pieza sabiendo qué hacer.

**Nazho y Mariela:** Mariela declara su primera bitácora. Nazho asigna desde el detalle de pieza la primera tarea real de edición de un reel y de diseño de un carrusel, con fecha.

**Verificación:** desde Inicio, sin abrir nada más, Nazho contesta «¿en qué está Mariela y cuánto le falta?». En Equipo, el día tiene declaración y evidencia y coinciden.

### Jueves 17 · Newsletter

**Claude (repo):**
- Pieza newsletter con número de edición: serie `CRITERIO`, título «Criterio #NNN — criterio», fecha objetivo el viernes siguiente por defecto. La pestaña Newsletter muestra el número y el viernes de envío.
- Checklist de 8 puntos de la spec como checklist por defecto de la tarea «revisar» del formato newsletter. Nadie mueve una edición a Listo con puntos sin palomear.
- Documentar en `docs/newsletter.md` el puente con Kit: el guion vive en la app (versionado), Claude crea el borrador en Kit por su conector, Nazho programa en la interfaz de Kit (no hay API para programar), y al enviarse se marca publicada con la URL pública del broadcast. Sin sincronización de regreso.
- Registrar #001 como pieza `NEW-01` con su guion, lista para enviarse el viernes.
- Entrevista para #002 («Si tienes que explicar tu diferencia, no eres diferente») con el skill de redacción: tres preguntas en el stream, Nazho contesta desde el teléfono, `criterio-writer` redacta las seis secciones y se guarda como versión 1.

**Nazho:** revisar #001 en Kit y programarla para el viernes a las 9:00. Contestar las tres preguntas de #002.

**Verificación:** `listar_piezas(formato: newsletter)` devuelve NEW-01 en Listo con fecha del viernes y NEW-02 en Redacción con guion v1 e hipótesis.

### Viernes 18 · Cierre

- Sale CRITERIO #001. Se marca publicada con URL; queda métrica pendiente.
- Revisión de la semana de historias: Mariela anota views, replies y DMs de las publicadas. Nazho ve la ficha del recurso con lo que empujó la semana.
- Milo ya no propone historias por Notion: se anota que el paquete de la semana siguiente lo propone Claude por MCP el domingo.
- `docs/decisiones.md` con las decisiones de la semana, tag `v1.0`, y `PLAN.md` marcando 1.14 y 1.15 como cumplidos.

**Sábado 19:** colchón. Lo que no cupo entre semana se termina aquí o se declara fuera de 1.0.

---

## 2. Lo que no entra en 1.0 (para no reabrirlo esta semana)

- Grabador de voz en el navegador y cola de solicitudes: dependen del job de transcripción en n8n.
- Jobs de n8n (`post_scraper_grilla`, `snapshot_seguidores`, `kit_suscriptores`, `go_leads`) y el recálculo nocturno de multiplicador: el conector de n8n sigue sin autorizar. Los sensores de crecimiento siguen vacíos y los leads se capturan a mano. Los latidos en rojo son honestos, no un error.
- Import total de Notion (229 piezas, 15 ideas restantes): Nazho pidió plataforma antes que import. Se hace la semana del 21 si hace falta el banco.
- Derivación automática de la cascada del newsletter (reel + carrusel por edición): esta semana las hijas se crean a mano con `crear_pieza`.
- Fusión de historias en `piezas`: se decide después de operar el paquete semanal una vez (docs/estructura.md §1).
- Radar, voz, viewers activos, publicación de historias por API.

---

## 3. Decisiones que necesito de Nazho el lunes (con mi default si no dice lo contrario)

1. **CRITERIO #001 sale este viernes 18.** Está escrita desde agosto; retrasarla otra semana no la mejora. Si prefiere arrancar con #002, se entrevista #002 el lunes y no el jueves.
2. **Los leads se capturan a mano** (número y fecha) hasta que corra `go_leads`. Alternativa: autorizar n8n esta semana y construir el job, lo que desplaza el frente de Mariela.
3. **Mariela ve los lead magnets en solo lectura.** Los edita Nazho o Claude.
4. **La historia de amplificación de cada semana empuja la pieza que esté en buffer**, no la más reciente publicada. Si no hay buffer, la semana lo marca como hueco.

---

## 4. Riesgos

- **SMTP.** Si Resend no queda el lunes, Mariela no entra y los frentes 2 y 4 solo se prueban con la editora temporal del script de pruebas. Se avisa el lunes a mediodía.
- **Business Suite.** Sin acceso, Mariela marca «publicada» en la app pero publica desde la cuenta de Nazho. Funciona, pero rompe la claridad de quién hizo qué.
- **Verificación visual.** Claude no puede entrar a la app con sesión, así que cada pantalla nueva la verifica Nazho en el navegador el mismo día. Sin esa mirada, el bloque no se da por cerrado.
