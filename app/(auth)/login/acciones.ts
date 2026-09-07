"use server";

import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { ok: boolean; mensaje: string } | null;

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
    // El trigger de perfiles rechaza correos fuera de la lista blanca; GoTrue lo reporta como error de base.
    if (/database error|no tiene acceso/i.test(error.message)) {
      return { ok: false, mensaje: "Este correo no tiene acceso a ContentOS. Pídele a Nazho que te dé de alta." };
    }
    if (/email rate limit/i.test(error.message)) {
      return { ok: false, mensaje: "Supabase limita los correos por hora en este proyecto. Espera una hora o pídele a Nazho un enlace directo." };
    }
    if (/rate limit|security purposes/i.test(error.message)) {
      return { ok: false, mensaje: "Espera un minuto antes de pedir otro enlace." };
    }
    return { ok: false, mensaje: `No se pudo enviar el enlace: ${error.message}` };
  }
  return { ok: true, mensaje: `Te mandé un enlace a ${email}. Ábrelo desde este mismo dispositivo.` };
}
