"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export async function marcarPublicada(piezaId: string, url: string, plataforma: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("marcar_publicada", {
    p_pieza_id: piezaId,
    p_url: url.trim(),
    p_plataforma: plataforma.trim(),
  });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  revalidatePath("/piezas");
  revalidatePath("/cola");
  return { ok: true, mensaje: "Publicada. La métrica queda pendiente para el post-scraper." };
}

export async function cambiarEstadoPieza(piezaId: string, estado: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_estado_pieza", { p_pieza_id: piezaId, p_nuevo_estado: estado });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  revalidatePath("/piezas");
  revalidatePath("/cola");
  return { ok: true };
}

export async function comentar(piezaId: string, texto: string): Promise<Resultado> {
  const t = texto.trim();
  if (!t) return { ok: false, mensaje: "Escribe algo." };
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Sin sesión." };
  const { error } = await supabase.from("comentarios").insert({ pieza_id: piezaId, autor: user.id, texto: t });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  return { ok: true };
}

/** URL firmada para ver o descargar un asset del bucket privado. */
export async function urlFirmada(ruta: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("assets").createSignedUrl(ruta, 60 * 60);
  return data?.signedUrl ?? null;
}
