"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/tipos";
import { REGISTROS_HISTORIA, TIPOS_HISTORIA } from "@/lib/dominio/historias";
import { fallo, type Resultado } from "./resultado";

function revalidar() { for (const r of ["/historias", "/inicio", "/cola", "/recursos", "/calendario"]) revalidatePath(r); }
const limpio = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);

export async function programarHistoria(historiaId: string, cuando: string): Promise<Resultado> {
  if (!cuando) return { ok: false, mensaje: "Falta la hora." };
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase
    .from("historias")
    .update({ estado: "programada", programada_para: new Date(cuando).toISOString() }, { count: "exact" })
    .eq("id", historiaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  revalidar();
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
  revalidar();
  return { ok: true };
}

export async function metricasHistoria(historiaId: string, v: { views?: number | null; replies?: number | null; dms?: number | null }): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpiar = (x: number | null | undefined) => (x === undefined || x === null || Number.isNaN(x) ? null : Math.max(0, Math.trunc(x)));
  const { error, count } = await supabase
    .from("historias")
    .update({ views: limpiar(v.views), replies: limpiar(v.replies), dms: limpiar(v.dms) }, { count: "exact" })
    .eq("id", historiaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No puedes cambiar esa historia." };
  revalidar();
  return { ok: true, mensaje: "Métricas guardadas con tu nombre y fecha." };
}

export type CamposHistoria = {
  semana?: string | null; dia?: number | null; tipo: string; registro: string;
  copy?: string | null; keyword?: string | null; recurso_id?: string | null; pieza_amplificada_id?: string | null;
};
function validar(c: Partial<CamposHistoria>): string | null {
  if (c.dia != null && (!Number.isInteger(c.dia) || c.dia < 1 || c.dia > 7)) return "El día va de lunes (1) a domingo (7).";
  if (c.tipo != null && !(TIPOS_HISTORIA as readonly string[]).includes(c.tipo)) return "Elige qué busca la historia: lead magnet, amplificación, frase, pregunta o archivo.";
  if (c.registro != null && !(REGISTROS_HISTORIA as readonly string[]).includes(c.registro)) return "El registro es orgánico o producido.";
  return null;
}

/** Nazho crea una historia desde la web: con día queda en propuesta para esa semana; sin día va al buffer. Owner. */
export async function crearHistoria(c: CamposHistoria): Promise<Resultado> {
  const e = validar(c); if (e) return { ok: false, mensaje: e };
  const conFecha = Boolean(c.semana && c.dia);
  if (conFecha && !/^\d{4}-\d{2}-\d{2}$/.test(c.semana!)) return { ok: false, mensaje: "Falta la semana." };
  const supabase = await crearClienteServidor();
  const { data: com } = await supabase.from("comunidades").select("id").eq("activa", true).order("nombre").limit(1).maybeSingle();
  let orden = 1;
  if (conFecha) {
    const { data: ult } = await supabase.from("historias").select("orden").eq("semana", c.semana!).eq("dia", c.dia!).order("orden", { ascending: false }).limit(1).maybeSingle();
    orden = (ult?.orden ?? 0) + 1;
  }
  const { error } = await supabase.from("historias").insert({
    comunidad_id: com?.id ?? null, semana: conFecha ? c.semana : null, dia: conFecha ? c.dia : null, orden, tipo: c.tipo, registro: c.registro,
    copy: limpio(c.copy), keyword: limpio(c.keyword)?.toUpperCase() ?? null, recurso_id: c.recurso_id || null, pieza_amplificada_id: c.pieza_amplificada_id || null, estado: "propuesta",
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: conFecha ? "Historia en propuesta. Apruébala con la semana para que llegue a la cola de Mariela." : "Historia en el buffer. Agéndala en un día cuando toque." };
}

/** Edita copy, keyword, tipo, registro, recurso o pieza amplificada. Para mover de día, agendarHistoria. Owner. */
export async function editarHistoria(id: string, c: Partial<CamposHistoria>): Promise<Resultado> {
  const e = validar(c); if (e) return { ok: false, mensaje: e };
  const supabase = await crearClienteServidor();
  const cambios: TablesUpdate<"historias"> = {};
  if ("copy" in c) cambios.copy = limpio(c.copy);
  if ("keyword" in c) cambios.keyword = limpio(c.keyword)?.toUpperCase() ?? null;
  if ("tipo" in c && c.tipo) cambios.tipo = c.tipo;
  if ("registro" in c && c.registro) cambios.registro = c.registro;
  if ("recurso_id" in c) cambios.recurso_id = c.recurso_id || null;
  if ("pieza_amplificada_id" in c) cambios.pieza_amplificada_id = c.pieza_amplificada_id || null;
  const { error, count } = await supabase.from("historias").update(cambios, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita historias." };
  if (c.semana && c.dia) {
    const { error: e2 } = await supabase.rpc("agendar_historia", { p_id: id, p_semana: c.semana, p_dia: c.dia });
    if (e2) return fallo(e2);
  }
  revalidar();
  return { ok: true, mensaje: "Historia guardada." };
}

/** Del buffer (o de otro día) a un día de una semana. Si estaba en propuesta, queda aprobada y en la cola de Mariela. Owner. */
export async function agendarHistoria(id: string, semana: string, dia: number): Promise<Resultado> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana) || !Number.isInteger(dia) || dia < 1 || dia > 7) return { ok: false, mensaje: "Elige el día." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("agendar_historia", { p_id: id, p_semana: semana, p_dia: dia });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: data.estado === "aprobada" ? "Agendada y aprobada: ya está en la cola de Mariela." : "Agendada." };
}

/** De vuelta al buffer: sin fecha, en propuesta, sin tarea. Owner. */
export async function desagendarHistoria(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("desagendar_historia", { p_id: id });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "De vuelta en el buffer." };
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
