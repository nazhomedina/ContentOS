# Identidad — la verdad universal de Nazho dentro de ContentOS

Siete filas que todo agente lee antes de escribir o decidir por Nazho. Viven en la tabla `identidad` (migración 024), con historial en `identidad_versiones`. Se ven en la app en `/identidad`, se leen por MCP con `leer_identidad` y por HTTP en `/api/identidad` para clientes sin MCP (Grok u otros).

## Fuente y flujo

- **Estos archivos `NN-clave.md` son el seed inicial** y el respaldo legible. Frontmatter: `clave`, `orden`, `titulo`, `resumen`; el cuerpo es markdown.
- **La verdad vigente es la tabla.** Después del import, la identidad se edita por MCP con `actualizar_identidad` (solo owner, con motivo). Cada cambio guarda la versión anterior y sube `version`.
- **Para reimportar desde archivos:** `node --env-file=.env.local scripts/seed-identidad.mjs --motivo "…"`. Idempotente: no toca las filas cuyo cuerpo no cambió.
- Si se edita por MCP y luego se quiere reflejar aquí, se descarga `GET /api/identidad/{clave}.md` y se pega en el archivo. Los archivos no se regeneran solos.

## Las siete filas

| orden | clave | título | cambia |
|---|---|---|---|
| 1 | `quien-soy` | Quién soy | rara vez |
| 2 | `audiencia` | A quién le hablo | rara vez |
| 3 | `postura` | Qué defiendo | rara vez |
| 4 | `voz` | Cómo escribo | al afinar la voz |
| 5 | `oferta` | Qué vendo | cuando cambia la oferta |
| 6 | `reglas` | Reglas duras | por decisión explícita |
| 7 | `evidencia` | Voz en evidencia | al sumar una pieza canónica |

## Regla de arranque para todo skill de Cowork

Antes de escribir una palabra: `listar_comunidades` → `leer_identidad(clave: ["voz","reglas"])` → `listar_formatos` si la pieza tiene formato. Antes de planear o proponer: `leer_identidad(clave: ["audiencia","postura"])` y `estado_semana`. `quien-soy` cuando la pieza habla en primera persona; `oferta` cuando hay un llamado a la acción; `evidencia` cuando haya duda de cómo suena.

## Lectura sin MCP

Con la misma key del MCP (`Authorization: Bearer cos_…` o `x-api-key`), de cualquier rol:

- `GET /api/identidad` → las siete filas en JSON (`?solo_resumen=1` omite el cuerpo).
- `GET /api/identidad/{clave}.md` → el cuerpo de una fila en markdown.
- `GET /api/identidad.md` → el documento completo.

Para Grok conviene una key de un perfil `viewer`, que solo puede leer.

## Lo que no va en esta tabla

Formatos, moldes, series, hipótesis, piezas, métricas, tareas, rutinas y estado de la semana. Todo eso ya tiene tabla y herramienta. Si una fila de identidad empieza a describir cómo se produce algo o cómo va algo, se mueve a donde corresponde.

## Pendientes de contenido (de Nazho; se corrigen con `actualizar_identidad`)

1. Confirmar en público los «750+ proyectos», Telcel y Harley Davidson.
2. Corregir «diez años» por «más de 16» en el borrador de Criterio #001 antes de enviarlo.
3. Decidir si el libro se presenta con coautoría.
4. Verificar que la Aceleradora (~$4,000, una hora de diagnóstico) siga vigente como puerta de Folklore.
5. Escribir en `postura` dos o tres líneas propias sobre qué le delega a la IA y qué no.
6. En `evidencia`: confirmar que «Ese último FIFA» y la pieza sobre la muerte de su socio son una sola; que «$547 pesos» y «el dígito mal metido» son la misma pieza; y aprobar la apertura de la troca atascada con su voz.
