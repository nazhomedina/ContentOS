# Estructura del sistema — menú, etapas y bases

**Fecha:** 2026-09-08 · **Origen:** Nazho define el menú y el ciclo Borrador → Producción → Publicado.

## 1. ¿Una base o varias?

**Una sola tabla `piezas`.** Lo que distingue a un reel de un carrusel o de una edición del newsletter es el formato, no la naturaleza: todos nacen como borrador, pasan por producción y acaban publicados con una URL y métricas. Separarlos en tablas obligaría a repetir tareas, métricas, comentarios, assets y bitácora cinco veces, y rompería la vista de calendario y la cuota semanal, que necesitan verlos juntos.

Lo que sí cambia por formato son **las sub-etapas de producción que aplican**:

| Formato | Redacción | Grabación | Diseño y producción |
|---|---|---|---|
| Reel / yap | guion | sí | edición |
| Carrusel | copy por lámina | no | diseño de láminas |
| Artículo | texto | no | maquetación y portada |
| Newsletter | edición completa | no | armado en Kit |
| Historia | copy | opcional | asset |

Eso se resuelve con una regla por formato en el código (`subetapas(formato)`), no con tablas distintas.

**La excepción es Historias.** Hoy viven en su propia tabla porque el handoff las modeló como paquete semanal con día, serie, registro y keyword. En tu menú son una pestaña más. La dirección correcta es fundirlas en `piezas` con `formato = historia` y esos cuatro campos en una columna `historia jsonb`; se hará cuando el paquete semanal se opere una vez desde la app, para no rediseñar dos veces.

## 2. Etapas y estados

Tres etapas visibles, con los estados de la base debajo:

```
BORRADOR      borrador                                   → pestaña Ideas
PRODUCCIÓN    redaccion → grabacion → diseno → listo → programada   → pestaña de cada formato
PUBLICADO     publicada (+ en_trial)                     → apartado «Publicados» de cada formato, con métricas
              archivada                                  → fuera de todo
```

- `listo` es el buffer: terminado, esperando programación. El semáforo de Inicio cuenta `listo` + `programada`.
- Pasar de borrador a redacción exige formato. Pasar a grabación (o a diseño si el formato no se graba) exige hipótesis y etapa del embudo, que escribe Claude en redacción.
- El tope de 10 cuenta `redaccion` + `grabacion`.
- Mariela ve desde `grabacion` en adelante y mueve `grabacion → diseno → listo → programada`; publicar sigue exigiendo URL.

## 3. Menú

```
Inicio          crecimiento de cuenta · metas de la semana · buffer · cierre del día
Ideas           los borradores; se alimentan a mano, desde Claude/Cowork (MCP) y desde Claude Code
Calendario      todo lo programado y publicado, por semana, todos los formatos
──────
Historias       (tabla propia por ahora)
Reels           producción en columnas + Publicados con métricas
Carruseles      ídem
Artículos       ídem
Newsletter      ídem
──────
Formatos        Format Cards
Cuentas         cuentas en seguimiento (watchlist); el radar las scrapea en v2
```

Cola, Equipo y Sistemas no desaparecen: Cola es el menú de Mariela; Equipo y Sistemas se abren desde los bloques de Inicio («cierre del día» y «la máquina»).

## 4. Qué se construye ahora

1. Migración 009: renombrar estados, `subetapas` por formato en código, tabla `cuentas_referencia` ligera.
2. Menú con la estructura de arriba (owner) y Cola + pestañas para Mariela.
3. Ideas: los borradores con captura y notas.
4. Pestañas por formato: tablero de producción (Redacción · Grabación · Diseño · Listo) y Publicados con views, likes, saves, multiplicador.
5. Calendario semanal.
6. Cuentas en seguimiento: alta, plataforma, nota, activa.
7. Inicio con los cuatro bloques que pediste.
