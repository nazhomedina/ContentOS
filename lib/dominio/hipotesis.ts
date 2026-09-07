import { z } from "zod";
import type { Json } from "@/lib/supabase/tipos";

/** Espejo de hipotesis_valida() en SQL. Regla de resolubilidad: campo, número y fecha. */
export const esquemaHipotesis = z.object({
  texto: z.string().trim().min(1, "Falta hipotesis.texto"),
  campo: z.string().trim().min(1, "Falta hipotesis.campo"),
  numero: z.number({ message: "hipotesis.numero debe ser un número" }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "hipotesis.fecha debe ser AAAA-MM-DD"),
});
export type Hipotesis = z.infer<typeof esquemaHipotesis>;

export type HipotesisLegado = { legado: true; texto?: string | null; campo?: string | null; numero?: number | null; fecha?: string | null };

export function esLegado(h: Json): h is HipotesisLegado {
  return typeof h === "object" && h !== null && !Array.isArray(h) && (h as { legado?: unknown }).legado === true;
}

/** Una línea para la cabecera del detalle: «multiplicador ≥ 3 al 31 oct». */
export function hipotesisEnUnaLinea(h: Json | null | undefined): string {
  if (typeof h !== "object" || h === null || Array.isArray(h)) return "Sin hipótesis todavía";
  const o = h as Record<string, unknown>;
  if (o.legado === true && !o.numero) return "Sin hipótesis (heredada de Notion)";
  const texto = typeof o.texto === "string" && o.texto.trim() ? o.texto.trim() : null;
  const campo = typeof o.campo === "string" ? o.campo : "?";
  const numero = o.numero ?? "?";
  const fecha = typeof o.fecha === "string" ? o.fecha : "?";
  return texto ?? `${campo} llegará a ${numero} al ${fecha}`;
}
