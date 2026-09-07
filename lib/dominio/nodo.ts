export type TipoNodo = "ia" | "humano" | "automatizacion" | "plataforma";
export type EstadoNodo = "corrio" | "hueco" | "agendado" | "sin_sistema";

export type NodoDef = {
  clave: string; nombre: string; tipo: TipoNodo; dueno?: string; disparador?: string;
  estado_base?: "agendado" | "sin_sistema"; evidencia?: Record<string, unknown>; nota?: string;
};
export type AristaDef = { de: string; a: string; etiqueta?: string };

export type NodoEstado = {
  nodo_clave: string; nombre: string; tipo: string; dueno: string | null; disparador: string | null; nota: string | null;
  estado: string; n: number; cuando: string | null; detalle: string | null; hueco_nota: string | null;
};

export const NOMBRE_TIPO: Record<TipoNodo, string> = {
  ia: "IA", humano: "Humano", automatizacion: "Automatización", plataforma: "Plataforma",
};

export const NOMBRE_ESTADO_NODO: Record<EstadoNodo, string> = {
  corrio: "Corrió", hueco: "Hueco declarado", agendado: "Agendado, sin correr", sin_sistema: "Sin sistema",
};

/** Clases por estado: verde · gris · ámbar · rojo. Semánticos, no acento. */
export const CLASE_ESTADO_NODO: Record<EstadoNodo, { borde: string; punto: string; texto: string }> = {
  corrio: { borde: "border-ok/50", punto: "bg-ok", texto: "text-ok" },
  hueco: { borde: "border-muted-foreground/40 border-dashed", punto: "bg-muted-foreground", texto: "text-muted-foreground" },
  agendado: { borde: "border-ambar/60", punto: "bg-ambar", texto: "text-ambar" },
  sin_sistema: { borde: "border-rojo/60", punto: "bg-rojo", texto: "text-rojo" },
};

export const NOMBRE_META: Record<string, string> = {
  newsletter: "Newsletter", reel: "Reels", carrusel: "Carruseles", historia_dia: "Días con historias",
  articulo: "Artículos", youtube: "YouTube", x: "X",
};

/** Resumen de una lista de estados para el chip del sistema. */
export function resumenSistema(nodos: NodoEstado[]) {
  const c = { corrio: 0, hueco: 0, agendado: 0, sin_sistema: 0 } as Record<EstadoNodo, number>;
  for (const n of nodos) c[(n.estado as EstadoNodo) ?? "agendado"]++;
  const peor: EstadoNodo = c.sin_sistema ? "sin_sistema" : c.agendado ? "agendado" : c.hueco ? "hueco" : "corrio";
  return { ...c, total: nodos.length, peor };
}
