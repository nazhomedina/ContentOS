"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { pestanaDeFormato } from "@/lib/dominio/estados";
import { fallo, type Resultado } from "./resultado";

function revalidar() {
  for (const p of ["/inicio", "/ideas", "/piezas", "/reels", "/carruseles", "/articulos", "/newsletter", "/calendario"]) revalidatePath(p);
}

/** Un borrador entra a producción: se le da formato y pasa a redacción. */
export async function pasarARedaccion(piezaId: string, formato: string): Promise<Resultado & { ruta?: string }> {
  if (!formato) return { ok: false, mensaje: "Elige el formato para producirla." };
  const supabase = await crearClienteServidor();
  const { error: e1 } = await supabase.from("piezas").update({ formato }).eq("id", piezaId);
  if (e1) return fallo(e1);
  const { error: e2 } = await supabase.rpc("cambiar_estado_pieza", { p_pieza_id: piezaId, p_nuevo_estado: "redaccion" });
  if (e2) return fallo(e2);
  revalidar();
  return { ok: true, mensaje: "En redacción. Claude escribe guion e hipótesis desde aquí.", ruta: pestanaDeFormato(formato) ?? "/piezas" };
}

export async function archivarPieza(piezaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_estado_pieza", { p_pieza_id: piezaId, p_nuevo_estado: "archivada" });
  if (error) return fallo(error);
  revalidar();
  return { ok: true };
}

export async function anotarBorrador(piezaId: string, notas: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("piezas").update({ notas: notas.trim() || null }).eq("id", piezaId);
  if (error) return fallo(error);
  revalidar();
  return { ok: true };
}
