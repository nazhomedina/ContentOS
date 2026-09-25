"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { nombreDia } from "@/lib/dominio/newsletter";
import { fallo, type Resultado } from "./resultado";

/** El día de la semana en que sale el newsletter (1 = lunes … 7 = domingo). Vive en la tabla newsletter. Owner. */
export async function guardarDiaEnvio(dia: number): Promise<Resultado> {
  if (!Number.isInteger(dia) || dia < 1 || dia > 7) return { ok: false, mensaje: "Elige un día de la semana." };
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("newsletter").update({ dia_envio: dia }, { count: "exact" }).eq("id", 1);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho cambia el día de envío." };
  revalidatePath("/newsletter");
  return { ok: true, mensaje: `El newsletter sale los ${nombreDia(dia)}. Las ediciones ya agendadas conservan su fecha.` };
}

/** Agenda una edición: nace como borrador con el siguiente número y esa fecha. Owner. */
export async function agendarEdicion(titulo: string, fecha: string): Promise<Resultado> {
  if (!titulo.trim()) return { ok: false, mensaje: "Escribe el criterio de la edición." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_pieza_validada", {
    payload: { titulo: titulo.trim(), tipo: "newsletter", estado: "borrador", fecha_objetivo: fecha || undefined, etiquetas: ["nazho"] },
  });
  if (error) return fallo(error);
  revalidatePath("/newsletter");
  return { ok: true, mensaje: `${data.id_publico} agendada.` };
}
