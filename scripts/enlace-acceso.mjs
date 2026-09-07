// Genera un enlace de acceso para un correo de la lista blanca sin mandar correo
// (salta el tope de correos por hora de Supabase). Válido una vez, ~1 hora.
// Uso: node --env-file=.env.local scripts/enlace-acceso.mjs correo@dominio [--abrir] [http://localhost:3017]
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const email = args.find((a) => a.includes("@"));
const abrir = args.includes("--abrir");
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3017";
if (!email) { console.error("Falta el correo."); process.exit(1); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: permitido } = await admin.from("perfiles_permitidos").select("email").eq("email", email.toLowerCase()).maybeSingle();
if (!permitido) { console.error(`${email} no está en la lista blanca.`); process.exit(1); }

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: email.toLowerCase() });
if (error) { console.error(error.message); process.exit(1); }

const enlace = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`;
if (abrir) {
  spawn("open", [enlace], { stdio: "ignore", detached: true }).unref();
  console.log(`Enlace abierto en el navegador para ${email}. Caduca en una hora y sirve una sola vez.`);
} else {
  console.log(enlace);
}
