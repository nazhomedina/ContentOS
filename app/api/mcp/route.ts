import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { autenticarMcp, describirAuth } from "@/lib/mcp/auth";
import { crearServidorMcp } from "@/lib/mcp/servidor";
import type { Database, Perfil } from "@/lib/supabase/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Métodos que se sirven sin key: el saludo y la lista de herramientas. Así el diálogo de conectores de
 *  Claude puede verificar la URL antes de guardar la cabecera; toda llamada a una tool sigue exigiendo la key. */
const SIN_KEY = new Set(["initialize", "notifications/initialized", "ping", "tools/list"]);

async function metodosDe(request: Request): Promise<string[] | null> {
  if (request.method !== "POST") return null;
  try {
    const cuerpo = await request.clone().json();
    const lista = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
    return lista.map((m) => String(m?.method ?? ""));
  } catch { return null; }
}

function contextoAnonimo() {
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const perfil: Perfil = { user_id: "00000000-0000-0000-0000-000000000000", nombre: "Sin key", email: null, rol: "anonimo", comunidades: [], api_key_hash: null, created_at: new Date(0).toISOString() };
  return { supabase, perfil };
}

/**
 * Servidor MCP de ContentOS · Streamable HTTP sin estado (una instancia por request,
 * sin sesiones ni SSE de reanudación: Vercel es serverless). Auth: Bearer <api_key>.
 */
async function manejar(request: Request): Promise<Response> {
  const cabAuth = request.headers.get("authorization"), cabKey = request.headers.get("x-api-key");
  let auth = await autenticarMcp(cabAuth, cabKey);
  if (!auth) {
    const metodos = await metodosDe(request);
    console.log(`mcp sin key válida · ${describirAuth(cabAuth, cabKey)} · ${request.method} ${metodos?.join(",") ?? "?"} · ua=${(request.headers.get("user-agent") ?? "").slice(0, 60)}`);
    if (metodos && metodos.length > 0 && metodos.every((m) => SIN_KEY.has(m))) {
      auth = contextoAnonimo();
    } else {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Falta la key de ContentOS. En el conector: Request headers → authorization → «Bearer cos_…». Se genera con scripts/api-key.mjs." }, id: null }), {
        status: 401, headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="ContentOS", error="invalid_token"' },
      });
    }
  }
  const server = crearServidorMcp(auth.supabase, auth.perfil);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  // No se cierra el server aquí: la Response es un stream que se llena después de devolverla.
  // Sin estado, la instancia muere con la request.
  return transport.handleRequest(request);
}

export const POST = manejar;
export const GET = manejar;
export const DELETE = manejar;
