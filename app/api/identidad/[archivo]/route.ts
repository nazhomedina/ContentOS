import { autenticarLectura, jsonRes, md, sinKey } from "@/lib/identidad/http";
import { CLAVES_IDENTIDAD, leerIdentidad } from "@/lib/identidad/leer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/identidad/{clave}.md → el cuerpo en markdown. GET /api/identidad/{clave} → la fila en JSON. */
export async function GET(request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const auth = await autenticarLectura(request);
  if (!auth) return sinKey();
  const { archivo } = await params;
  const quiereMd = archivo.endsWith(".md");
  const clave = quiereMd ? archivo.slice(0, -3) : archivo;
  if (!(CLAVES_IDENTIDAD as readonly string[]).includes(clave)) return jsonRes({ error: `No existe la fila «${clave}». Claves: ${CLAVES_IDENTIDAD.join(", ")}.` }, 404);
  const [fila] = await leerIdentidad(auth.supabase, [clave]);
  if (!fila) return jsonRes({ error: `La fila «${clave}» no está vigente.` }, 404);
  return quiereMd ? md(`# ${fila.titulo}\n\n_${fila.resumen}_\n\n${fila.cuerpo.trim()}\n`) : jsonRes(fila);
}
