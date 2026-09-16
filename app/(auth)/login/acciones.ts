"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { ok: boolean; mensaje: string } | null;

/** Entrada normal: correo y el código que Nazho generó en Accesos (una contraseña de Supabase Auth). */
export async function entrarConCodigo(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const volver = String(formData.get("volver") ?? "/");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: "Escribe un correo válido." };
  if (codigo.length < 6) return { ok: false, mensaje: "Escribe el código que te dio Nazho." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: codigo });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) return { ok: false, mensaje: "Correo o código incorrectos. Si no tienes código, pídeselo a Nazho." };
    if (/rate limit/i.test(error.message)) return { ok: false, mensaje: "Demasiados intentos. Espera un minuto." };
    return { ok: false, mensaje: `No se pudo entrar: ${error.message}` };
  }
  redirect(volver.startsWith("/") ? volver : "/");
}

/** Respaldo: enlace por correo. Con el SMTP de fábrica de Supabase solo llega a los miembros del proyecto. */
export async function enviarMagicLink(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const volver = String(formData.get("volver") ?? "/");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, mensaje: "Escribe un correo válido." };
  }

  const h = await headers();
  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origen}/auth/callback?volver=${encodeURIComponent(volver)}` },
  });

  if (error) {
    if (/database error|no tiene acceso/i.test(error.message)) {
      return { ok: false, mensaje: "Este correo no tiene acceso a ContentOS. Pídele a Nazho que te dé de alta." };
    }
    if (/email rate limit/i.test(error.message)) {
      return { ok: false, mensaje: "Supabase limita los correos por hora en este proyecto. Mejor pide un código." };
    }
    if (/rate limit|security purposes/i.test(error.message)) {
      return { ok: false, mensaje: "Espera un minuto antes de pedir otro enlace." };
    }
    return { ok: false, mensaje: `No se pudo enviar el enlace: ${error.message}` };
  }
  return { ok: true, mensaje: `Te mandé un enlace a ${email}. Ábrelo desde este mismo dispositivo.` };
}
