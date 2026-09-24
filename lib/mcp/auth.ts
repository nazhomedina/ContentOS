import "server-only";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database, Perfil } from "@/lib/supabase/tipos";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key + process.env.MCP_KEY_PEPPER!).digest("hex");
}

/**
 * Resuelve el Bearer a un perfil y devuelve un cliente que impersona a ese usuario:
 * JWT HS256 firmado con el secreto legacy del proyecto (sub = user_id, role = authenticated).
 * Así la RLS aplica al MCP igual que a la web (PLAN.md hallazgo 7, plan A).
 */
/** Saca la key de las cabeceras: `Authorization: Bearer cos_…`, `Authorization: cos_…` (sin esquema) o `x-api-key: cos_…`. */
export function extraerKey(authorization: string | null, xApiKey: string | null): string | null {
  const conEsquema = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const candidata = conEsquema ?? authorization?.trim() ?? xApiKey?.trim() ?? null;
  return candidata && candidata.length >= 20 ? candidata : null;
}

/** Cómo llegó la autorización, sin revelar la key: para leerlo en los logs de Vercel. */
export function describirAuth(authorization: string | null, xApiKey: string | null): string {
  if (authorization) return /^Bearer\s+/i.test(authorization) ? `authorization bearer (${authorization.length} chars)` : `authorization sin esquema (${authorization.length} chars)`;
  if (xApiKey) return `x-api-key (${xApiKey.length} chars)`;
  return "sin cabecera";
}

export async function autenticarMcp(authorization: string | null, xApiKey: string | null = null): Promise<{ perfil: Perfil; supabase: SupabaseClient<Database> } | null> {
  const key = extraerKey(authorization, xApiKey);
  if (!key) return null;

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin.rpc("perfil_por_api_key", { p_hash: hashApiKey(key) });
  if (!perfil?.user_id) return null;

  const secreto = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  const jwt = await new SignJWT({ role: "authenticated", email: perfil.email ?? undefined, app_metadata: { via: "mcp" } })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(perfil.user_id)
    .setAudience("authenticated")
    .setIssuer(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secreto);

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { perfil, supabase };
}
