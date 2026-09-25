import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Maquetas HTML por pieza (docs/maquetas.md). Viven en el bucket privado `assets` en
 * piezas/{pieza_id}/maqueta/v{N}.html; el trigger `registrar_asset` crea la fila con carpeta 'maqueta'.
 * Nunca se sobrescribe un archivo: cada guardado es una versión nueva.
 */
export const MAX_BYTES_MAQUETA = 2 * 1024 * 1024;

type Cliente = SupabaseClient<Database>;
export type Resultado<T> = { ok: true; valor: T } | { ok: false; mensaje: string };

export function rutaMaqueta(piezaId: string, version: number) {
  return `piezas/${piezaId}/maqueta/v${version}.html`;
}

/** Valida el documento antes de subirlo. Devuelve el mensaje de error legible o null. */
export function validarHtml(html: string): string | null {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > MAX_BYTES_MAQUETA) {
    return `La maqueta pesa ${(bytes / 1024 / 1024).toFixed(1)} MB; el máximo es 2 MB. Quita imágenes incrustadas o comprímelas.`;
  }
  if (!/^\s*(<!doctype html|<html[\s>])/i.test(html)) return "El html no es un documento completo: falta <html>.";
  return null;
}

export async function resolverPieza(supabase: Cliente, pieza: string) {
  const uuid = /^[0-9a-f-]{36}$/i.test(pieza) ? pieza : "00000000-0000-0000-0000-000000000000";
  const { data } = await supabase.from("piezas").select("id, id_publico, titulo").or(`id_publico.eq.${pieza},id.eq.${uuid}`).maybeSingle();
  return data;
}

export async function guardarMaqueta(supabase: Cliente, piezaId: string, html: string, nota?: string | null) {
  const invalido = validarHtml(html);
  if (invalido) return { ok: false, mensaje: invalido } as const;

  const [{ data: ultima }, { data: copy }] = await Promise.all([
    supabase.from("assets").select("version").eq("pieza_id", piezaId).eq("carpeta", "maqueta").not("version", "is", null).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("contenido_versiones").select("version").eq("pieza_id", piezaId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const version = (ultima?.version ?? 0) + 1;
  const contenidoVersion = copy?.version ?? null;
  const ruta = rutaMaqueta(piezaId, version);

  const { error: eSubir } = await supabase.storage.from("assets").upload(ruta, new Blob([html], { type: "text/html; charset=utf-8" }), {
    contentType: "text/html; charset=utf-8",
    upsert: false,
  });
  if (eSubir) return { ok: false, mensaje: /duplicate|exists/i.test(eSubir.message) ? `La versión ${version} ya existe; vuelve a intentar.` : `No se pudo subir la maqueta: ${eSubir.message}` } as const;

  const { error: eFila } = await supabase.from("assets").update({ version, contenido_version: contenidoVersion, nota: nota?.trim() || null, carpeta: "maqueta" }).eq("ruta", ruta);
  if (eFila) return { ok: false, mensaje: `Se subió el archivo pero no se registró la versión: ${eFila.message}` } as const;

  return { ok: true, valor: { version, contenido_version: contenidoVersion, bytes: Buffer.byteLength(html, "utf8"), ruta } } as const;
}

/** La maqueta de una pieza: la vigente o una versión concreta, con el HTML. */
export async function leerMaqueta(supabase: Cliente, piezaId: string, version?: number | null) {
  let q = supabase.from("assets").select("ruta, version, contenido_version, nota, created_at").eq("pieza_id", piezaId).eq("carpeta", "maqueta").not("version", "is", null);
  q = version ? q.eq("version", version) : q.order("version", { ascending: false }).limit(1);
  const { data: fila } = await q.maybeSingle();
  if (!fila) return null;
  const { data: copy } = await supabase.from("contenido_versiones").select("version").eq("pieza_id", piezaId).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: archivo, error } = await supabase.storage.from("assets").download(fila.ruta);
  if (error || !archivo) return { ...fila, contenido_actual: copy?.version ?? 0, desactualizada: false, html: null as string | null };
  const html = await archivo.text();
  return { ...fila, contenido_actual: copy?.version ?? 0, desactualizada: (copy?.version ?? 0) > (fila.contenido_version ?? 0), html };
}

/** Para cuando el HTML se sirve fuera del iframe: sin scripts ni formularios, con las fuentes de Google e imágenes incrustadas. */
export const CSP_MAQUETA = [
  "sandbox",
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src data: https:",
].join("; ");
