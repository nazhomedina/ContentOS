"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

type Entrada = { tipo: "texto" | "link" | "respuesta"; texto: string; responde_a?: string };

/**
 * Nazho escribe en el stream de una pieza desde la web: texto, link o respuesta a una
 * pregunta de Claude. Se guarda tal cual (docs/redaccion.md: nunca se «mejora» al guardar).
 * Las notas de voz entran por MCP o por el job de transcripción, no por aquí.
 */
export async function agregarAlStream(piezaId: string, entrada: Entrada): Promise<Resultado> {
  const texto = entrada.texto.trim();
  if (!texto) return { ok: false, mensaje: "Escribe algo." };
  if (entrada.tipo === "link" && !/^https?:\/\/\S+/i.test(texto.split(/\s/)[0])) {
    return { ok: false, mensaje: "El link va primero y empieza con http:// o https://. Después, si quieres, una línea de por qué." };
  }
  if (entrada.tipo === "respuesta" && !entrada.responde_a) return { ok: false, mensaje: "Falta la pregunta que respondes." };

  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Sin sesión." };

  const { error } = await supabase.from("pensamientos").insert({
    pieza_id: piezaId,
    tipo: entrada.tipo,
    texto,
    responde_a: entrada.responde_a ?? null,
    autor: user.id,
  });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  revalidatePath("/ideas");
  return { ok: true };
}

/** Vuelve a dejar vigente un guion anterior. No borra nada: entra como versión nueva con la instrucción «volver a vN». */
export async function volverAVersion(piezaId: string, version: number): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: v } = await supabase
    .from("guion_versiones")
    .select("guion, hipotesis, spec_visual, fidelidad")
    .eq("pieza_id", piezaId)
    .eq("version", version)
    .maybeSingle();
  if (!v) return { ok: false, mensaje: `No existe la versión ${version}.` };

  const { data, error } = await supabase.rpc("guardar_guion", {
    p_pieza_id: piezaId,
    p_guion: v.guion,
    p_hipotesis: v.hipotesis,
    p_spec_visual: v.spec_visual,
    p_fidelidad: v.fidelidad,
    p_instruccion: `volver a v${version}`,
    p_autor: "nazho",
  });
  if (error) return fallo(error);
  revalidatePath(`/piezas/${piezaId}`);
  return { ok: true, mensaje: `La versión ${version} vuelve a ser la vigente (guardada como v${data.version}).` };
}
