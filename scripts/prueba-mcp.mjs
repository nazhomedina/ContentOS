// Prueba del servidor MCP con un owner temporal y su API key. Limpia al final.
// Uso: node --env-file=.env.local scripts/prueba-mcp.mjs [http://localhost:3017]
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3017";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `prueba-mcp-${Date.now()}@contentos.local`;
const resultados = [];
const ok = (n, c, d = "") => resultados.push({ n, ok: !!c, d });
let userId;

async function rpc(key, method, params, id = 1) {
  const r = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const ct = r.headers.get("content-type") ?? "";
  const text = await r.text();
  let json = null;
  if (ct.includes("text/event-stream")) {
    const linea = text.split("\n").find((l) => l.startsWith("data:"));
    json = linea ? JSON.parse(linea.slice(5)) : null;
  } else if (text) {
    try { json = JSON.parse(text); } catch { json = null; }
  }
  return { status: r.status, json, text };
}

try {
  await admin.from("perfiles_permitidos").insert({ email, nombre: "MCP Prueba", rol: "owner" });
  const { data: u } = await admin.auth.admin.createUser({ email, password: "x-" + randomBytes(8).toString("hex"), email_confirm: true });
  userId = u?.user?.id;
  const key = "cos_" + randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(key + process.env.MCP_KEY_PEPPER).digest("hex");
  await admin.from("perfiles").update({ api_key_hash: hash }).eq("user_id", userId);

  let r = await rpc(null, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "prueba", version: "0" } });
  ok("sin key → 401", r.status === 401, String(r.status));

  r = await rpc("cos_invalida_" + "x".repeat(30), "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "prueba", version: "0" } });
  ok("key inválida → 401", r.status === 401, String(r.status));

  r = await rpc(key, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "prueba", version: "0" } });
  ok("initialize 200 con serverInfo ContentOS", r.status === 200 && r.json?.result?.serverInfo?.name === "ContentOS", `${r.status} ${r.text.slice(0, 120)}`);

  r = await rpc(key, "tools/list", {}, 2);
  const tools = r.json?.result?.tools?.map((t) => t.name) ?? [];
  ok("tools/list ≥ 17 herramientas", tools.length >= 17, `${tools.length}: ${tools.join(", ")}`);

  r = await rpc(key, "tools/call", { name: "listar_comunidades", arguments: {} }, 3);
  let com = [];
  try { com = JSON.parse(r.json?.result?.content?.[0]?.text ?? "[]"); } catch {}
  ok("listar_comunidades devuelve Fundadores con criterio", Array.isArray(com) && com.some((c) => c.nombre === "Fundadores con criterio"), `status ${r.status} · ${r.text.slice(0, 400)}`);
  if (!com[0]) { console.log("RAW listar_comunidades:", r.status, r.text.slice(0, 600)); throw new Error("sin comunidades; abortando"); }

  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { id_publico: "TST-77", comunidad_id: com[0].id, formato: "reel", etapa_embudo: "atraer", hipotesis: { texto: "prueba de fecha pasada", campo: "views", numero: 100, fecha: "2020-01-01" } } }, 4);
  ok("crear_pieza con fecha pasada → error legible", r.json?.result?.isError && /futuro/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);

  r = await rpc(key, "tools/call", { name: "estado_semana", arguments: {} }, 5);
  const es = JSON.parse(r.json?.result?.content?.[0]?.text ?? "{}");
  ok("estado_semana trae cuota y 4 sistemas", Array.isArray(es.cuota) && Object.keys(es.sistemas ?? {}).length === 4, Object.keys(es.sistemas ?? {}).join(","));

  r = await rpc(key, "tools/call", { name: "cola_de", arguments: { persona: "todos" } }, 6);
  ok("cola_de todos responde", r.status === 200 && !r.json?.result?.isError, r.text.slice(0, 100));

  r = await rpc(key, "tools/call", { name: "proponer_historias", arguments: { semana: "2026-09-14", historias: [{ dia: 1, serie: "te_lo_resumo", registro: "producido", copy: "prueba mcp" }] } }, 7);
  ok("proponer_historias crea 1 en propuesta", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).propuestas === 1, r.json?.result?.content?.[0]?.text);
  const { count: corr } = await admin.from("corridas").select("*", { count: "exact", head: true }).eq("sistema", "proponer_historias");
  ok("dejó latido en corridas", (corr ?? 0) >= 1, String(corr));
  await admin.from("historias").delete().eq("copy", "prueba mcp");

  // editor por MCP no puede crear ideas (RLS vía impersonación)
  const emailE = `prueba-mcp-editor-${Date.now()}@contentos.local`;
  await admin.from("perfiles_permitidos").insert({ email: emailE, nombre: "MCP Editor", rol: "editor" });
  const { data: ue } = await admin.auth.admin.createUser({ email: emailE, password: "x-" + randomBytes(8).toString("hex"), email_confirm: true });
  const keyE = "cos_" + randomBytes(32).toString("base64url");
  await admin.from("perfiles").update({ api_key_hash: createHash("sha256").update(keyE + process.env.MCP_KEY_PEPPER).digest("hex") }).eq("user_id", ue.user.id);
  r = await rpc(keyE, "tools/call", { name: "crear_idea", arguments: { comunidad_id: com[0].id, titulo: "no debería" } }, 8);
  ok("editor por MCP: crear_idea bloqueada por RLS", r.json?.result?.isError && /row-level|policy/i.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  await admin.auth.admin.deleteUser(ue.user.id);
  await admin.from("perfiles_permitidos").delete().eq("email", emailE);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  await admin.from("perfiles_permitidos").delete().eq("email", email);
  await admin.from("corridas").delete().like("payload->>actor", userId ?? "nada");
}

let fallos = 0;
for (const x of resultados) { if (!x.ok) fallos++; console.log(`${x.ok ? "✅" : "❌"} ${x.n}${x.d ? " — " + x.d : ""}`); }
console.log(`\n${resultados.length - fallos}/${resultados.length} en verde`);
process.exit(fallos ? 1 : 0);
