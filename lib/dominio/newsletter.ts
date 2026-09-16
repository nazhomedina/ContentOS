import { addDays, format, getISODay, parseISO } from "date-fns";

/** El newsletter es una pieza `newsletter` con formato FC-09; el día de envío vive en el formato (docs/newsletter.md). */
export const FORMATO_NEWSLETTER = "FC-09";

export const DIAS_ENVIO = [[1, "lunes"], [2, "martes"], [3, "miércoles"], [4, "jueves"], [5, "viernes"], [6, "sábado"], [7, "domingo"]] as const;
export function nombreDia(dia: number): string {
  return DIAS_ENVIO.find((d) => d[0] === dia)?.[1] ?? "viernes";
}

/** Los próximos `n` días de envío a partir de `desde` (inclusive), como 'AAAA-MM-DD'. */
export function proximosEnvios(dia: number, desde: string, n: number): string[] {
  const d = parseISO(desde);
  const delta = (dia - getISODay(d) + 7) % 7;
  return Array.from({ length: n }, (_, i) => format(addDays(d, delta + 7 * i), "yyyy-MM-dd"));
}

/** «Criterio #002 — …» → '#002'. */
export function numeroEdicion(titulo: string | null | undefined): string | null {
  const m = /^Criterio #(\d{3})/.exec(titulo ?? "");
  return m ? `#${m[1]}` : null;
}
export function tituloSinNumero(titulo: string | null | undefined): string {
  return (titulo ?? "").replace(/^Criterio #\d{3}\s*[—-]\s*/, "") || "(sin criterio)";
}
/** El id del borrador en Kit, anotado en notas como «kit: 25356283». */
export function idKit(notas: string | null | undefined): string | null {
  return /kit:\s*(\d{5,})/i.exec(notas ?? "")?.[1] ?? null;
}
