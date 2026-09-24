import "server-only";
import { createClient } from "@supabase/supabase-js";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { conCorrida, hoyMx, lunesHoy } from "./corrida";

/** go_leads · diario. Supabase «Folklore Leads» (marca nazho) → recursos.leads por slug e indicadores_semana.leads. */
export function correrGoLeads() {
  return conCorrida("go_leads", async () => {
    const url = process.env.FOLKLORE_LEADS_URL, key = process.env.FOLKLORE_LEADS_SERVICE_KEY;
    if (!url || !key) throw new Error("Faltan FOLKLORE_LEADS_URL y FOLKLORE_LEADS_SERVICE_KEY en el entorno.");
    const origen = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: leads, error } = await origen.from("leads").select("documento_slug, created_at").eq("marca", "nazho");
    if (error) throw new Error(`Folklore Leads: ${error.message}`);
    const porSlug = new Map<string, number>();
    for (const l of leads ?? []) if (l.documento_slug) porSlug.set(l.documento_slug, (porSlug.get(l.documento_slug) ?? 0) + 1);

    const admin = crearClienteAdmin();
    const { data: recursos } = await admin.from("recursos").select("id, slug_go").not("slug_go", "is", null);
    const ahora = new Date().toISOString();
    let actualizados = 0;
    for (const r of recursos ?? []) {
      const n = porSlug.get(r.slug_go!) ?? 0;
      const { error: e } = await admin.from("recursos").update({ leads: n, leads_actualizado_en: ahora, leads_fuente: "job", leads_por: null }).eq("id", r.id);
      if (!e) actualizados++;
    }
    const total = (leads ?? []).length;
    const { error: e2 } = await admin.from("indicadores_semana").upsert({ semana: lunesHoy(), leads: total, leads_corte: hoyMx(), actualizado_en: ahora }, { onConflict: "semana" });
    if (e2) throw new Error(e2.message);
    return { estado: total > 0 ? "ok" : "vacio", resumen: `${total} leads de nazho · ${actualizados} recursos actualizados`, detalle: Object.fromEntries(porSlug) };
  });
}
