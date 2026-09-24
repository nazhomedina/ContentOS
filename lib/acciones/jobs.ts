"use server";

import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/supabase/server";
import { JOBS } from "@/lib/jobs";
import type { Resultado } from "./resultado";

/** «Correr ahora» desde Sistemas: solo owner. Deja la misma corrida que el cron. */
export async function correrJobAhora(clave: string): Promise<Resultado> {
  const s = await sesionActual();
  if (s?.perfil.rol !== "owner") return { ok: false, mensaje: "Solo Nazho corre jobs a mano." };
  const def = JOBS[clave];
  if (!def) return { ok: false, mensaje: `No existe el job ${clave}.` };
  const r = await def.correr();
  for (const p of ["/sistemas", "/inicio", "/recursos"]) revalidatePath(p);
  return r.estado === "error" ? { ok: false, mensaje: r.resumen } : { ok: true, mensaje: `${def.nombre}: ${r.resumen}` };
}
