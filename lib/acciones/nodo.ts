"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaHipotesis } from "@/lib/dominio/hipotesis";
import { fallo, type Resultado } from "./resultado";

function revalidarTodo() {
  for (const p of ["/inicio", "/sistemas", "/piezas", "/cola", "/historias", "/formatos", "/equipo"]) revalidatePath(p);
}

export async function declararHueco(semana: string, sistema: string, nodo: string, nota: string): Promise<Resultado> {
  if (!nota.trim()) return { ok: false, mensaje: "Un hueco se declara con una razón." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("declarar_hueco", { p_semana: semana, p_sistema: sistema, p_nodo: nodo, p_nota: nota.trim() });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true, mensaje: "Hueco declarado. Nunca se estima." };
}

export async function aprobarHistoriasSemana(semana: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("aprobar_historias", { p_semana: semana });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true, mensaje: data === 0 ? "No había historias en propuesta." : `${data} historias aprobadas y asignadas a Mariela.` };
}

export type PayloadPieza = {
  titulo: string; notas?: string | null; formato?: string | null; estado?: string | null; origen?: string | null;
  fecha_objetivo?: string | null; responsable_id?: string | null; guion?: string | null;
  etapa_embudo?: string | null; format_card?: string | null; serie?: string | null; cta?: string | null;
  hipotesis?: { texto: string; campo: string; numero: number; fecha: string } | null;
};

/** Capturar es escribir una línea. Todo lo demás lo completa Claude por MCP. */
export async function crearPieza(p: PayloadPieza): Promise<Resultado & { id?: string; id_publico?: string }> {
  if (!p.titulo?.trim()) return { ok: false, mensaje: "Una pieza nace con al menos un título." };
  if (p.hipotesis) {
    const h = esquemaHipotesis.safeParse(p.hipotesis);
    if (!h.success) return { ok: false, mensaje: h.error.issues[0]?.message ?? "Hipótesis inválida." };
  }
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_pieza_validada", {
    payload: { ...p, titulo: p.titulo.trim(), estado: p.estado || "idea", origen: p.origen || "nazho" },
  });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true, mensaje: `${data.id_publico} capturada.`, id: data.id, id_publico: data.id_publico };
}

export async function asignarTarea(v: { pieza_id?: string; historia_id?: string; tipo: string; asignado_a: string; vence: string; checklist?: string[] }): Promise<Resultado> {
  if (!v.vence) return { ok: false, mensaje: "Falta la fecha de vencimiento." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("asignar_tarea", {
    p_tipo: v.tipo, p_asignado_a: v.asignado_a, p_vence: v.vence,
    p_pieza_id: v.pieza_id, p_historia_id: v.historia_id,
    p_checklist: (v.checklist ?? []).map((texto) => ({ texto, hecho: false })),
  });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true, mensaje: "Tarea en la cola." };
}

export async function moverEstado(piezaId: string, estado: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_estado_pieza", { p_pieza_id: piezaId, p_nuevo_estado: estado });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true };
}

export async function actualizarPieza(piezaId: string, cambios: { fecha_objetivo?: string | null; responsable_id?: string | null; titulo?: string | null; programa_aprobado?: boolean; formato?: string | null; notas?: string | null; guion?: string | null }): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("piezas").update(cambios, { count: "exact" }).eq("id", piezaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No se pudo actualizar la pieza." };
  revalidarTodo();
  return { ok: true };
}

export async function proponerHistoria(v: { semana: string; dia: number; serie: string; registro: string; copy?: string; keyword?: string; pieza_amplificada_id?: string | null }): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("historias").insert({
    comunidad_id: "11111111-0000-4000-8000-000000000001",
    semana: v.semana, dia: v.dia, serie: v.serie, registro: v.registro,
    copy: v.copy || null, keyword: v.keyword || null, pieza_amplificada_id: v.pieza_amplificada_id || null,
    estado: "propuesta",
  });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true, mensaje: "Historia en propuesta. Apruébala desde Hoy." };
}

export async function guardarMeta(formato: string, cantidad: number): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("metas_semana").upsert({ formato, cantidad });
  if (error) return fallo(error);
  revalidarTodo();
  return { ok: true };
}
