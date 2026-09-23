// Saca las referencias de la sección «Evidencia» del molde de cada formato y las guarda en la tabla `referencias`.
// Idempotente: no repite una URL ya cargada para el mismo formato.
// Uso: node --env-file=.env.local scripts/importar-referencias.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: formatos } = await admin.from("formatos").select("id, codigo, molde");
const { data: existentes } = await admin.from("referencias").select("formato_id, url");
const ya = new Set((existentes ?? []).map((r) => `${r.formato_id}|${r.url}`));

const numero = (s) => {
  if (!s) return null;
  const m = /([\d.,]+)\s*([KkMm])?/.exec(s);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (/k/i.test(m[2] ?? "")) n *= 1e3;
  if (/m/i.test(m[2] ?? "")) n *= 1e6;
  return Math.round(n);
};

const filas = [];
for (const f of formatos ?? []) {
  const lineas = (f.molde ?? "").split("\n");
  let enEvidencia = false;
  for (const l of lineas) {
    if (/^##\s/.test(l)) { enEvidencia = /^##\s+Evidencia/i.test(l); continue; }
    if (!enEvidencia || !/^-\s+@/.test(l)) continue;
    const cuenta = /^-\s+(@[\w.]+)/.exec(l)?.[1] ?? null;
    const url = /(https?:\/\/\S+)/.exec(l)?.[1]?.replace(/[)\s,.]+$/, "") ?? null;
    if (!url) continue;
    const mult = /(?:\*\*|≈)\s*([\d.]+)x/.exec(l)?.[1] ?? /([\d.]+)x/.exec(l)?.[1] ?? null;
    const views = /([\d.,]+\s*[KM]?)\s*(?:views|plays)/i.exec(l)?.[1] ?? /\*\*[\d.]+x\*\*,\s*([\d.,]+\s*[KM]?)/.exec(l)?.[1] ?? null;
    const dur = /(\d+(?:\.\d+)?)\s*s\b/.exec(l)?.[1] ?? null;
    const titulo = /[“"]([^”"]+)[”"]/.exec(l)?.[1] ?? null;
    const nota = [titulo, /\((.*?)\)\s*$/.exec(l)?.[1]].filter(Boolean).join(" · ") || null;
    if (ya.has(`${f.id}|${url}`)) continue;
    filas.push({ formato_id: f.id, cuenta, url, multiplicador: mult ? Number(mult) : null, views: numero(views), duracion_s: dur ? Math.round(Number(dur)) : null, nota });
  }
}
if (filas.length) {
  const { error } = await admin.from("referencias").insert(filas);
  if (error) { console.error(error.message); process.exit(1); }
}
const porFormato = {};
for (const r of filas) { const c = (formatos ?? []).find((f) => f.id === r.formato_id)?.codigo; porFormato[c] = (porFormato[c] ?? 0) + 1; }
console.log(`${filas.length} referencias nuevas`, porFormato);
for (const r of filas.slice(0, 6)) console.log(" ", r.cuenta, r.multiplicador ?? "—", "x ·", r.views ?? "—", "views ·", (r.nota ?? "").slice(0, 50));
