import { autenticarLectura, jsonRes, sinKey } from "@/lib/identidad/http";
import { leerIdentidad } from "@/lib/identidad/leer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/identidad → las siete filas en JSON. `?solo_resumen=1` omite el cuerpo; `?clave=voz,reglas` filtra. */
export async function GET(request: Request) {
  const auth = await autenticarLectura(request);
  if (!auth) return sinKey();
  const url = new URL(request.url);
  const claves = url.searchParams.get("clave")?.split(",").map((c) => c.trim()).filter(Boolean);
  const soloResumen = ["1", "true"].includes(url.searchParams.get("solo_resumen") ?? "");
  const filas = await leerIdentidad(auth.supabase, claves);
  return jsonRes({ filas: soloResumen ? filas.map(({ cuerpo: _c, ...r }) => r) : filas });
}
