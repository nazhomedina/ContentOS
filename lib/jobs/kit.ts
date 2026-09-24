import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { conCorrida, hoyMx, lunesHoy } from "./corrida";

/** kit_suscriptores · diario. Kit v4 growth_stats → indicadores_semana.suscriptores con fecha de corte. */
export function correrKitSuscriptores() {
  return conCorrida("kit_suscriptores", async () => {
    const key = process.env.KIT_API_KEY;
    if (!key) throw new Error("Falta KIT_API_KEY en el entorno.");
    const r = await fetch("https://api.kit.com/v4/account/growth_stats", { headers: { "X-Kit-Api-Key": key, accept: "application/json" }, cache: "no-store" });
    if (!r.ok) throw new Error(`Kit respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { stats?: { subscribers?: number; net_new_subscribers?: number; new_subscribers?: number; cancellations?: number } };
    const total = j.stats?.subscribers;
    if (typeof total !== "number") throw new Error("Kit no devolvió el total de suscriptores.");
    const admin = crearClienteAdmin();
    const semana = lunesHoy(), hoy = hoyMx();
    const { error } = await admin.from("indicadores_semana").upsert({ semana, suscriptores: total, suscriptores_corte: hoy, actualizado_en: new Date().toISOString() }, { onConflict: "semana" });
    if (error) throw new Error(error.message);
    return { estado: "ok", resumen: `${total} suscriptores al ${hoy}`, detalle: { total, nuevos: j.stats?.new_subscribers ?? null, bajas: j.stats?.cancellations ?? null } };
  });
}
