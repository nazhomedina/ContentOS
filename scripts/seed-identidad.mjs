// Carga las siete filas de la identidad desde docs/identidad/*.md a la tabla `identidad`.
// Idempotente: si el cuerpo no cambió, no toca la fila; si cambió, el trigger guarda la versión anterior y sube `version`.
// Uso: node --env-file=.env.local scripts/seed-identidad.mjs [--motivo "por qué"]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const motivo = process.argv.includes("--motivo") ? process.argv[process.argv.indexOf("--motivo") + 1] : "seed desde docs/identidad";

const { data: owner } = await admin.from("perfiles").select("user_id").eq("rol", "owner").limit(1).maybeSingle();
if (!owner) throw new Error("No hay perfil owner: la identidad es de Nazho.");

const carpeta = join(process.cwd(), "docs", "identidad");
const archivos = (await readdir(carpeta)).filter((a) => /^\d{2}-.+\.md$/.test(a)).sort();

function parsear(texto) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texto);
  if (!m) throw new Error("Sin frontmatter");
  const meta = {};
  for (const linea of m[1].split("\n")) {
    const [k, ...resto] = linea.split(":");
    let v = resto.join(":").trim();
    if (/^".*"$/.test(v)) v = JSON.parse(v);
    meta[k.trim()] = v;
  }
  return { ...meta, orden: Number(meta.orden), cuerpo: m[2].trim() };
}

const { data: actuales } = await admin.from("identidad").select("clave, version, titulo, resumen, cuerpo");
const previas = new Map((actuales ?? []).map((f) => [f.clave, f]));

let nuevas = 0, cambiadas = 0, iguales = 0;
for (const archivo of archivos) {
  const fila = parsear(await readFile(join(carpeta, archivo), "utf8"));
  for (const campo of ["clave", "titulo", "resumen", "cuerpo"]) if (!fila[campo]) throw new Error(`${archivo}: falta ${campo}`);
  const previa = previas.get(fila.clave);
  if (previa && previa.cuerpo === fila.cuerpo && previa.resumen === fila.resumen && previa.titulo === fila.titulo) {
    await admin.from("identidad").update({ orden: fila.orden }).eq("clave", fila.clave);
    iguales++;
    continue;
  }
  const { error } = await admin.from("identidad").upsert({
    clave: fila.clave, orden: fila.orden, titulo: fila.titulo, resumen: fila.resumen, cuerpo: fila.cuerpo,
    actualizado_por: owner.user_id, motivo: previa ? motivo : "import inicial v1.0", vigente: true,
  }, { onConflict: "clave" });
  if (error) throw new Error(`${fila.clave}: ${error.message}`);
  previa ? cambiadas++ : nuevas++;
}

const { data: resumen } = await admin.from("identidad").select("orden, clave, version").order("orden");
const palabras = (t) => t.split(/\s+/).filter(Boolean).length;
console.log(`identidad: ${nuevas} nuevas · ${cambiadas} cambiadas · ${iguales} iguales`);
for (const f of resumen ?? []) {
  const a = archivos.find((x) => x.includes(`-${f.clave}.md`));
  const cuerpo = a ? parsear(await readFile(join(carpeta, a), "utf8")).cuerpo : "";
  console.log(`  ${f.orden}. ${f.clave} v${f.version} · ${palabras(cuerpo)} palabras`);
}
