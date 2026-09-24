import "server-only";
import { autenticarMcp, describirAuth } from "@/lib/mcp/auth";

/** Las rutas /api/identidad usan la misma key del MCP (Bearer, sin esquema o x-api-key). Cualquier rol lee. */
export async function autenticarLectura(request: Request) {
  const cabAuth = request.headers.get("authorization"), cabKey = request.headers.get("x-api-key");
  const auth = await autenticarMcp(cabAuth, cabKey);
  if (!auth) console.log(`identidad sin key válida · ${describirAuth(cabAuth, cabKey)} · ${new URL(request.url).pathname}`);
  return auth;
}

export const sinKey = () => new Response(JSON.stringify({ error: "Falta la key. Manda `Authorization: Bearer cos_…` o `x-api-key: cos_…`." }), { status: 401, headers: { "content-type": "application/json; charset=utf-8" } });
export const md = (texto: string) => new Response(texto, { status: 200, headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" } });
export const jsonRes = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
