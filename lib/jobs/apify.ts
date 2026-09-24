import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { conCorrida, hoyMx, lunesHoy } from "./corrida";

/** Corre un actor de Apify de forma síncrona y devuelve los items del dataset. */
async function correrActor<T>(actor: string, input: Record<string, unknown>, timeoutS = 240): Promise<T[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Falta APIFY_TOKEN en el entorno.");
  const r = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutS}&format=json&clean=true`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), cache: "no-store",
  });
  if (!r.ok) throw new Error(`Apify ${actor} respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T[];
}

type Perfil = { username?: string; followersCount?: number; followsCount?: number; postsCount?: number };
type Post = { url?: string; shortCode?: string; videoPlayCount?: number; videoViewCount?: number; likesCount?: number; commentsCount?: number; timestamp?: string; type?: string };

/** snapshot_seguidores · diario. Perfil @nazho → indicadores_semana.seguidores con fecha de corte. */
export function correrSnapshotSeguidores(handle = "nazho") {
  return conCorrida("snapshot_seguidores", async () => {
    const items = await correrActor<Perfil>("apify~instagram-profile-scraper", { usernames: [handle] }, 120);
    const p = items.find((x) => (x.username ?? "").toLowerCase() === handle) ?? items[0];
    if (!p || typeof p.followersCount !== "number") throw new Error(`Apify no devolvió seguidores de @${handle}.`);
    const admin = crearClienteAdmin();
    const hoy = hoyMx();
    const { error } = await admin.from("indicadores_semana").upsert({ semana: lunesHoy(), seguidores: p.followersCount, seguidores_corte: hoy, actualizado_en: new Date().toISOString() }, { onConflict: "semana" });
    if (error) throw new Error(error.message);
    return { estado: "ok", resumen: `@${handle}: ${p.followersCount.toLocaleString("es-MX")} seguidores al ${hoy}`, detalle: { seguidores: p.followersCount, posts: p.postsCount ?? null } };
  });
}

const codigoDe = (url: string) => /instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/.exec(url)?.[1] ?? null;

/** post_scraper_grilla · diario. Piezas publicadas con URL de los últimos 60 días → metricas(fuente apify) → recalcular multiplicadores. */
export function correrPostScraper() {
  return conCorrida("post_scraper_grilla", async () => {
    const admin = crearClienteAdmin();
    const desde = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data: piezas } = await admin.from("piezas").select("id, id_publico, url, publicada_en").eq("estado", "publicada").not("url", "is", null).gte("publicada_en", desde).order("publicada_en", { ascending: false }).limit(50);
    const objetivo = (piezas ?? []).filter((p) => p.url && codigoDe(p.url));
    if (objetivo.length === 0) return { estado: "vacio", resumen: "sin piezas publicadas con liga de Instagram en los últimos 60 días" };
    const items = await correrActor<Post>("apify~instagram-scraper", { directUrls: objetivo.map((p) => p.url), resultsType: "posts", resultsLimit: 1, addParentData: false }, 240);
    const porCodigo = new Map(items.map((it) => [it.shortCode ?? (it.url ? codigoDe(it.url) : null), it]));
    const fecha = hoyMx();
    let guardadas = 0;
    const faltantes: string[] = [];
    for (const p of objetivo) {
      const it = porCodigo.get(codigoDe(p.url!));
      if (!it) { faltantes.push(p.id_publico ?? p.id); continue; }
      const views = it.videoPlayCount ?? it.videoViewCount ?? null;
      const likes = it.likesCount != null && it.likesCount >= 0 ? it.likesCount : null;
      const { error } = await admin.from("metricas").upsert({ pieza_id: p.id, fecha, fuente: "apify", views, likes, comentarios: it.commentsCount ?? null }, { onConflict: "pieza_id,fecha,fuente" });
      if (!error) guardadas++;
    }
    const { data: recalc } = await admin.rpc("recalcular_multiplicadores");
    return { estado: guardadas > 0 ? "ok" : "vacio", resumen: `${guardadas} de ${objetivo.length} piezas con métricas · ${recalc ?? 0} multiplicadores recalculados`, detalle: { faltantes } };
  });
}
