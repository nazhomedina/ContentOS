"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export type CamposRecurso = {
  nombre: string; slug_go?: string | null; keyword?: string | null; kit_tag_id?: string | null;
  estado?: string; tipo?: string | null; descripcion?: string | null;
};

const limpio = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);
function revalidar() { for (const p of ["/recursos", "/historias", "/inicio"]) revalidatePath(p); }

/** Alta o edición de un lead magnet. Owner. Con id edita la fila completa (permite vaciar campos); sin id crea. */
export async function guardarRecurso(id: string | null, c: CamposRecurso): Promise<Resultado> {
  if (!c.nombre.trim()) return { ok: false, mensaje: "El recurso necesita nombre." };
  const supabase = await crearClienteServidor();
  if (id) {
    const { error, count } = await supabase.from("recursos").update({
      nombre: c.nombre.trim(), slug_go: limpio(c.slug_go), keyword: limpio(c.keyword)?.toUpperCase() ?? null, kit_tag_id: limpio(c.kit_tag_id),
      estado: c.estado, tipo: limpio(c.tipo), descripcion: limpio(c.descripcion),
    }, { count: "exact" }).eq("id", id);
    if (error) return fallo(error);
    if (count === 0) return { ok: false, mensaje: "Solo Nazho edita los lead magnets." };
  } else {
    const { error } = await supabase.rpc("guardar_recurso", {
      p_nombre: c.nombre.trim(), p_slug_go: limpio(c.slug_go) ?? undefined, p_keyword: limpio(c.keyword) ?? undefined, p_kit_tag_id: limpio(c.kit_tag_id) ?? undefined,
      p_estado: c.estado, p_tipo: limpio(c.tipo) ?? undefined, p_descripcion: limpio(c.descripcion) ?? undefined,
    });
    if (error) return fallo(error);
  }
  revalidar();
  return { ok: true, mensaje: id ? "Recurso guardado." : "Recurso creado." };
}

/** Leads a mano con fecha de corte, mientras no corra go_leads. Owner. */
export async function anotarLeads(id: string, leads: number, fecha: string): Promise<Resultado> {
  if (!Number.isFinite(leads) || leads < 0) return { ok: false, mensaje: "Los leads son un número de cero en adelante." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("registrar_leads", { p_recurso: id, p_leads: Math.trunc(leads), p_fecha: fecha || undefined });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "Leads anotados con fecha de corte." };
}
