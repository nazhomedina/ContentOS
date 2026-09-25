# Maquetas HTML

Cada pieza puede llevar una maqueta HTML que Claude genera desde Cowork, ContentOS guarda y Mariela ve en la ficha de la pieza, pestaña **Maqueta**. Spec original: «Spec Maquetas HTML en ContentOS» (2026-09-25). Migración 027.

## Cómo funciona

1. Claude redacta la pieza y genera la maqueta: solo HTML y CSS, sin JavaScript.
2. Claude llama `guardar_maqueta(pieza, html, nota?)`. Solo owner.
3. El servidor sube `assets/piezas/{pieza_id}/maqueta/v{N}.html`. `registrar_asset` crea la fila con `carpeta = 'maqueta'` y la versión leída del nombre; el servidor anota `contenido_version` (la versión vigente del copy) y la nota. Nunca se sobrescribe.
4. Mariela abre la pieza, pestaña Maqueta: la vigente en un iframe con `sandbox=""`, selector de versiones, aviso ámbar si el copy avanzó después, «Abrir en pestaña nueva» (ruta de la app con CSP `sandbox`) y «Descargar .html» (URL firmada de 10 minutos).
5. En su tablero, las piezas con maqueta llevan un ícono; en ámbar si está desactualizada.

## Reglas para Claude

- Documento completo: empieza con `<!DOCTYPE html>` o `<html`. Máximo 2 MB.
- Sin JavaScript: la vista no lo ejecuta. Fuentes de Google Fonts o incrustadas; imágenes como `data:` o `https:`.
- Antes de ajustar una maqueta, `leer_maqueta` para partir de la última.
- `listar_piezas` trae `tiene_maqueta`, `maqueta_version` y `maqueta_desactualizada` por pieza.

## Decisiones de 1.0 (se pueden cambiar)

- Mariela no sube maquetas desde la app; las genera Claude. La política del bucket ya se lo permitiría.
- Guardar una maqueta no crea ni mueve tareas.
- Se conservan todas las versiones.
- La maqueta no es obligatoria para pasar a diseño.
- La nota de cada versión se guarda en `assets.nota` (se ve en el selector) y además se anota en la bitácora de quien la guardó.
- El rol viewer todavía no ve assets; cuando Evelyn y Fernando se den de alta, se abre la lectura.
