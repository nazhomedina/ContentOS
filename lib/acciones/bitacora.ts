"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

function revalidar() {
  for (const p of ["/cola", "/equipo", "/inicio"]) revalidatePath(p);
}

export async function declarar(v: { texto: string; pieza_id?: string | null; tarea_id?: string | null; minutos?: number | null; evidencia_url?: string | null }): Promise<Resultado> {
  const texto = v.texto.trim();
  if (!texto) return { ok: false, mensaje: "Escribe en qué trabajaste." };
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Sin sesión." };
  const { error } = await supabase.from("bitacora").insert({
    perfil_id: user.id, texto,
    pieza_id: v.pieza_id || null, tarea_id: v.tarea_id || null,
    minutos: v.minutos && v.minutos > 0 ? Math.trunc(v.minutos) : null,
    evidencia_url: v.evidencia_url || null,
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: "Anotado en tu bitácora." };
}

export async function borrarDeclaracion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("bitacora").delete({ count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo puedes borrar lo de hoy." };
  revalidar();
  return { ok: true };
}
