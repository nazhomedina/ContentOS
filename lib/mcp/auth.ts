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
export async function autenticarMcp(authorization: string | null): Promise<{ perfil: Perfil; supabase: SupabaseClient<Database> } | null> {
  const key = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!key || key.length < 20) return null;

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
