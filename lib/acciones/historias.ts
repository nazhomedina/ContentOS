"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/tipos";
import { REGISTROS_HISTORIA, SERIES_HISTORIA } from "@/lib/dominio/historias";
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

export type CamposHistoria = {
  semana: string; dia: number; serie: string; registro: string;
  copy?: string | null; keyword?: string | null; recurso_id?: string | null; pieza_amplificada_id?: string | null;
};
const limpio = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);
function revalidar() { for (const r of ["/historias", "/inicio", "/cola", "/recursos"]) revalidatePath(r); }
function validar(c: Partial<CamposHistoria>): string | null {
  if (c.dia != null && (!Number.isInteger(c.dia) || c.dia < 1 || c.dia > 7)) return "El día va de lunes (1) a domingo (7).";
  if (c.serie != null && !(SERIES_HISTORIA as readonly string[]).includes(c.serie)) return "Elige una serie de historias.";
  if (c.registro != null && !(REGISTROS_HISTORIA as readonly string[]).includes(c.registro)) return "El registro es orgánico o producido.";
  return null;
}

/** Nazho crea una historia desde la web: nace en propuesta y se aprueba con la semana. Owner. */
export async function crearHistoria(c: CamposHistoria): Promise<Resultado> {
  const e = validar(c); if (e) return { ok: false, mensaje: e };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.semana)) return { ok: false, mensaje: "Falta la semana." };
  const supabase = await crearClienteServidor();
  const [{ data: com }, { data: ult }] = await Promise.all([
    supabase.from("comunidades").select("id").eq("activa", true).order("nombre").limit(1).maybeSingle(),
    supabase.from("historias").select("orden").eq("semana", c.semana).eq("dia", c.dia).order("orden", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { error } = await supabase.from("historias").insert({
    comunidad_id: com?.id ?? null, semana: c.semana, dia: c.dia, orden: (ult?.orden ?? 0) + 1, serie: c.serie, registro: c.registro,
    copy: limpio(c.copy), keyword: limpio(c.keyword)?.toUpperCase() ?? null, recurso_id: c.recurso_id || null, pieza_amplificada_id: c.pieza_amplificada_id || null, estado: "propuesta",
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "Historia en propuesta. Apruébala con la semana para que llegue a la cola de Mariela." };
}

/** Edita copy, keyword, serie, registro, día, recurso o pieza amplificada. Owner. */
export async function editarHistoria(id: string, c: Partial<CamposHistoria>): Promise<Resultado> {
  const e = validar(c); if (e) return { ok: false, mensaje: e };
  const supabase = await crearClienteServidor();
  const cambios: TablesUpdate<"historias"> = {};
  if ("copy" in c) cambios.copy = limpio(c.copy);
  if ("keyword" in c) cambios.keyword = limpio(c.keyword)?.toUpperCase() ?? null;
  if ("serie" in c) cambios.serie = c.serie;
  if ("registro" in c) cambios.registro = c.registro;
  if ("dia" in c) cambios.dia = c.dia;
  if ("recurso_id" in c) cambios.recurso_id = c.recurso_id || null;
  if ("pieza_amplificada_id" in c) cambios.pieza_amplificada_id = c.pieza_amplificada_id || null;
  const { error, count } = await supabase.from("historias").update(cambios, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita historias." };
  if ("dia" in c) {
    const { data: h } = await supabase.from("historias").select("semana, dia").eq("id", id).single();
    if (h) await supabase.from("tareas").update({ vence: addDiasISO(h.semana, h.dia - 1) }).eq("historia_id", id).neq("estado", "hecha");
  }
  revalidar();
  return { ok: true, mensaje: "Historia guardada." };
}
function addDiasISO(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10);
}

/** Descarta una historia y borra su tarea «publicar» si seguía abierta. Owner. */
export async function descartarHistoria(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("historias").update({ estado: "descartada" }, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho descarta historias." };
  await supabase.from("tareas").delete().eq("historia_id", id).neq("estado", "hecha");
  revalidar();
  return { ok: true, mensaje: "Historia descartada." };
}

/** El asset que Mariela produjo, ya subido a Storage (assets/historias/…). Editor u owner. */
export async function guardarAssetHistoria(id: string, ruta: string): Promise<Resultado> {
  if (!ruta.startsWith("historias/")) return { ok: false, mensaje: "La ruta del asset no es válida." };
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("historias").update({ asset_url: ruta }, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  revalidar();
  return { ok: true, mensaje: "Asset guardado en la historia." };
}
