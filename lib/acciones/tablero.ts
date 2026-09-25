"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

function revalidar(piezaId?: string) {
  for (const p of ["/cola", "/inicio", "/equipo", "/piezas", "/calendario", "/historias", "/reels", "/carruseles", "/newsletter"]) revalidatePath(p);
  if (piezaId) revalidatePath(`/piezas/${piezaId}`);
}

/** Material → En mis manos. Crea la tarea (editar o diseñar) asignada a quien pulsa. */
export async function tomarPieza(piezaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tomar_pieza", { p_pieza_id: piezaId });
  if (error) return fallo(error);
  revalidar(piezaId);
  return { ok: true, mensaje: `En tus manos: ${data.tipo}.` };
}

/** En mis manos → Listo para publicar. Cierra la tarea y la pieza pasa a listo. */
export async function piezaLista(piezaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("pieza_lista", { p_pieza_id: piezaId });
  if (error) return fallo(error);
  revalidar(piezaId);
  return { ok: true, mensaje: `${data.id_publico} ya está en el buffer.` };
}

/** Listo → fecha de salida. Crea o mueve la tarea «publicar». */
export async function programarPieza(piezaId: string, fecha: string): Promise<Resultado> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Elige el día." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("programar_pieza", { p_pieza_id: piezaId, p_fecha: fecha });
  if (error) return fallo(error);
  revalidar(piezaId);
  return { ok: true, mensaje: `${data.id_publico} programada.` };
}

/** Cierra una pieza como publicada. La URL la exige el esquema; la plataforma se propone por tipo. */
export async function publicarPieza(piezaId: string, url: string, plataforma: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("publicar_desde_tablero", { p_pieza_id: piezaId, p_url: url.trim(), p_plataforma: plataforma.trim() });
  if (error) return fallo(error);
  revalidar(piezaId);
  return { ok: true, mensaje: `${data.id_publico} publicada. Cuenta para la semana.` };
}

/** Cierra una historia aprobada como publicada. No pide URL. */
export async function publicarHistoriaTablero(historiaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("publicar_historia", { p_id: historiaId });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "Historia publicada." };
}
