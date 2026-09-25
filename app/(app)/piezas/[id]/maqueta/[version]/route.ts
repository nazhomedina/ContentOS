import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { CSP_MAQUETA, leerMaqueta } from "@/lib/maquetas";

export const dynamic = "force-dynamic";

/**
 * «Abrir en pestaña nueva»: sirve la maqueta desde ContentOS (no desde Supabase, que puede entregarla como texto)
 * con una CSP de sandbox: el HTML no ejecuta scripts ni puede tocar la sesión.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) return new Response("Sin sesión.", { status: 401 });
  const { id, version } = await params;
  const v = Number(version.replace(/^v/, ""));
  if (!Number.isInteger(v) || v < 1) return new Response("Versión inválida.", { status: 400 });
  const supabase = await crearClienteServidor();
  const m = await leerMaqueta(supabase, id, v);
  if (!m?.html) return new Response("Esa maqueta no existe.", { status: 404 });
  return new Response(m.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": CSP_MAQUETA,
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
