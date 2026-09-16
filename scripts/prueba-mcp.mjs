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

  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp", estado: "grabacion", tipo: "reel", etapa_embudo: "atraer", hipotesis: { texto: "prueba de fecha pasada", campo: "views", numero: 100, fecha: "2020-01-01" } } }, 4);
  ok("crear_pieza con fecha pasada → error legible", r.json?.result?.isError && /futuro/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "idea desde mcp" } }, 41);
  const creada = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("crear_pieza solo con título → borrador IDE-", creada?.estado === "borrador" && /^IDE-/.test(creada?.id_publico ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_pieza", arguments: { pieza: creada.id_publico, tipo: "yap", etapa_embudo: "atraer", formato: "FC-08", hipotesis: { texto: "si abro con la postura", campo: "multiplicador", numero: 3, fecha: "2026-12-31" }, contenido: "## Beats", estado: "grabacion" } }, 42);
  const dev = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("actualizar_pieza desarrolla el borrador → YAP- en grabacion", dev?.estado === "grabacion" && /^YAP-/.test(dev?.id_publico ?? "") && dev?.formato_id, r.json?.result?.content?.[0]?.text?.slice(0, 160));
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
  r = await rpc(key, "tools/call", { name: "guardar_contenido", arguments: { pieza: st.id_publico, contenido: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer.", hipotesis: { texto: "si abro con la postura", campo: "multiplicador", numero: 3, fecha: "2026-12-31" }, autor: "yap-scripter" } }, 55);
  ok("guardar_contenido versión 1", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 1, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "guardar_contenido", arguments: { pieza: st.id_publico, contenido: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer. (v2 más corta)", instruccion: "más corto", autor: "yap-scripter" } }, 56);
  ok("guardar_contenido versión 2 conserva hipótesis", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 2, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_pieza", arguments: { pieza: st.id_publico, tipo: "yap", etapa_embudo: "atraer", estado: "grabacion" } }, 57);
  const fin = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("la pieza pasa a grabación con contenido e hipótesis del stream", fin?.estado === "grabacion" && /^YAP-/.test(fin?.id_publico ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 160));
  if (st?.id) await admin.from("piezas").delete().eq("id", st.id);

  r = await rpc(key, "tools/call", { name: "listar_formatos", arguments: { con_molde: false } }, 43);
  const fcs = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  ok("listar_formatos devuelve 7 formatos con ficha y resumen (FC-09 incluido)", fcs.length === 7 && fcs.some((f) => f.codigo === "FC-09") && fcs.every((f) => f.serie_propia && f.resumen && typeof f.resumen.episodios === "number"), fcs[0] ? `${fcs[0].codigo} ${fcs[0].serie_propia} · ${fcs[0].resumen?.episodios} episodios` : "");

  // hipótesis: la del stream quedó creada; se lista con evidencia, se resuelve con veredicto y se limpia
  r = await rpc(key, "tools/call", { name: "listar_hipotesis", arguments: { estado: "abierta", limite: 300 } }, 44);
  const hs = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  const hMia = hs.find((h) => h.texto === "si abro con la postura");
  ok("listar_hipotesis trae la hipótesis creada por guardar_contenido", Boolean(hMia) && Array.isArray(hMia.evidencia), hMia ? `${hMia.campo} ≥ ${hMia.numero} · vencida=${hMia.vencida}` : "no está");
  r = await rpc(key, "tools/call", { name: "resolver_hipotesis", arguments: { hipotesis_id: hMia?.id ?? "00000000-0000-0000-0000-000000000000", estado: "falsa" } }, 45);
  ok("resolver_hipotesis sin veredicto → error legible", r.json?.result?.isError && /veredicto/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 100));
  r = await rpc(key, "tools/call", { name: "resolver_hipotesis", arguments: { hipotesis_id: hMia?.id ?? "00000000-0000-0000-0000-000000000000", estado: "sin_datos", veredicto: "prueba" } }, 46);
  ok("resolver_hipotesis sin_datos cierra", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).estado === "sin_datos", r.json?.result?.content?.[0]?.text?.slice(0, 100));
  if (hMia?.id) await admin.from("hipotesis").delete().eq("id", hMia.id);

  r = await rpc(key, "tools/call", { name: "estado_semana", arguments: {} }, 5);
  const es = JSON.parse(r.json?.result?.content?.[0]?.text ?? "{}");
  ok("estado_semana trae cuota y 4 sistemas", Array.isArray(es.cuota) && Object.keys(es.sistemas ?? {}).length === 4, Object.keys(es.sistemas ?? {}).join(","));

  r = await rpc(key, "tools/call", { name: "cola_de", arguments: { persona: "todos" } }, 6);
  ok("cola_de todos responde", r.status === 200 && !r.json?.result?.isError, r.text.slice(0, 100));

  r = await rpc(key, "tools/call", { name: "proponer_historias", arguments: { semana: "2026-09-14", historias: [{ dia: 1, tipo: "lead_magnet", registro: "producido", copy: "prueba mcp" }] } }, 7);
  ok("proponer_historias crea 1 en propuesta", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).propuestas === 1, r.json?.result?.content?.[0]?.text);
  const { count: corr } = await admin.from("corridas").select("*", { count: "exact", head: true }).eq("sistema", "proponer_historias");
  ok("dejó latido en corridas", (corr ?? 0) >= 1, String(corr));
  r = await rpc(key, "tools/call", { name: "proponer_historias", arguments: { historias: [{ tipo: "frase", registro: "organico", copy: "prueba mcp buffer" }] } }, 75);
  const buf = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("proponer_historias sin semana → buffer sin fecha", buf?.propuestas === 1 && buf?.historias?.[0]?.semana == null, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "agendar_historia", arguments: { historia_id: buf?.historias?.[0]?.id ?? "00000000-0000-0000-0000-000000000000", semana: "2026-09-16", dia: 2 } }, 76);
  const ag = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("agendar_historia normaliza al lunes, aprueba y crea la tarea", ag?.semana === "2026-09-14" && ag?.dia === 2 && ag?.estado === "aprobada", r.json?.result?.content?.[0]?.text?.slice(0, 120));
  if (ag?.id) { const { count: tr } = await admin.from("tareas").select("*", { count: "exact", head: true }).eq("historia_id", ag.id).eq("tipo", "publicar"); ok("la historia agendada tiene tarea publicar", (tr ?? 0) === 1, String(tr)); await admin.from("tareas").delete().eq("historia_id", ag.id); }
  await admin.from("historias").delete().in("copy", ["prueba mcp", "prueba mcp buffer"]);

  r = await rpc(key, "tools/call", { name: "listar_recursos", arguments: {} }, 71);
  const recs = JSON.parse(r.json?.result?.content?.[0]?.text ?? "[]");
  ok("listar_recursos trae RORY, 90 y BEAST con url y resumen", ["RORY", "90", "BEAST"].every((k) => recs.some((x) => x.keyword === k && x.url && x.resumen)), recs.map((x) => x.keyword).join(","));
  r = await rpc(key, "tools/call", { name: "guardar_recurso", arguments: { nombre: "prueba mcp recurso", slug_go: "prueba-mcp", keyword: "prueba", leads: 5, fecha_corte: "2026-09-15" } }, 72);
  const rec = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("guardar_recurso crea, sube la keyword y anota 5 leads a mano", rec?.leads === 5 && rec?.leads_fuente === "manual" && rec?.keyword === "PRUEBA", r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "guardar_recurso", arguments: { nombre: "prueba mcp recurso", slug_go: "prueba-mcp", leads: 3, fecha_corte: "2030-01-01" } }, 73);
  ok("guardar_recurso con fecha de corte futura → error legible", r.json?.result?.isError && /futura/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 100));
  await admin.from("recursos").delete().eq("slug_go", "prueba-mcp");

  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp newsletter", tipo: "newsletter", estado: "redaccion" } }, 74);
  const nl = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("crear_pieza newsletter: título numerado, serie Criterio y siguiente envío por defecto", /^Criterio #\d{3} — prueba mcp newsletter$/.test(nl?.titulo ?? "") && (nl?.series ?? []).includes("Criterio") && /^\d{4}-\d{2}-\d{2}$/.test(nl?.fecha_objetivo ?? "") && nl.fecha_objetivo > new Date().toISOString().slice(0, 10), `${nl?.titulo} · ${nl?.fecha_objetivo}`);
  if (nl?.id) await admin.from("piezas").delete().eq("id", nl.id);

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
