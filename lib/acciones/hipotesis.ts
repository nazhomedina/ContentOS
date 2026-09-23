"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaHipotesis, type HipotesisNueva } from "@/lib/dominio/hipotesis";
import { fallo, type Resultado } from "./resultado";

function revalidar(piezaId?: string) {
  for (const p of ["/hipotesis", "/inicio", "/reels", "/carruseles", "/articulos", "/newsletter", "/piezas", "/formatos"]) revalidatePath(p);
  if (piezaId) revalidatePath(`/piezas/${piezaId}`);
}

/** Crea una hipótesis resoluble (o reusa la del mismo texto) y la liga a la pieza. */
export async function crearYLigarHipotesis(piezaId: string, h: HipotesisNueva): Promise<Resultado> {
  const v = esquemaHipotesis.safeParse(h);
  if (!v.success) return { ok: false, mensaje: v.error.issues[0]?.message ?? "Hipótesis inválida." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_hipotesis", { p_texto: v.data.texto, p_campo: v.data.campo, p_numero: v.data.numero, p_fecha: v.data.fecha });
  if (error) return fallo(error);
  const { error: e2 } = await supabase.rpc("ligar_hipotesis", { p_pieza_id: piezaId, p_hipotesis_id: data.id });
  if (e2) return fallo(e2);
  revalidar(piezaId);
  return { ok: true, mensaje: "Hipótesis ligada a la pieza." };
}

/** Liga la pieza a una hipótesis existente, o la desliga con null. */
export async function ligarHipotesis(piezaId: string, hipotesisId: string | null): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  // null desliga; el tipo generado no admite null porque el parámetro SQL no tiene default, pero la función lo acepta.
  const { error } = await supabase.rpc("ligar_hipotesis", { p_pieza_id: piezaId, p_hipotesis_id: hipotesisId as unknown as string });
  if (error) return fallo(error);
  revalidar(piezaId);
  return { ok: true, mensaje: hipotesisId ? "Hipótesis ligada." : "Pieza sin hipótesis." };
}

/** Verdadera · falsa · sin_datos, con veredicto. Abierta = reabrir. */
export async function resolverHipotesis(id: string, estado: "abierta" | "verdadera" | "falsa" | "sin_datos", veredicto?: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("resolver_hipotesis", { p_hipotesis_id: id, p_estado: estado, p_veredicto: veredicto?.trim() || undefined });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: estado === "abierta" ? "Reabierta." : `Cerrada como ${estado.replace("_", " ")}.` };
}

/** Completar o corregir texto, campo, número y fecha. */
export async function completarHipotesis(id: string, c: { texto?: string; campo?: string; numero?: number | null; fecha?: string }): Promise<Resultado> {
  if (c.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) return { ok: false, mensaje: "La fecha debe ser AAAA-MM-DD." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("actualizar_hipotesis", {
    p_hipotesis_id: id, p_texto: c.texto?.trim() || undefined, p_campo: c.campo?.trim() || undefined,
    p_numero: c.numero ?? undefined, p_fecha: c.fecha || undefined,
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "Hipótesis actualizada." };
}
