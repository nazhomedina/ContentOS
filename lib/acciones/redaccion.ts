"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

/** Editar el contenido desde la plataforma: cada guardado es una versión nueva. Owner y editor. */
export async function guardarContenido(piezaId: string, contenido: string, instruccion?: string): Promise<Resultado & { version?: number }> {
  if (!contenido.trim()) return { ok: false, mensaje: "El contenido no puede ir vacío." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("guardar_contenido", {
    p_pieza_id: piezaId, p_contenido: contenido, p_instruccion: instruccion ?? "editado en la app",
  });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  return { ok: true, mensaje: `Guardado como versión ${data.version}.`, version: data.version };
}

/** Vuelve a dejar vigente una versión anterior. No borra nada: entra como versión nueva con la instrucción «volver a vN». */
export async function volverAVersion(piezaId: string, version: number): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: v } = await supabase
    .from("contenido_versiones")
    .select("contenido")
    .eq("pieza_id", piezaId)
    .eq("version", version)
    .maybeSingle();
  if (!v) return { ok: false, mensaje: `No existe la versión ${version}.` };

  const { data, error } = await supabase.rpc("guardar_contenido", {
    p_pieza_id: piezaId, p_contenido: v.contenido, p_instruccion: `volver a v${version}`,
  });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  return { ok: true, mensaje: `La versión ${version} vuelve a ser la vigente (guardada como v${data.version}).` };
}

/** Etiquetas libres de la pieza (bugs, temas, lo que Nazho quiera). Solo owner por RLS. */
export async function guardarEtiquetas(piezaId: string, etiquetas: string[]): Promise<Resultado> {
  const limpias = [...new Set(etiquetas.map((e) => e.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))];
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("piezas").update({ etiquetas: limpias }, { count: "exact" }).eq("id", piezaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita etiquetas." };
  revalidatePath(`/piezas/${piezaId}`);
  for (const p of ["/reels", "/carruseles", "/articulos", "/newsletter", "/piezas", "/ideas"]) revalidatePath(p);
  return { ok: true };
}
