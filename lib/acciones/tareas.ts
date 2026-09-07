"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";
import type { TablesUpdate } from "@/lib/supabase/tipos";

const ESTADOS = ["pendiente", "en_curso", "bloqueada", "hecha"] as const;

export async function cambiarEstadoTarea(tareaId: string, estado: string, notaBloqueo?: string): Promise<Resultado> {
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) return { ok: false, mensaje: "Estado inválido." };
  if (estado === "bloqueada" && !notaBloqueo?.trim()) return { ok: false, mensaje: "Para bloquear, escribe qué te detiene." };

  const supabase = await crearClienteServidor();
  const cambios: TablesUpdate<"tareas"> = { estado };
  if (estado === "bloqueada") cambios.nota_bloqueo = notaBloqueo!.trim();
  if (estado === "hecha") cambios.hecha_en = new Date().toISOString();
  if (estado === "pendiente" || estado === "en_curso") cambios.nota_bloqueo = null;

  const { error, count } = await supabase.from("tareas").update(cambios, { count: "exact" }).eq("id", tareaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Esa tarea no está en tu cola." };
  revalidatePath("/cola");
  revalidatePath("/piezas/[id]", "page");
  return { ok: true };
}

export async function guardarChecklist(tareaId: string, checklist: { texto: string; hecho: boolean }[]): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("tareas").update({ checklist }, { count: "exact" }).eq("id", tareaId);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Esa tarea no está en tu cola." };
  revalidatePath("/piezas/[id]", "page");
  return { ok: true };
}
