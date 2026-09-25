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
  ok("sin key: initialize responde 200 (el conector puede verificar la URL)", r.status === 200 && r.json?.result?.serverInfo?.name === "ContentOS", String(r.status));
  r = await rpc(null, "tools/call", { name: "listar_comunidades", arguments: {} }, 9);
  ok("sin key: tools/call → 401", r.status === 401, String(r.status));

  r = await rpc("cos_invalida_" + "x".repeat(30), "tools/call", { name: "listar_comunidades", arguments: {} }, 91);
  ok("key inválida: tools/call → 401", r.status === 401, String(r.status));

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
  // redacción: el contenido llega de Cowork con guardar_contenido
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "redacción de prueba" } }, 50);
  const st = JSON.parse(r.json.result.content[0].text);
  r = await rpc(key, "tools/call", { name: "guardar_contenido", arguments: { pieza: st.id_publico, contenido: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer.", hipotesis: { texto: "si abro con la postura", campo: "multiplicador", numero: 3, fecha: "2026-12-31" }, autor: "yap-scripter" } }, 55);
  ok("guardar_contenido versión 1", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 1, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "guardar_contenido", arguments: { pieza: st.id_publico, contenido: "## Beats\n1. Yo creo que cobrar barato es la forma más cara de crecer. (v2 más corta)", instruccion: "más corto", autor: "yap-scripter" } }, 56);
  ok("guardar_contenido versión 2 conserva hipótesis", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text).version === 2, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_pieza", arguments: { pieza: st.id_publico, tipo: "yap", etapa_embudo: "atraer", estado: "grabacion" } }, 57);
  const fin = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("la pieza pasa a grabación con el contenido e hipótesis guardados", fin?.estado === "grabacion" && /^YAP-/.test(fin?.id_publico ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 160));
  if (st?.id) await admin.from("piezas").delete().eq("id", st.id);

  r = await rpc(key, "tools/call", { name: "listar_formatos", arguments: { con_molde: false } }, 43);
  const fcs = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  ok("listar_formatos: ≥ 7 formatos (sin el newsletter) con etiquetas, hipótesis, referencias y resumen", fcs.length >= 7 && !fcs.some((f) => f.codigo === "FC-09") && fcs.every((f) => Array.isArray(f.etiquetas) && "hipotesis" in f && typeof f.referencias === "number" && f.resumen && typeof f.resumen.episodios === "number"), fcs[0] ? `${fcs[0].codigo} · ${fcs[0].etiquetas?.join(", ")} · ${fcs[0].referencias} refs` : "");
  r = await rpc(key, "tools/call", { name: "listar_formatos", arguments: { etiqueta: "sin nazho" } }, 431);
  const sinN = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  ok("listar_formatos filtra por etiqueta (sin nazho → FC-05)", sinN.length >= 1 && sinN.every((f) => f.etiquetas.includes("sin nazho")), sinN.map((f) => f.codigo).join(","));
  r = await rpc(key, "tools/call", { name: "crear_formato", arguments: { nombre: "prueba mcp formato", etiquetas: ["grabado fuera", "Sin Nazho"], origen: "@prueba" } }, 432);
  const nf = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("crear_formato asigna código FC-NN, nace detectado y normaliza etiquetas", /^FC-\d{2,}$/.test(nf?.codigo ?? "") && nf?.estado === "detectado" && nf?.etiquetas?.includes("sin nazho"), r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "agregar_referencia", arguments: { formato: nf?.codigo ?? "FC-00", cuenta: "prueba", url: "https://www.instagram.com/reel/PRUEBAMCP/", multiplicador: 12.5, views: 340000, nota: "prueba" } }, 433);
  const ref = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("agregar_referencia guarda cuenta con @ y multiplicador", ref?.cuenta === "@prueba" && Number(ref?.multiplicador) === 12.5, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  r = await rpc(key, "tools/call", { name: "actualizar_formato", arguments: { formato: nf?.codigo ?? "FC-00", hipotesis: { texto: "prueba mcp: hipótesis de formato", campo: "multiplicador", numero: 3, fecha: "2026-12-31" } } }, 434);
  const af = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("actualizar_formato escribe la hipótesis del formato como fila resoluble", af?.hipotesis?.campo === "multiplicador" && Number(af?.hipotesis?.numero) === 3, r.json?.result?.content?.[0]?.text?.slice(0, 120));
  if (nf?.id) { await admin.from("formatos").delete().eq("id", nf.id); if (af?.hipotesis?.id) await admin.from("hipotesis").delete().eq("id", af.hipotesis.id); }

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
  ok("crear_pieza newsletter: título numerado, sin serie ni formato, siguiente envío por defecto", /^Criterio #\d{3} — prueba mcp newsletter$/.test(nl?.titulo ?? "") && (nl?.series ?? []).length === 0 && nl?.formato_id == null && /^\d{4}-\d{2}-\d{2}$/.test(nl?.fecha_objetivo ?? "") && nl.fecha_objetivo > new Date().toISOString().slice(0, 10), `${nl?.titulo} · ${nl?.fecha_objetivo} · ${JSON.stringify(nl?.series)}`);
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp derivada", tipo: "reel", madre: nl?.id_publico ?? "NEW-99" } }, 741);
  const der = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("crear_pieza con madre liga la derivada a la edición", der?.madre_id === nl?.id, r.json?.result?.content?.[0]?.text?.slice(0, 100));
  r = await rpc(key, "tools/call", { name: "leer_newsletter", arguments: {} }, 742);
  const lnl = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("leer_newsletter: CRITERIO con receta, día de envío y la edición nueva con su derivada", lnl?.nombre === "CRITERIO" && (lnl?.receta ?? "").length > 1000 && lnl?.dia_envio >= 1 && (lnl?.ediciones_en_camino ?? []).some((e) => e.id === nl?.id && e.derivadas?.length === 1), r.json?.result?.content?.[0]?.text?.slice(0, 100));
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp nl con serie", tipo: "newsletter", series: ["Postura"] } }, 743);
  ok("crear_pieza newsletter con serie → error legible", r.json?.result?.isError && /no lleva formato ni serie/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 100));
  if (der?.id) await admin.from("piezas").delete().eq("id", der.id);
  if (nl?.id) await admin.from("piezas").delete().eq("id", nl.id);

  // maquetas HTML (criterios de aceptación de la spec, sobre una pieza temporal)
  r = await rpc(key, "tools/call", { name: "crear_pieza", arguments: { titulo: "prueba mcp maqueta", tipo: "carrusel", estado: "redaccion" } }, 90);
  const pm = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  const htmlM = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>body{font-family:Outfit}</style></head><body><section>Lámina 1 · ñ · “comillas”</section><script>alert(1)</script></body></html>";
  r = await rpc(key, "tools/call", { name: "guardar_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99", html: htmlM, nota: "primera" } }, 91);
  const m1 = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("guardar_maqueta devuelve version 1 y url_app (html con <script> se guarda)", m1?.version === 1 && /\?vista=maqueta$/.test(m1?.url_app ?? ""), r.json?.result?.content?.[0]?.text?.slice(0, 120));
  const { data: fa } = await admin.from("assets").select("carpeta, version, contenido_version, nota").eq("pieza_id", pm?.id ?? "00000000-0000-0000-0000-000000000000");
  ok("fila en assets con carpeta maqueta y versión", fa?.length === 1 && fa[0].carpeta === "maqueta" && fa[0].version === 1 && fa[0].nota === "primera", JSON.stringify(fa));
  r = await rpc(key, "tools/call", { name: "guardar_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99", html: htmlM.replace("Lámina 1", "Lámina 1 v2") } }, 92);
  const m2 = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  const { data: arch } = await admin.storage.from("assets").list(`piezas/${pm?.id}/maqueta`);
  ok("segunda llamada → version 2 y la v1 sigue en el bucket", m2?.version === 2 && (arch ?? []).map((a) => a.name).sort().join(",") === "v1.html,v2.html", `${m2?.version} · ${(arch ?? []).map((a) => a.name).join(",")}`);
  r = await rpc(key, "tools/call", { name: "leer_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99", version: 1 } }, 93);
  const lm = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("leer_maqueta v1 devuelve el mismo HTML byte por byte", lm?.html === htmlM, `${lm?.html?.length} vs ${htmlM.length}`);
  r = await rpc(key, "tools/call", { name: "guardar_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99", html: "<!DOCTYPE html><html><body>" + "x".repeat(3 * 1024 * 1024) + "</body></html>" } }, 94);
  ok("maqueta de 3 MB → error de tamaño", r.json?.result?.isError && /máximo es 2 MB/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 100) ?? String(r.status));
  r = await rpc(key, "tools/call", { name: "guardar_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99", html: "<div>no es documento</div>" } }, 95);
  ok("html incompleto → «falta <html>»", r.json?.result?.isError && /falta <html>/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 100));
  r = await rpc(key, "tools/call", { name: "guardar_maqueta", arguments: { pieza: "CAR-999", html: htmlM } }, 96);
  ok("pieza inexistente → «No existe la pieza CAR-999.»", r.json?.result?.isError && /No existe la pieza CAR-999/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(key, "tools/call", { name: "listar_piezas", arguments: { tipo: "carrusel", estado: "redaccion" } }, 97);
  const lp = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  const lpM = lp.find((x) => x.id === pm?.id);
  ok("listar_piezas marca tiene_maqueta y la versión", lpM?.tiene_maqueta === true && lpM?.maqueta_version === 2 && lpM?.maqueta_desactualizada === false, JSON.stringify({ t: lpM?.tiene_maqueta, v: lpM?.maqueta_version, d: lpM?.maqueta_desactualizada }));
  r = await rpc(key, "tools/call", { name: "guardar_contenido", arguments: { pieza: pm?.id_publico ?? "CAR-99", contenido: "## Lámina 1\nCopy nuevo después de la maqueta." } }, 98);
  r = await rpc(key, "tools/call", { name: "leer_maqueta", arguments: { pieza: pm?.id_publico ?? "CAR-99" } }, 99);
  const lm2 = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("tras guardar_contenido la maqueta vigente queda desactualizada", lm2?.version === 2 && lm2?.desactualizada === true, JSON.stringify({ v: lm2?.version, d: lm2?.desactualizada, cv: lm2?.contenido_version, ca: lm2?.contenido_actual }));
  const { count: tEd } = await admin.from("tareas").select("*", { count: "exact", head: true }).eq("pieza_id", pm?.id ?? "00000000-0000-0000-0000-000000000000").eq("tipo", "editar");
  ok("subir maqueta no crea tarea editar", (tEd ?? 0) === 0, String(tEd));
  if (pm?.id) {
    await admin.storage.from("assets").remove([`piezas/${pm.id}/maqueta/v1.html`, `piezas/${pm.id}/maqueta/v2.html`]);
    await admin.from("piezas").delete().eq("id", pm.id);
  }

  // identidad: lectura por MCP y por HTTP; escritura solo owner con versión y motivo
  r = await rpc(key, "tools/call", { name: "leer_identidad", arguments: {} }, 80);
  const idn = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  ok("leer_identidad trae las 7 filas en orden con cuerpo", idn.length === 7 && idn[0]?.clave === "quien-soy" && idn[6]?.clave === "evidencia" && idn.every((f) => f.cuerpo?.length > 500 && f.version >= 1), idn.map((f) => f.clave).join(","));
  r = await rpc(key, "tools/call", { name: "leer_identidad", arguments: { clave: ["voz", "reglas"], solo_resumen: true } }, 81);
  const idn2 = r.json?.result?.isError ? [] : JSON.parse(r.json.result.content[0].text);
  ok("leer_identidad filtra por claves y solo_resumen omite el cuerpo", idn2.length === 2 && idn2.every((f) => !("cuerpo" in f) && f.resumen), idn2.map((f) => f.clave).join(","));
  r = await rpc(key, "tools/call", { name: "leer_identidad", arguments: { clave: "no-existe" } }, 82);
  ok("leer_identidad con clave inexistente → error legible con las válidas", r.json?.result?.isError && /quien-soy/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text?.slice(0, 80));
  const reglasAntes = idn.find((f) => f.clave === "reglas");
  r = await rpc(key, "tools/call", { name: "actualizar_identidad", arguments: { clave: "reglas", cuerpo: reglasAntes.cuerpo + "\n\n15. **Regla de prueba.** Se borra al terminar la prueba del MCP.", motivo: "prueba mcp: regla temporal" } }, 83);
  const idnUp = r.json?.result?.isError ? null : JSON.parse(r.json.result.content[0].text);
  ok("actualizar_identidad sube la versión y deja corrida", idnUp?.version === reglasAntes.version + 1, r.json?.result?.content?.[0]?.text?.slice(0, 100));
  const { data: ver } = await admin.from("identidad_versiones").select("version, cuerpo").eq("clave", "reglas").eq("version", reglasAntes.version).maybeSingle();
  ok("la versión anterior quedó guardada íntegra", ver?.cuerpo === reglasAntes.cuerpo, ver ? `v${ver.version}` : "no está");
  const { count: corrI } = await admin.from("corridas").select("*", { count: "exact", head: true }).eq("sistema", "actualizar_identidad").like("payload->>actor", userId);
  ok("actualizar_identidad dejó latido", (corrI ?? 0) >= 1, String(corrI));
  // restaurar sin dejar versión extra: se reponen cuerpo y versión originales y se borran las versiones de la prueba
  await admin.from("identidad").update({ cuerpo: reglasAntes.cuerpo, motivo: "prueba mcp: restaurar" }).eq("clave", "reglas");
  await admin.from("identidad_versiones").delete().eq("clave", "reglas").gte("version", reglasAntes.version);
  await admin.from("identidad").update({ version: reglasAntes.version, motivo: null }).eq("clave", "reglas");
  const { data: rest } = await admin.from("identidad").select("version, cuerpo").eq("clave", "reglas").single();
  ok("reglas restaurada a su versión original", rest.version === reglasAntes.version && rest.cuerpo === reglasAntes.cuerpo, `v${rest.version}`);

  let h = await fetch(`${BASE}/api/identidad/voz.md`, { headers: { "x-api-key": key } });
  const vozMd = await h.text();
  ok("GET /api/identidad/voz.md con x-api-key → markdown de la fila", h.status === 200 && (h.headers.get("content-type") ?? "").includes("text/markdown") && /^# Cómo escribo/.test(vozMd), `${h.status} ${vozMd.slice(0, 40)}`);
  h = await fetch(`${BASE}/api/identidad?solo_resumen=1`, { headers: { authorization: `Bearer ${key}` } });
  const idnJson = h.status === 200 ? await h.json() : null;
  ok("GET /api/identidad JSON con 7 filas sin cuerpo", idnJson?.filas?.length === 7 && !("cuerpo" in idnJson.filas[0]), String(h.status));
  h = await fetch(`${BASE}/api/identidad.md`, { headers: { authorization: `Bearer ${key}` } });
  const docMd = await h.text();
  ok("GET /api/identidad.md → documento completo con 7 secciones", h.status === 200 && (docMd.match(/^# \d\. /gm) ?? []).length === 7, `${h.status} ${docMd.length} chars`);
  h = await fetch(`${BASE}/api/identidad`);
  ok("GET /api/identidad sin key → 401 (no redirige al login)", h.status === 401, String(h.status));

  // editor por MCP no puede crear ideas (RLS vía impersonación)
  const emailE = `prueba-mcp-editor-${Date.now()}@contentos.local`;
  await admin.from("perfiles_permitidos").insert({ email: emailE, nombre: "MCP Editor", rol: "editor" });
  const { data: ue } = await admin.auth.admin.createUser({ email: emailE, password: "x-" + randomBytes(8).toString("hex"), email_confirm: true });
  const keyE = "cos_" + randomBytes(32).toString("base64url");
  await admin.from("perfiles").update({ api_key_hash: createHash("sha256").update(keyE + process.env.MCP_KEY_PEPPER).digest("hex") }).eq("user_id", ue.user.id);
  r = await rpc(keyE, "tools/call", { name: "crear_pieza", arguments: { titulo: "no debería" } }, 8);
  ok("editor por MCP: crear_pieza bloqueada (requiere owner)", r.json?.result?.isError && /owner/i.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(keyE, "tools/call", { name: "leer_identidad", arguments: { clave: "voz" } }, 84);
  ok("editor por MCP: leer_identidad sí puede", !r.json?.result?.isError && JSON.parse(r.json.result.content[0].text)[0]?.clave === "voz", r.json?.result?.content?.[0]?.text?.slice(0, 60));
  r = await rpc(keyE, "tools/call", { name: "guardar_maqueta", arguments: { pieza: "CAR-04", html: "<!DOCTYPE html><html><body>x</body></html>" } }, 87);
  ok("editor por MCP: guardar_maqueta → error de rol", r.json?.result?.isError && /Solo el owner puede guardar maquetas/.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(keyE, "tools/call", { name: "actualizar_newsletter", arguments: { dia_envio: 2 } }, 86);
  ok("editor por MCP: actualizar_newsletter → «requiere rol owner»", r.json?.result?.isError && /requiere rol owner/i.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
  r = await rpc(keyE, "tools/call", { name: "actualizar_identidad", arguments: { clave: "voz", cuerpo: "x".repeat(100), motivo: "no debería poder" } }, 85);
  ok("editor por MCP: actualizar_identidad → «requiere rol owner»", r.json?.result?.isError && /requiere rol owner/i.test(r.json.result.content[0].text), r.json?.result?.content?.[0]?.text);
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
