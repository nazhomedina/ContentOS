import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { autenticarMcp } from "@/lib/mcp/auth";
import { crearServidorMcp } from "@/lib/mcp/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Servidor MCP de ContentOS · Streamable HTTP sin estado (una instancia por request,
 * sin sesiones ni SSE de reanudación: Vercel es serverless). Auth: Bearer <api_key>.
 */
async function manejar(request: Request): Promise<Response> {
  const auth = await autenticarMcp(request.headers.get("authorization"));
  if (!auth) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "API key inválida o ausente." }, id: null }), {
      status: 401, headers: { "content-type": "application/json", "www-authenticate": "Bearer" },
    });
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
