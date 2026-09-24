import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/tipos";

/** Toda corrida automática deja su fila: se abre al empezar y se cierra con estado, resumen y payload. */
export async function abrirCorrida(sistema: string, payload: Record<string, unknown> = {}): Promise<number> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin.from("corridas").insert({ sistema, estado: "corriendo", resumen: "en curso", payload: payload as Json }).select("id").single();
  if (error) throw new Error(`No se pudo abrir la corrida de ${sistema}: ${error.message}`);
  return data.id;
}

export async function cerrarCorrida(id: number, estado: "ok" | "vacio" | "error", resumen: string, payload: Record<string, unknown> = {}) {
  const admin = crearClienteAdmin();
  await admin.from("corridas").update({ estado, resumen, fin: new Date().toISOString(), payload: payload as Json }).eq("id", id);
}

export type ResultadoJob = { sistema: string; estado: "ok" | "vacio" | "error"; resumen: string; detalle?: Record<string, unknown> };

/** Envuelve un job: abre la corrida, corre, cierra con lo que pasó. Un error nunca se traga: queda como corrida en error. */
export async function conCorrida(sistema: string, correr: () => Promise<{ estado: "ok" | "vacio"; resumen: string; detalle?: Record<string, unknown> }>): Promise<ResultadoJob> {
  let id: number | null = null;
  try {
    id = await abrirCorrida(sistema);
    const r = await correr();
    await cerrarCorrida(id, r.estado, r.resumen, r.detalle ?? {});
    return { sistema, ...r };
  } catch (e) {
    const mensaje = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    if (id !== null) await cerrarCorrida(id, "error", mensaje);
    return { sistema, estado: "error", resumen: mensaje };
  }
}

/** Lunes de hoy en horario de negocio, sin depender de date-fns en el servidor de jobs. */
export function lunesHoy(): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const d = new Date(hoy + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export function hoyMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
