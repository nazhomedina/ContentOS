import { z } from "zod";

/** Espejo de crear_hipotesis() en SQL. Regla de resolubilidad: campo, número y fecha. */
export const esquemaHipotesis = z.object({
  texto: z.string().trim().min(1, "Falta hipotesis.texto"),
  campo: z.string().trim().min(1, "Falta hipotesis.campo"),
  numero: z.number({ message: "hipotesis.numero debe ser un número" }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "hipotesis.fecha debe ser AAAA-MM-DD"),
});
export type HipotesisNueva = z.infer<typeof esquemaHipotesis>;

export type HipotesisResumen = { texto: string; campo: string | null; numero: number | null; fecha: string | null; estado: string } | null | undefined;

export const NOMBRE_ESTADO_HIPOTESIS: Record<string, string> = {
  abierta: "Abierta", verdadera: "Verdadera", falsa: "Falsa", sin_datos: "Sin datos",
};

/** Una línea para la cabecera: el texto, y si es resoluble, «campo ≥ número al fecha». */
export function hipotesisEnUnaLinea(h: HipotesisResumen): string {
  if (!h) return "Sin hipótesis todavía (la escribe Claude en redacción)";
  const texto = h.texto.trim();
  if (h.campo && h.numero != null && h.fecha) return `${texto} · ${h.campo} ≥ ${h.numero} al ${h.fecha}`;
  return `${texto} · sin número ni fecha que la cierren`;
}

export function hipotesisResoluble(h: HipotesisResumen): boolean {
  return Boolean(h && h.campo && h.numero != null && h.fecha);
}
