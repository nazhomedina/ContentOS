"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export async function agregarCuenta(v: { handle: string; plataforma: string; nota?: string | null }): Promise<Resultado> {
  const handle = v.handle.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(instagram|tiktok|youtube|x)\.com\//, "").replace(/\/.*$/, "");
  if (!handle) return { ok: false, mensaje: "Falta el handle." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("cuentas_referencia").insert({ handle, plataforma: v.plataforma, nota: v.nota?.trim() || null });
  if (error) return fallo(error.message.includes("duplicate") ? "Esa cuenta ya está en seguimiento." : error);
  revalidatePath("/cuentas");
  return { ok: true, mensaje: `@${handle} en seguimiento.` };
}

export async function alternarCuenta(id: string, activa: boolean): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("cuentas_referencia").update({ activa }).eq("id", id);
  if (error) return fallo(error);
  revalidatePath("/cuentas");
  return { ok: true };
}

export async function anotarCuenta(id: string, nota: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("cuentas_referencia").update({ nota: nota.trim() || null }).eq("id", id);
  if (error) return fallo(error);
  revalidatePath("/cuentas");
  return { ok: true };
}
