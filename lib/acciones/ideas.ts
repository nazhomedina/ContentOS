"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";
import { TOPE_SHORTLIST } from "@/lib/dominio/buffer";

const ESTADOS = ["nueva", "shortlist", "convertida", "descartada"] as const;

export async function moverIdea(ideaId: string, estado: string): Promise<Resultado> {
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) return { ok: false, mensaje: "Estado inválido." };
  const supabase = await crearClienteServidor();
  if (estado === "shortlist") {
    const { count } = await supabase.from("ideas").select("id", { count: "exact", head: true }).eq("estado", "shortlist");
    if ((count ?? 0) >= TOPE_SHORTLIST) return { ok: false, mensaje: `La shortlist ya tiene ${TOPE_SHORTLIST}. Descarta o convierte una antes.` };
  }
  const { error, count } = await supabase.from("ideas").update({ estado }, { count: "exact" }).eq("id", ideaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "No se pudo mover la idea." };
  revalidatePath("/ideas");
  revalidatePath("/hoy");
  return { ok: true };
}

export async function crearIdea(v: { titulo: string; comunidad_id: string; origen?: string; etapa_embudo?: string | null; notas?: string | null }): Promise<Resultado> {
  if (!v.titulo.trim()) return { ok: false, mensaje: "La idea necesita un título." };
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("ideas").insert({
    titulo: v.titulo.trim(), comunidad_id: v.comunidad_id, origen: v.origen ?? "nazho",
    etapa_embudo: v.etapa_embudo || null, notas: v.notas || null, creado_por: user?.id,
  });
  if (error) return fallo(error);
  revalidatePath("/ideas");
  return { ok: true, mensaje: "Idea capturada." };
}

export async function anotarIdea(ideaId: string, notas: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("ideas").update({ notas }).eq("id", ideaId);
  if (error) return fallo(error);
  revalidatePath("/ideas");
  return { ok: true };
}
