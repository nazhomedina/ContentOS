/** Formatos: la biblioteca de estructuras repetibles (docs/decisiones.md 2026-09-23 · Formatos). */

export const ESTADO_FC: Record<string, string> = {
  detectado: "Detectado", experimentando: "Experimentando", validado_propio: "Validado propio", firma: "Firma", retirado: "Retirado",
};
export const CAMINO_FC = ["detectado", "experimentando", "validado_propio", "firma"] as const;

/** Las facetas de la galería. Las etiquetas son libres; estas agrupan las conocidas y el resto cae en «Otras». */
export const FACETAS: { clave: string; nombre: string; etiquetas: string[] }[] = [
  { clave: "donde", nombre: "Dónde", etiquetas: ["grabado dentro", "grabado fuera", "escrito"] },
  { clave: "quien", nombre: "Quién", etiquetas: ["nazho a cámara", "sin nazho", "voz en off"] },
  { clave: "mecanica", nombre: "Mecánica", etiquetas: ["clip ajeno", "motion graphics", "texto en pantalla", "una sola toma", "serie con contador", "caption largo", "b-roll", "entrevista"] },
  { clave: "duracion", nombre: "Duración", etiquetas: ["menos de 15 s", "15 a 60 s", "más de 60 s", "lectura"] },
];
export const ETIQUETAS_CONOCIDAS = new Set(FACETAS.flatMap((f) => f.etiquetas));

export type HipotesisFormato = { id: string; texto: string; campo: string | null; numero: number | null; fecha: string | null; estado: string } | null;

/** La señal de la tarjeta: qué dice la hipótesis del formato hoy. */
export function señalFormato(h: HipotesisFormato, hoy: string): { tono: "ok" | "ambar" | "rojo" | null; texto: string } {
  if (!h) return { tono: "rojo", texto: "sin hipótesis" };
  if (h.estado === "verdadera") return { tono: "ok", texto: "hipótesis verdadera" };
  if (h.estado === "falsa") return { tono: "rojo", texto: "hipótesis falsa" };
  if (h.estado === "sin_datos") return { tono: "ambar", texto: "cerrada sin datos" };
  if (!h.campo || h.numero == null || !h.fecha) return { tono: "ambar", texto: "hipótesis sin número" };
  if (h.fecha <= hoy) return { tono: "ambar", texto: "hipótesis por resolver" };
  return { tono: null, texto: `hipótesis al ${h.fecha.slice(5).split("-").reverse().join("/")}` };
}
