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
  ok("tools/list ≥ 15 herramientas sin las de ideas", tools.length >= 15 && !tools.includes("crear_idea"), `${tools.length}: ${tools.join(", ")}`);

  r = await rpc(key, "tools/call", { name: "listar_comunidades", arguments: {} }, 3);
  let com = [];
  try { com = JSON.parse(r.json?.result?.content?.[0]?.text ?? "[]"); } catch {}
  ok("listar_comunidades devuelve Fundadores con criterio", Array.isArray(com) && com.some((c) => c.nombre === "Fundadores con criterio"), `status ${r.status} · ${r.text.slice(0, 400)}`);
  if (!com[0]) { console.log("RAW listar_comunidades:", r.status, r.text.slice(0, 600)); throw new Error("sin comunidades; abortando"); }

  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp", estado: "grabacion", formato: "reel", etapa_embudo: "atraer", hipotesis: { texto: "prueba de fecha pasada", campo: "views", numero: 100, fecha: "2020-01-01" } } }, 4);
  ok("crear_pieza con fecha pasada → error legible", r.json?.result?.isError && /futuro/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "idea desde mcp" } }, 41);
  const creada = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("crear_pieza solo con título → borrador IDE-", creada?.estado === "borrador" && /^IDE-/.test(creada?.id_publico ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_pieza", arguments: { pieza: creada.id_publico, formato: "yap", etapa_embudo: "atraer", format_card: "FC-08", hipotesis: { texto: "si abro con la postura", campo: "multiplicador", numero: 3, fecha: "2026-12-31" }, guion: "## Beats", estado: "grabacion" } }, 42);
  const dev = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("actualizar_pieza desarrolla el borrador → YAP- en grabacion", dev?.estado === "grabacion" && /^YAP-/.test(dev?.id_publico ?? "") && dev?.format_card_id, r.json?.result?.content?.[0]?.text?.slice(0, 160));
  if (creada?.id) await admin.from("piezas").delete().eq("id", creada.id);
  // stream de redacción
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "stream de prueba", origen: "voz" } }, 50);
  const st = JSON.parse(r.json.result.content[0].text);
  r = await rpc(key, "tools/call", { name: "agregar_pensamiento", arguments: { pieza: st.id_publico, tipo: "voz", transcript: "lo que nadie te dice de cobrar caro es que el cliente que llega por precio se va por precio", duracion_s: 94 } }, 51);
  ok("agregar_pensamiento voz", !r.json?.result?.isError, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "agregar_pensamiento", arguments: { pieza: st.id_publico, tipo: "pregunta", texto: "¿Cuál fue el cliente que te enseñó esto?", ronda: 1 } }, 52);
  const preg = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("agregar_pensamiento pregunta ronda 1", preg?.tipo === "pregunta" && preg?.ronda === 1, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "agregar_pensamiento", arguments: { pieza: st.id_publico, tipo: "respuesta", texto: "el de la constructora en 2019", responde_a: preg?.id } }, 53);
  ok("agregar_pensamiento respuesta ligada", !r.json?.result?.isError, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "stream_de", arguments: { pieza: st.id_publico } }, 54);
  const stream = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("stream_de devuelve 3 pensamientos, 1 ronda, 0 sin responder", stream?.stream?.length === 3 && stream?.rondas_de_preguntas === 1 && stream?.preguntas_sin_responder?.length === 0, JSON.stringify({ n: stream?.stream?.length, r: stream?.rondas_de_preguntas, s: stream?.preguntas_sin_responder }));
  r = await rpc(key, "tools/call", { name: "guardar_guion", arguments: { pieza: st.id_publico, guion: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer.", hipotesis: { texto: "si abro con la postura", campo: "multiplicador", numero: 3, fecha: "2026-12-31" }, fidelidad: "mis_palabras", autor: "yap-scripter" } }, 55);
  ok("guardar_guion versión 1", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 1, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "guardar_guion", arguments: { pieza: st.id_publico, guion: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer. (v2 más corta)", instruccion: "más corto", autor: "yap-scripter" } }, 56);
  ok("guardar_guion versión 2 conserva hipótesis", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 2, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_pieza", arguments: { pieza: st.id_publico, formato: "yap", etapa_embudo: "atraer", estado: "grabacion" } }, 57);
  const fin = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("la pieza pasa a grabación con guion e hipótesis del stream", fin?.estado === "grabacion" && /^YAP-/.test(fin?.id_publico ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 160));
  if (st?.id) await admin.from("piezas").delete().eq("id", st.id);

  r = await rpc(key, "tools/call", { name: "listar_formatos", arguments: {} }, 43);
  ok("listar_formatos devuelve 6 cards", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).length === 6, "");

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
  r = await rpc(keyE, "tools/call", { name: "crear_pieza", arguments: { titulo: "no debería" } }, 8);
  ok("editor por MCP: crear_pieza bloqueada (requiere owner)", r.json?.result?.isError && /owner/i.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
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
