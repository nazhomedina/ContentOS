import "server-only";
import { correrKitSuscriptores } from "./kit";
import { correrGoLeads } from "./leads";
import { correrPostScraper, correrSnapshotSeguidores } from "./apify";
import type { ResultadoJob } from "./corrida";

/** Los jobs que corren en la app (Vercel Cron o «Correr ahora»). recalcular_multiplicadores vive en pg_cron. */
export const JOBS: Record<string, { nombre: string; correr: () => Promise<ResultadoJob>; necesita: string[] }> = {
  kit_suscriptores: { nombre: "Suscriptores de Kit", correr: correrKitSuscriptores, necesita: ["KIT_API_KEY"] },
  go_leads: { nombre: "Leads de go.folklore", correr: correrGoLeads, necesita: ["FOLKLORE_LEADS_URL", "FOLKLORE_LEADS_SERVICE_KEY"] },
  snapshot_seguidores: { nombre: "Seguidores de @nazho", correr: () => correrSnapshotSeguidores("nazho"), necesita: ["APIFY_TOKEN"] },
  post_scraper_grilla: { nombre: "Métricas de piezas publicadas", correr: correrPostScraper, necesita: ["APIFY_TOKEN"] },
};
export function jobListo(clave: string): boolean {
  return (JOBS[clave]?.necesita ?? []).every((v) => Boolean(process.env[v]));
}
