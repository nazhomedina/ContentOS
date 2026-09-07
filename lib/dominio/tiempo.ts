// Único lugar donde vive la zona horaria de negocio (PLAN.md, detalle 13).
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { MARCA } from "./marca";

export const ZONA = MARCA.zonaHoraria;

/** Fecha civil de hoy en la zona de negocio, como 'AAAA-MM-DD'. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Lunes de la semana que contiene la fecha dada (ISO). */
export function lunesDe(fechaISO: string): string {
  return format(startOfWeek(parseISO(fechaISO), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function lunesDeHoy(): string {
  return lunesDe(hoyISO());
}

export function sumarDias(fechaISO: string, dias: number): string {
  return format(addDays(parseISO(fechaISO), dias), "yyyy-MM-dd");
}

/** '2026-09-07' → 'lun 7 sep'. */
export function fechaCorta(fechaISO: string | null | undefined): string {
  if (!fechaISO) return "—";
  return format(parseISO(fechaISO.slice(0, 10)), "EEE d MMM", { locale: es });
}

/** Timestamp → 'lun 7 sep, 14:30' en la zona de negocio. */
export function fechaHora(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Clasifica un vencimiento respecto a hoy: 'vencida' | 'hoy' | 'semana' | 'despues' | 'sin_fecha'. */
export function bucketVencimiento(vence: string | null): "vencida" | "hoy" | "semana" | "despues" | "sin_fecha" {
  if (!vence) return "sin_fecha";
  const hoy = hoyISO();
  if (vence < hoy) return "vencida";
  if (vence === hoy) return "hoy";
  const domingo = sumarDias(lunesDe(hoy), 6);
  if (vence <= domingo) return "semana";
  return "despues";
}
