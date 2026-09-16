"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

/** Un código legible de 8 caracteres (sin 0/O ni 1/I), tipo XXXX-XXXX. Es la contraseña de Supabase Auth. */
function nuevoCodigo(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parte = () => Array.from({ length: 4 }, () => abc[randomInt(abc.length)]).join("");
  return `${parte()}-${parte()}`;
}

async function exigirOwner(): Promise<string | null> {
  const s = await sesionActual();
  return s?.perfil.rol === "owner" ? null : "Solo Nazho administra los accesos.";
}

/** Da de alta a una persona en la lista blanca (sin usuario todavía). Owner. */
export async function darAcceso(c: { email: string; nombre: string; rol: string }): Promise<Resultado> {
  const e = await exigirOwner(); if (e) return { ok: false, mensaje: e };
  const email = c.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: "Escribe un correo válido." };
  if (!c.nombre.trim()) return { ok: false, mensaje: "Falta el nombre." };
  if (!["owner", "editor", "viewer"].includes(c.rol)) return { ok: false, mensaje: "Elige un rol." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("perfiles_permitidos").insert({ email, nombre: c.nombre.trim(), rol: c.rol });
  if (error) return fallo(error);
  revalidatePath("/accesos");
  return { ok: true, mensaje: `${c.nombre.trim()} tiene acceso. Genera su código para que pueda entrar.` };
}

/**
 * Genera (o reemplaza) el código de una persona de la lista blanca. Crea el usuario de Auth si no existe;
 * el trigger de perfiles le da su perfil. El código se muestra una sola vez: Nazho se lo pasa en persona.
 */
export async function generarCodigo(email: string): Promise<Resultado & { codigo?: string }> {
  const e = await exigirOwner(); if (e) return { ok: false, mensaje: e };
  const correo = email.trim().toLowerCase();
  const admin = crearClienteAdmin();
  const { data: permitido } = await admin.from("perfiles_permitidos").select("email, nombre").eq("email", correo).maybeSingle();
  if (!permitido) return { ok: false, mensaje: "Ese correo no está en la lista de acceso." };
  const codigo = nuevoCodigo();
  const { data: perfil } = await admin.from("perfiles").select("user_id").eq("email", correo).maybeSingle();
  if (perfil) {
    const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { password: codigo });
    if (error) return { ok: false, mensaje: `No se pudo cambiar el código: ${error.message}` };
  } else {
    const { error } = await admin.auth.admin.createUser({ email: correo, password: codigo, email_confirm: true });
    if (error) return { ok: false, mensaje: `No se pudo crear el usuario: ${error.message}` };
  }
  await admin.from("corridas").insert({ sistema: "generar_codigo", estado: "ok", resumen: `código nuevo para ${correo}`, payload: { email: correo } });
  revalidatePath("/accesos");
  return { ok: true, mensaje: `Código nuevo para ${permitido.nombre}. Cópialo: no se vuelve a mostrar.`, codigo };
}
