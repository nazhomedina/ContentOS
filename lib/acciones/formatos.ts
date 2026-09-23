"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fallo, type Resultado } from "./resultado";

export type CambiosFormato = {
  nombre?: string; estado?: string; serie_propia?: string | null; duracion?: string | null;
  recompensa?: string | null; cadencia?: string | null; notas?: string | null;
};
function revalidar(id?: string) { revalidatePath("/formatos"); if (id) revalidatePath(`/formatos/${id}`); }
const limpio = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);

/** Los campos propios de un formato. Solo owner por RLS. */
export async function guardarFormato(id: string, cambios: CambiosFormato): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpioTodo: CambiosFormato = {};
  for (const k of Object.keys(cambios) as (keyof CambiosFormato)[]) {
    const v = cambios[k];
    (limpioTodo as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() || null : v;
  }
  if ("nombre" in limpioTodo && !limpioTodo.nombre) return { ok: false, mensaje: "El nombre no puede ir vacío." };
  if ("estado" in limpioTodo && !limpioTodo.estado) return { ok: false, mensaje: "Elige un estado." };
  const { error, count } = await supabase.from("formatos").update(limpioTodo, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita formatos." };
  revalidar(id);
  return { ok: true, mensaje: "Formato guardado." };
}

/** Etiquetas libres del formato (las de la galería). Owner. */
export async function guardarEtiquetasFormato(id: string, etiquetas: string[]): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const lista = Array.from(new Set(etiquetas.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  const { error, count } = await supabase.from("formatos").update({ etiquetas: lista }, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita formatos." };
  revalidar(id);
  return { ok: true };
}

/** La portada ya subida a Storage (assets/formatos/{id}/…). Owner. */
export async function guardarPortada(id: string, ruta: string | null): Promise<Resultado> {
  if (ruta && !ruta.startsWith(`formatos/${id}/`)) return { ok: false, mensaje: "La ruta de la portada no es válida." };
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("formatos").update({ portada: ruta }, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho edita formatos." };
  revalidar(id);
  return { ok: true, mensaje: ruta ? "Portada guardada." : "Portada quitada." };
}

/** Un formato nuevo: nombre, etiquetas y lo que se sepa. El código se asigna solo. Owner. */
export async function crearFormato(c: { nombre: string; etiquetas?: string[]; serie_propia?: string | null; duracion?: string | null; recompensa?: string | null; cadencia?: string | null; origen?: string | null; estado?: string }): Promise<Resultado & { id?: string }> {
  if (!c.nombre.trim()) return { ok: false, mensaje: "El formato necesita nombre." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_formato", {
    p_nombre: c.nombre.trim(), p_etiquetas: (c.etiquetas ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean),
    p_serie_propia: limpio(c.serie_propia) ?? undefined, p_duracion: limpio(c.duracion) ?? undefined, p_recompensa: limpio(c.recompensa) ?? undefined,
    p_cadencia: limpio(c.cadencia) ?? undefined, p_origen: limpio(c.origen) ?? undefined, p_estado: c.estado ?? "detectado",
  });
  if (error) return fallo(error);
  revalidar();
  return { ok: true, mensaje: `${data.codigo} creado.`, id: data.id };
}

export type NuevaReferencia = { cuenta?: string | null; url?: string | null; pieza_id?: string | null; multiplicador?: number | null; views?: number | null; duracion_s?: number | null; nota?: string | null };

/** Una referencia: el reel ajeno (o propio) que sostiene el formato. Owner. */
export async function agregarReferencia(formatoId: string, r: NuevaReferencia): Promise<Resultado> {
  const url = limpio(r.url);
  if (!url && !r.pieza_id) return { ok: false, mensaje: "Una referencia necesita la liga del reel o una pieza propia." };
  if (url && !/^https?:\/\/\S+/i.test(url)) return { ok: false, mensaje: "La liga empieza con http:// o https://." };
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  let cuenta = limpio(r.cuenta);
  if (cuenta && !cuenta.startsWith("@")) cuenta = `@${cuenta}`;
  const { error } = await supabase.from("referencias").insert({
    formato_id: formatoId, cuenta, url, pieza_id: r.pieza_id || null,
    multiplicador: r.multiplicador ?? null, views: r.views ?? null, duracion_s: r.duracion_s ?? null, nota: limpio(r.nota), creado_por: user?.id ?? null,
  });
  if (error) return fallo(/duplicate/i.test(error.message) ? "Esa liga ya está en las referencias del formato." : error);
  revalidar(formatoId);
  return { ok: true, mensaje: "Referencia agregada." };
}

export async function borrarReferencia(formatoId: string, id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("referencias").delete({ count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (count === 0) return { ok: false, mensaje: "Solo Nazho quita referencias." };
  revalidar(formatoId);
  return { ok: true, mensaje: "Referencia quitada." };
}

/** La hipótesis del formato: texto solo, o texto con campo, número y fecha para que se pueda resolver. Owner. */
export async function guardarHipotesisFormato(formatoId: string, h: { texto: string; campo?: string | null; numero?: number | null; fecha?: string | null }): Promise<Resultado> {
  if (!h.texto.trim()) return { ok: false, mensaje: "La hipótesis necesita texto." };
  const completa = Boolean(h.campo && h.numero != null && h.fecha);
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_hipotesis_formato", {
    p_formato_id: formatoId, p_texto: h.texto.trim(),
    p_campo: completa ? h.campo! : undefined, p_numero: completa ? h.numero! : undefined, p_fecha: completa ? h.fecha! : undefined,
  });
  if (error) return fallo(error);
  revalidar(formatoId); revalidatePath("/hipotesis");
  return { ok: true, mensaje: completa ? "Hipótesis guardada: se resuelve cuando venza." : "Hipótesis escrita. Ponle campo, número y fecha para poder resolverla." };
}
