"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

function revalidar(piezaId?: string) {
  for (const p of ["/series", "/reels", "/carruseles", "/articulos", "/newsletter", "/piezas", "/cola"]) revalidatePath(p);
  if (piezaId) revalidatePath(`/piezas/${piezaId}`);
}

/** Declara o edita una serie: descripción, activa, nuevo nombre. Owner. */
export async function guardarSerie(nombre: string, c: { descripcion?: string | null; activa?: boolean; nuevo_nombre?: string }): Promise<Resultado> {
  if (!nombre.trim()) return { ok: false, mensaje: "La serie necesita nombre." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_serie", {
    p_nombre: nombre.trim(), p_descripcion: c.descripcion ?? undefined, p_activa: c.activa, p_nuevo_nombre: c.nuevo_nombre?.trim() || undefined,
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: c.activa === false ? "Serie apagada." : c.activa === true ? "Serie activa." : "Serie guardada." };
}

/** Las series de una pieza, como etiquetas: sustituye la lista completa. Owner. */
export async function guardarSeriesPieza(piezaId: string, series: string[]): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("piezas").update({ series: series.map((s) => s.trim()).filter(Boolean) }, { count: "exact" }).eq("id", piezaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita las series de una pieza." };
  revalidar(piezaId);
  return { ok: true };
}
