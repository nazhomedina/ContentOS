// Verifica que Supabase Auth acepta correo + código (contraseña) en este proyecto, con un usuario temporal que se borra al final.
// Uso: node --env-file=.env.local scripts/prueba-acceso.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const email = `prueba-codigo-${Date.now()}@contentos.local`;
const codigo = "PRUE-" + randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
let id;
try {
  await admin.from("perfiles_permitidos").insert({ email, nombre: "Prueba código", rol: "viewer" });
  const { data: u, error: e1 } = await admin.auth.admin.createUser({ email, password: codigo, email_confirm: true });
  if (e1) throw e1; id = u.user.id;
  const { data: s, error: e2 } = await anon.auth.signInWithPassword({ email, password: codigo });
  console.log(e2 ? `❌ signInWithPassword: ${e2.message}` : `✅ entra con código (sesión para ${s.user.email})`);
  const { error: e3 } = await anon.auth.signInWithPassword({ email, password: "XXXX-XXXX" });
  console.log(e3 ? `✅ código incorrecto rechazado (${e3.message})` : "❌ aceptó un código incorrecto");
} finally {
  if (id) await admin.auth.admin.deleteUser(id);
  await admin.from("perfiles_permitidos").delete().eq("email", email);
}
