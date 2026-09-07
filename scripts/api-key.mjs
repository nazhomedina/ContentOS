// Genera (o rota) la API key del MCP para un perfil existente. La key se muestra una sola vez;
// en la base solo queda sha256(key || MCP_KEY_PEPPER).
// Uso: node --env-file=.env.local scripts/api-key.mjs correo@dominio
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.toLowerCase();
if (!email) { console.error("Uso: scripts/api-key.mjs correo@dominio"); process.exit(1); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: perfil } = await admin.from("perfiles").select("user_id, nombre, rol").eq("email", email).maybeSingle();
if (!perfil) { console.error(`${email} no tiene perfil todavía (tiene que entrar una vez a la app).`); process.exit(1); }

const key = "cos_" + randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(key + process.env.MCP_KEY_PEPPER).digest("hex");
const { error } = await admin.from("perfiles").update({ api_key_hash: hash }).eq("user_id", perfil.user_id);
if (error) { console.error(error.message); process.exit(1); }

console.log(`API key para ${perfil.nombre} (${perfil.rol}). Guárdala: no se vuelve a mostrar.\n\n${key}\n`);
console.log(`Claude Code: export CONTENTOS_MCP_KEY=${key.slice(0, 8)}…  (ver docs/mcp.md)`);
