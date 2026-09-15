// Import de reels desde Notion (Microcontenidos, formato Reel/Short) a `piezas`.
// Lee los JSON que extrajeron los agentes desde Notion y los carga con service_role.
// Idempotente por `notion_url`: una segunda corrida no duplica. Notion queda intacto.
//
// Uso: node --env-file=.env.local scripts/importar-reels.mjs <carpeta con reels-*.json> [--aplicar]
// Sin --aplicar solo imprime el plan (conteos por estado) y no escribe nada.
//
// Reglas (HANDOFF §6 con los estados de la migración 009):
//   Para grabar → grabacion (programa_aprobado) · Diseño o edición → diseno · Buffer → listo
//   En trial → en_trial · Publicada con URL → publicada · Publicada sin URL → archivada (la base exige URL)
//   Archivado → archivada
//   Hipótesis de Notion es texto libre: se guarda como {texto, campo: multiplicador, legado: true}.
//   Sin texto de hipótesis en producción → requiere_hipotesis = true (la app la pinta en rojo).
//   Views/likes/comentarios/saves/follows → metricas(fuente='notion').

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const carpeta = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
if (!carpeta) { console.error("Uso: scripts/importar-reels.mjs <carpeta> [--aplicar]"); process.exit(1); }

const COMUNIDAD = "11111111-0000-4000-8000-000000000001";
const FC_POR_NOTION = {
  "3a53bf4213a68107b765c0bba847a643": "FC-01",
  "3a53bf4213a681608f3dd8017a5d5147": "FC-02",
  "3a53bf4213a6815ca27fdbeceba78cae": "FC-03",
  "3a53bf4213a681e5a1aeddb566ffa4b9": "FC-04",
  "3a93bf4213a681a08eb2ec5004193466": "FC-05",
  "3b23bf4213a6810496aad830d11ced49": "FC-08",
};
const SERIE_POR_PREFIJO = {
  CRI: "Criterio", NUM: "NUM", FC01: "Brand Reels", FC02: "Róbate", FC03: "Robándole el marketing",
  FC04: "Verdades Incómodas", FC05: "Checklist relámpago", YAP: "Yap", FUN: "Serie Fundador", CLA: "Así uso Claude", SEA: "Seang",
};
// El check de piezas.id_publico es ^[A-Z]{2,5}-\d{2,3}([a-z]|-[A-E])?$: los prefijos FC01…FC05 de Notion
// llevan dígitos y no pasan, así que se traducen a letras. El ID original queda en notas.
const PREFIJO_ID = { FC01: "BRE", FC02: "ROB", FC03: "RMK", FC04: "VIN", FC05: "CHK" };
const ID_VALIDO = /^[A-Z]{2,5}-\d{2,3}([a-z]|-[A-E])?$/;
function idPublico(id) {
  const t = (id ?? "").trim();
  if (!t) return { id: undefined, nota: null };
  const [pre, ...resto] = t.split("-");
  const trad = PREFIJO_ID[pre] ? [PREFIJO_ID[pre], ...resto].join("-") : t;
  if (ID_VALIDO.test(trad)) return { id: trad, nota: trad !== t ? `ID en Notion: ${t}` : null };
  return { id: undefined, nota: `ID en Notion: ${t}` };
}
const ESTADO = { "Para grabar": "grabacion", "Diseño o edición": "diseno", "Buffer": "listo", "En trial": "en_trial", "Publicada": "publicada", "Archivado": "archivada", "Para producir": "redaccion" };

const filas = readdirSync(carpeta).filter((f) => /^reels-.*\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(join(carpeta, f), "utf8")));
const porUrl = new Map();
for (const r of filas) if (r.url && !porUrl.has(r.url)) porUrl.set(r.url, r);
const reels = [...porUrl.values()];
console.log(`${reels.length} reels en ${carpeta}`);

