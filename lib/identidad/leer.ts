import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";

export const CLAVES_IDENTIDAD = ["quien-soy", "audiencia", "postura", "voz", "oferta", "reglas", "evidencia"] as const;

export type FilaIdentidad = { clave: string; orden: number; titulo: string; resumen: string; cuerpo: string; version: number; actualizado: string };

export async function leerIdentidad(supabase: SupabaseClient<Database>, claves?: string[]): Promise<FilaIdentidad[]> {
  let q = supabase.from("identidad").select("clave, orden, titulo, resumen, cuerpo, version, actualizado").eq("vigente", true).order("orden");
  if (claves?.length) q = q.in("clave", claves);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

/** El documento completo, regenerado desde la tabla: una sección por fila. */
export function identidadComoMarkdown(filas: FilaIdentidad[]): string {
  const fecha = filas.reduce((m, f) => (f.actualizado > m ? f.actualizado : m), "").slice(0, 10);
  const cabecera = `# Identidad de Nazho\n\nSiete filas que todo agente lee antes de escribir o decidir por él. Fuente: ContentOS, tabla \`identidad\`. Última edición: ${fecha}.\n\n`;
  const indice = filas.map((f) => `${f.orden}. ${f.titulo} (\`${f.clave}\`, v${f.version})`).join("\n");
  const cuerpo = filas.map((f) => `\n\n---\n\n# ${f.orden}. ${f.titulo}\n\n_${f.resumen}_\n\n${f.cuerpo.trim()}`).join("");
  return cabecera + indice + cuerpo + "\n";
}
