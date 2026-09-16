/** Lead magnets: lo que se regala a cambio del DM. Vive en go.folklore.mx, se pide con una keyword y Kit lo etiqueta. */

export const ESTADOS_RECURSO = ["idea", "produccion", "publicado", "contado", "retirado"] as const;
export type EstadoRecurso = (typeof ESTADOS_RECURSO)[number];
export const NOMBRE_ESTADO_RECURSO: Record<EstadoRecurso, string> = {
  idea: "Idea", produccion: "En producción", publicado: "Publicado en Go", contado: "Contado en historia", retirado: "Retirado",
};
/** Orden de lectura: primero lo que está vivo, al final lo retirado. */
export const ORDEN_ESTADO_RECURSO: Record<EstadoRecurso, number> = { publicado: 0, contado: 1, produccion: 2, idea: 3, retirado: 4 };

export const TIPOS_RECURSO = ["resumen_video", "resumen_articulo", "megaprompt", "mini_app", "libreria", "plantilla", "otro"] as const;
export type TipoRecurso = (typeof TIPOS_RECURSO)[number];
export const NOMBRE_TIPO_RECURSO: Record<TipoRecurso, string> = {
  resumen_video: "Resumen de video", resumen_articulo: "Resumen de artículo", megaprompt: "Megaprompt", mini_app: "Mini app",
  libreria: "Librería", plantilla: "Plantilla o checklist", otro: "Otro",
};

export const DOMINIO_GO = "go.folklore.mx";
/** La URL pública no se guarda: se deriva del slug. */
export function urlGo(slug: string | null | undefined): string | null {
  return slug ? `https://${DOMINIO_GO}/${slug}` : null;
}