const lista = (s) => { try { const v = JSON.parse(s ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
// El cuerpo de Notion trae marcas vacías (<empty-block/>) y saltos de más: se limpian sin tocar el texto.
const limpiarGuion = (g) => {
  if (!g) return null;
  const t = g.replace(/<empty-block\s*\/>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return t || null;
};
const idNotion = (u) => (u ?? "").replace(/-/g, "").match(/([0-9a-f]{32})/)?.[1] ?? null;

function mapear(r) {
  const fc = lista(r.fc).map((u) => FC_POR_NOTION[idNotion(u)]).find(Boolean) ?? null;
  const prefijo = (r.id ?? "").split(/[-\s]/)[0];
  const formato = fc === "FC-08" || prefijo === "YAP" ? "yap" : "reel";
  let estado = ESTADO[r.status] ?? "archivada";
  const notas = [];
  if (estado === "publicada" && !r.url_publica) {
    estado = "archivada";
    notas.push(`Publicada según Notion${r.publicacion ? ` el ${r.publicacion}` : ""}, sin URL. Con la URL puede volver a Publicados.`);
  }
  if (r.variante) notas.push(`Variante: ${r.variante}`);
  if (r.padre) notas.push(`Frente de una arena de hooks (pieza madre en Notion: ${lista(r.padre)[0] ?? r.padre}).`);
  if (r.batch) notas.push(`Batch Notion: ${r.batch}.`);
  if (r.veredicto) notas.push(`Veredicto del trial en Notion: ${r.veredicto}.`);
  if (r.raw) notas.push(`RAW en Drive: ${r.raw}`);
  if (lista(r.marca).includes("Folklore")) notas.push("Marca: Folklore y Nazho.");
  const idp = idPublico(r.id);
  if (idp.nota) notas.push(idp.nota);
  const texto = (r.hipotesis ?? "").trim() || null;
  const enProduccion = !["archivada", "borrador"].includes(estado);
  return {
    comunidad_id: COMUNIDAD,
    id_publico: idp.id,
    titulo: (r.nombre ?? "").trim() || "(sin título)",
    formato,
    estado,
    etapa_embudo: "atraer",
    etapa_legado: true,
    hipotesis: { texto, campo: "multiplicador", numero: null, fecha: null, legado: true },
    requiere_hipotesis: enProduccion && !texto,
    programa_aprobado: estado === "grabacion",
    format_card: fc,
    serie: SERIE_POR_PREFIJO[prefijo] ?? null,
    guion: limpiarGuion(r.guion),
    url: r.url_publica ?? null,
    plataforma: r.url_publica ? (r.url_publica.includes("youtu") ? "youtube" : "instagram") : null,
    publicada_en: estado === "publicada" ? (r.publicacion ? `${r.publicacion}T12:00:00-06:00` : new Date().toISOString()) : null,
    origen: "legado",
    notas: notas.length ? notas.join("\n") : null,
    notion_url: r.url,
    created_at: r.creado ? new Date(r.creado.replace(" ", "T")).toISOString() : undefined,
    metrica: r.views != null || r.likes != null || r.saves != null || r.follows != null
      ? { fecha: r.publicacion ?? ((r.creado ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10)), views: r.views, likes: r.likes, comentarios: r.comentarios, saves: r.saves, follows: r.follows, multiplicador: r.multiplicador }
      : null,
  };
}

const piezas = reels.map(mapear);
const conteo = {};
for (const p of piezas) conteo[p.estado] = (conteo[p.estado] ?? 0) + 1;
console.log("Plan por estado:", conteo);
console.log("Con guion:", piezas.filter((p) => p.guion).length, "· con hipótesis:", piezas.filter((p) => p.hipotesis.texto).length, "· requieren hipótesis:", piezas.filter((p) => p.requiere_hipotesis).length, "· con métricas:", piezas.filter((p) => p.metrica).length);
if (!aplicar) { console.log("Sin --aplicar no se escribe nada."); process.exit(0); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: fcs } = await admin.from("format_cards").select("id, codigo");
const fcId = Object.fromEntries((fcs ?? []).map((f) => [f.codigo, f.id]));
const { data: existentes } = await admin.from("piezas").select("id, notion_url").not("notion_url", "is", null);
const yaImportadas = new Set((existentes ?? []).map((e) => e.notion_url));

let insertadas = 0, saltadas = 0, metricas = 0;
const errores = [], renumeradas = [];
for (const p of piezas) {
  if (yaImportadas.has(p.notion_url)) { saltadas++; continue; }
  const { metrica, format_card, ...fila } = p;
  const insertar = (f) => admin.from("piezas").insert({ ...f, format_card_id: format_card ? fcId[format_card] ?? null : null }).select("id, id_publico").single();
  let { data, error } = await insertar(fila);
  // IDs repetidos en Notion (NUM-08…11): la segunda ocurrencia se renumera con «b» (HANDOFF §6).
  if (error && /piezas_id_publico_key/.test(error.message) && fila.id_publico) {
    const nuevo = `${fila.id_publico}b`;
    ({ data, error } = await insertar({ ...fila, id_publico: nuevo, notas: [fila.notas, `ID repetido en Notion: ${fila.id_publico} → ${nuevo}`].filter(Boolean).join("\n") }));
    if (!error) renumeradas.push(`${fila.id_publico} → ${nuevo}`);
  }
  if (error) { errores.push(`${p.id_publico ?? p.titulo}: ${error.message}`); continue; }
  insertadas++;
  if (metrica) {
    const { error: em } = await admin.from("metricas").insert({ pieza_id: data.id, fuente: "notion", ...metrica });
    if (em) errores.push(`métrica ${data.id_publico}: ${em.message}`); else metricas++;
  }
}
await admin.rpc("registrar_corrida", {
  p_sistema: "import_notion", p_estado: errores.length ? "error" : "ok",
  p_resumen: `reels: ${insertadas} insertadas, ${saltadas} ya existían, ${metricas} métricas, ${errores.length} errores`,
  p_payload: { fuente: "Microcontenidos · Reel/Short", conteo, errores, renumeradas },
});
console.log(`Insertadas ${insertadas} · ya existían ${saltadas} · métricas ${metricas} · errores ${errores.length}`);
for (const r of renumeradas) console.log("  ↻", r);
for (const e of errores) console.log("  ✗", e);
