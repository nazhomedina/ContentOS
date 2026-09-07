"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export async function programarHistoria(historiaId: string, cuando: string): Promise<Resultado> {
  if (!cuando) return { ok: false, mensaje: "Falta la hora." };
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase
    .from("historias")
    .update({ estado: "programada", programada_para: new Date(cuando).toISOString() }, { count: "exact" })
    .eq("id", historiaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  revalidatePath("/historias");
  return { ok: true };
}

export async function publicarHistoria(historiaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase
    .from("historias")
    .update({ estado: "publicada", publicada_en: new Date().toISOString() }, { count: "exact" })
    .eq("id", historiaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  // Cierra la tarea 'publicar' ligada, si la hay.
  await supabase.from("tareas").update({ estado: "hecha", hecha_en: new Date().toISOString() })
    .eq("historia_id", historiaId).eq("tipo", "publicar").neq("estado", "hecha");
  revalidatePath("/historias");
  revalidatePath("/cola");
  return { ok: true };
}

export async function metricasHistoria(historiaId: string, v: { views?: number | null; replies?: number | null; dms?: number | null }): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpio = (x: number | null | undefined) => (x === undefined || x === null || Number.isNaN(x) ? null : Math.max(0, Math.trunc(x)));
  const { error, count } = await supabase
    .from("historias")
    .update({ views: limpio(v.views), replies: limpio(v.replies), dms: limpio(v.dms) }, { count: "exact" })
    .eq("id", historiaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  revalidatePath("/historias");
  return { ok: true, mensaje: "Métricas guardadas con tu nombre y fecha." };
}
