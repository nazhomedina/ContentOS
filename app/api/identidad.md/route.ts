import { autenticarLectura, md, sinKey } from "@/lib/identidad/http";
import { identidadComoMarkdown, leerIdentidad } from "@/lib/identidad/leer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/identidad.md → el documento completo regenerado desde la tabla. */
export async function GET(request: Request) {
  const auth = await autenticarLectura(request);
  if (!auth) return sinKey();
  return md(identidadComoMarkdown(await leerIdentidad(auth.supabase)));
}
