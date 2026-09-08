// Prueba de extremo a extremo contra el dev server: crea una editora temporal
// (lista blanca + auth con contraseña), entra, recorre las pantallas y la borra.
// Uso: node --env-file=.env.local scripts/prueba-e2e.mjs [http://localhost:3017]
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3017";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = new URL(URL_).hostname.split(".")[0];
const email = `prueba-editora-${Date.now()}@contentos.local`;
const password = "Prueba-" + Math.random().toString(36).slice(2) + "!";

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const resultados = [];
const ok = (nombre, cond, detalle = "") => resultados.push({ nombre, ok: !!cond, detalle });

let userId, ownerId, ownerEmail;
function semanaISO() {
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const d = (hoy.getDay() + 6) % 7; hoy.setDate(hoy.getDate() - d);
  return hoy.toISOString().slice(0, 10);
}
try {
  const { error: e1 } = await admin.from("perfiles_permitidos").insert({ email, nombre: "Editora Prueba", rol: "editor" });
  ok("alta en lista blanca", !e1, e1?.message);

  const { data: u, error: e2 } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  ok("crear usuario auth (trigger de perfil)", !e2 && u?.user?.id, e2?.message);
  userId = u?.user?.id;

  const { data: perfil } = await admin.from("perfiles").select("rol").eq("user_id", userId).maybeSingle();
  ok("perfil editor creado por trigger", perfil?.rol === "editor", JSON.stringify(perfil));

  // Asignar a la editora las tareas demo para que aparezcan en su cola
  await admin.from("tareas").update({ asignado_a: userId }).is("asignado_a", null);

  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s, error: e3 } = await anon.auth.signInWithPassword({ email, password });
  ok("login con contraseña", !e3 && s?.session, e3?.message);

  // Cookie en el formato de @supabase/ssr: base64-<base64url(JSON sesión)>
  const json = JSON.stringify(s.session);
  const b64 = Buffer.from(json).toString("base64url");
  const cookie = `sb-${ref}-auth-token=base64-${b64}`;

  async function get(path) {
    const r = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
    const html = (await r.text()).replace(/<!-- -->/g, "");
    return { status: r.status, location: r.headers.get("location"), html };
  }

  let r = await get("/");
  ok("/ redirige a /cola (editor)", r.status === 307 && r.location?.endsWith("/cola"), `${r.status} ${r.location}`);

  r = await get("/cola");
  ok("/cola 200", r.status === 200, String(r.status));
  ok("/cola muestra «Tu día» sin bitácora", r.html.includes("Tu día") && r.html.includes("Todavía no declaras"), "");
  {
    const { data: pz } = await admin.from("piezas").select("id").eq("id_publico", "DEMO-02").single();
    const conEd = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${s.session.access_token}` } }, auth: { persistSession: false } });
    const { error: eb } = await conEd.from("bitacora").insert({ perfil_id: userId, texto: "diseñé 3 slides del carrusel (prueba e2e)", pieza_id: pz.id, minutos: 90 });
    ok("editora declara en bitácora (RLS propia)", !eb, eb?.message);
    const { error: eb2 } = await conEd.from("bitacora").insert({ perfil_id: "00000000-0000-4000-8000-0000000000aa", texto: "suplantación" });
    ok("editora no declara por otra persona", !!eb2, eb2?.message);
    r = await get("/cola");
    ok("/cola muestra la entrada declarada", r.html.includes("diseñé 3 slides") && !r.html.includes("Todavía no declaras"), "");
  }
  ok("/cola muestra DEMO-01 y semáforo", r.html.includes("DEMO-01") && r.html.includes("buffer 1"), "");
  ok("/cola agrupa Hoy con 1", /Hoy.*?·\s*1/s.test(r.html), "");

  const { data: pieza } = await admin.from("piezas").select("id").eq("id_publico", "DEMO-01").single();
  r = await get(`/piezas/${pieza.id}`);
  ok("/piezas/[id] 200", r.status === 200, String(r.status));
  ok("detalle muestra hipótesis, guion y botón Publicada", r.html.includes("Hipótesis") && r.html.includes("La afirmación") && r.html.includes("Publicada"), "");
  ok("detalle propone «Pasar a Programada» desde buffer", r.html.includes("Pasar a Programada"), "");

  const { data: p3 } = await admin.from("piezas").select("id").eq("id_publico", "DEMO-03").single();
  r = await get(`/piezas/${p3.id}`);
  ok("para_grabar explica por qué no se publica", r.html.includes("Falta grabar y editar"), "");

  r = await get("/historias");
  ok("/historias 200 con 4 historias", r.status === 200 && r.html.includes("4 historias"), String(r.status));
  ok("historias muestra keyword RORY y amplifica DEMO-01", r.html.includes("RORY") && r.html.includes("amplifica DEMO-01"), "");

  r = await get("/piezas");
  ok("/piezas lista solo lo visible al editor (3 demo)", r.status === 200 && r.html.includes("DEMO-02") && !r.html.includes("en producción"), "");

  r = await get("/tablero");
  ok("/tablero prohibido para editor → redirige", r.status === 307 && r.location?.endsWith("/cola"), `${r.status} ${r.location}`);

  r = await get("/ideas");
  ok("/ideas prohibido para editor → redirige", r.status === 307, `${r.status}`);

  // Acción real vía PostgREST con la sesión de la editora: publicar DEMO-01 debe fallar sin URL válida
  const conSesion = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${s.session.access_token}` } }, auth: { persistSession: false } });
  const { error: e4 } = await conSesion.rpc("marcar_publicada", { p_pieza_id: pieza.id, p_url: "sin-protocolo", p_plataforma: "instagram" });
  ok("marcar_publicada rechaza URL mala como editora", /http\(s\)/.test(e4?.message ?? ""), e4?.message);
  const { error: e5 } = await conSesion.from("ideas").insert({ comunidad_id: "11111111-0000-4000-8000-000000000001", titulo: "x" });
  ok("editora no puede insertar ideas (RLS)", !!e5, e5?.message);

  // ===== Owner temporal: las vistas del Nodo =====
  const emailOwner = `prueba-owner-${Date.now()}@contentos.local`;
  await admin.from("perfiles_permitidos").insert({ email: emailOwner, nombre: "Owner Prueba", rol: "owner" });
  const { data: uo, error: eo } = await admin.auth.admin.createUser({ email: emailOwner, password, email_confirm: true });
  ok("crear owner temporal", !eo && uo?.user?.id, eo?.message);
  ownerId = uo?.user?.id; ownerEmail = emailOwner;
  const { data: so } = await anon.auth.signInWithPassword({ email: emailOwner, password });
  const cookieOwner = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(so.session)).toString("base64url")}`;
  async function getO(path) {
    const r = await fetch(BASE + path, { headers: { cookie: cookieOwner }, redirect: "manual" });
    return { status: r.status, location: r.headers.get("location"), html: (await r.text()).replace(/<!-- -->/g, "") };
  }
  r = await getO("/");
  ok("owner / → /inicio", r.status === 307 && r.location?.endsWith("/inicio"), `${r.status} ${r.location}`);
  r = await getO("/inicio");
  ok("/inicio 200 con captura, semana y máquina", r.status === 200 && r.html.includes("Nueva idea") && r.html.includes("La semana") && r.html.includes("La máquina") && r.html.includes("Te toca grabar"), String(r.status));
  ok("/inicio muestra huecos y cuota", r.html.includes("Hueco") && /\/10 publicadas/.test(r.html), "");
  r = await getO("/equipo");
  ok("/equipo 200 con la bitácora de la editora", r.status === 200 && r.html.includes("Editora Prueba") && r.html.includes("diseñé 3 slides") && r.html.includes("Lo que la plataforma registró"), String(r.status));
  await admin.from("bitacora").delete().eq("perfil_id", userId);
  r = await getO("/sistemas");
  ok("/sistemas 200 con nodos y latidos", r.status === 200 && r.html.includes("Máquina semanal") && r.html.includes("Post-scraper de grilla") && r.html.includes("Latidos"), String(r.status));
  r = await getO("/sistemas?sistema=pauta_pixel");
  ok("/sistemas cambia de sistema", r.status === 200 && r.html.includes("Campaña fría"), String(r.status));
  r = await getO("/formatos");
  ok("/formatos 200 con las 6 cards", r.status === 200 && r.html.includes("FC-01") && r.html.includes("FC-08"), String(r.status));
  r = await getO("/piezas?estado=idea");
  ok("/piezas filtra ideas (IDE-)", r.status === 200 && r.html.includes("IDE-01"), String(r.status));
  for (const viejo of ["/hoy", "/semana", "/maquina", "/embudo", "/ideas", "/tablero", "/piezas/nueva"]) {
    r = await getO(viejo);
    ok(`${viejo} ya no existe (404)`, r.status === 404, String(r.status));
  }
  r = await getO("/piezas");
  ok("/piezas owner ve tope, captura y filtros", r.status === 200 && r.html.includes("en producción") && r.html.includes("Nueva idea") && r.html.includes("Idea ·"), "");
  // acciones reales como owner: crear pieza sin fecha → error; declarar hueco → ok
  const conOwner = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${so.session.access_token}` } }, auth: { persistSession: false } });
  const { error: e6 } = await conOwner.rpc("crear_pieza_validada", { payload: { titulo: "prueba e2e", estado: "para_grabar", formato: "reel", etapa_embudo: "atraer", hipotesis: { texto: "x", campo: "views", numero: 1 } } });
  ok("owner: para_grabar sin fecha → «falta hipotesis.fecha»", e6?.message?.includes("falta hipotesis.fecha"), e6?.message);
  const { data: idea, error: e6b } = await conOwner.rpc("crear_pieza_validada", { payload: { titulo: "idea de prueba e2e" } });
  ok("owner: idea con solo título → IDE-nn", !e6b && idea?.estado === "idea" && /^IDE-\d+$/.test(idea?.id_publico ?? ""), e6b?.message ?? idea?.id_publico);
  const { error: e6c } = await conOwner.rpc("cambiar_estado_pieza", { p_pieza_id: idea.id, p_nuevo_estado: "para_producir" });
  ok("owner: idea → para_producir sin formato → mensaje legible", /formato/.test(e6c?.message ?? ""), e6c?.message);
  const { data: conF } = await conOwner.from("piezas").update({ formato: "reel" }).eq("id", idea.id).select("id_publico").single();
  ok("al dar formato, el ID pasa de IDE- a REE-", /^REE-\d+$/.test(conF?.id_publico ?? ""), conF?.id_publico);
  await admin.from("piezas").delete().eq("id", idea.id);
  const { data: hk, error: e7 } = await conOwner.rpc("declarar_hueco", { p_semana: semanaISO(), p_sistema: "maquina_semanal", p_nodo: "review", p_nota: "prueba e2e" });
  ok("owner: declarar_hueco ok", !e7 && hk?.nota === "prueba e2e", e7?.message);
  const { data: en } = await conOwner.rpc("estado_nodos", { p_clave: "maquina_semanal", p_semana: semanaISO() });
  ok("estado_nodos refleja el hueco", en?.find((x) => x.nodo_clave === "review")?.estado === "hueco", JSON.stringify(en?.find((x) => x.nodo_clave === "review")));
  await admin.from("huecos").delete().eq("nota", "prueba e2e");
} finally {
  if (ownerId) await admin.auth.admin.deleteUser(ownerId);
  if (ownerEmail) await admin.from("perfiles_permitidos").delete().eq("email", ownerEmail);
  await admin.from("tareas").update({ asignado_a: null }).eq("asignado_a", userId ?? "00000000-0000-0000-0000-000000000000");
  if (userId) await admin.auth.admin.deleteUser(userId);
  await admin.from("perfiles_permitidos").delete().eq("email", email);
  const { count } = await admin.from("perfiles").select("*", { count: "exact", head: true }).eq("email", email);
  ok("limpieza: usuario y perfil borrados", count === 0, String(count));
}

let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log(`${r.ok ? "✅" : "❌"} ${r.nombre}${r.detalle ? " — " + r.detalle : ""}`);
}
console.log(`\n${resultados.length - fallos}/${resultados.length} en verde`);
process.exit(fallos ? 1 : 0);
