"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export type CambiosFormato = {
  nombre?: string; estado?: string; serie_propia?: string | null; duracion?: string | null;
  recompensa?: string | null; cadencia?: string | null; hipotesis_formato?: string | null; notas?: string | null;
};

/** Los campos propios de un formato (Format Card). Solo owner por RLS. */
export async function guardarFormato(id: string, cambios: CambiosFormato): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpio: CambiosFormato = {};
  for (const k of Object.keys(cambios) as (keyof CambiosFormato)[]) {
    const v = cambios[k];
    (limpio as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() || null : v;
  }
  if ("nombre" in limpio && !limpio.nombre) return { ok: false, mensaje: "El nombre no puede ir vacío." };
  if ("estado" in limpio && !limpio.estado) return { ok: false, mensaje: "Elige un estado." };
  const { error, count } = await supabase.from("formatos").update(limpio, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita formatos." };
  revalidatePath("/formatos");
  return { ok: true, mensaje: "Formato guardado." };
}
