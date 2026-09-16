import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ListaRecursos, type HistoriaLigada, type RecursoFila } from "@/components/recursos/lista-recursos";
import { ORDEN_ESTADO_RECURSO, type EstadoRecurso } from "@/lib/dominio/recursos";

export const metadata = { title: "Lead magnets" };
export const dynamic = "force-dynamic";

/**
 * Los lead magnets: lo que se regala a cambio del DM. Cada uno con su keyword, su liga en go.folklore.mx,
 * su tag de Kit, los leads (a mano hasta que corra go_leads) y las historias que lo han empujado.
 */
export default async function Recursos() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, nombre, slug_go, keyword, kit_tag_id, estado, tipo, descripcion, leads, leads_actualizado_en, leads_fuente, anoto:perfiles(nombre)")
    .order("created_at");
  const ids = (recursos ?? []).map((r) => r.id);
  const { data: historias } = ids.length
    ? await supabase.from("historias").select("id, recurso_id, semana, dia, serie, estado, views, replies, dms").in("recurso_id", ids).neq("estado", "descartada").order("semana", { ascending: false }).order("dia")
    : { data: [] as { id: string; recurso_id: string | null; semana: string; dia: number; serie: string; estado: string; views: number | null; replies: number | null; dms: number | null }[] };
  const resumenes = new Map<string, RecursoFila["resumen"]>();
  await Promise.all(ids.map(async (id) => {
    const { data } = await supabase.rpc("resumen_recurso", { p_id: id });
    const x = data?.[0];
    resumenes.set(id, { historias: x?.historias ?? 0, publicadas: x?.publicadas ?? 0, views: x?.views ?? 0, replies: x?.replies ?? 0, dms: x?.dms ?? 0, ultima_semana: x?.ultima_semana ?? null });
  }));

  const filas: RecursoFila[] = (recursos ?? [])
    .map((r) => ({
      id: r.id, nombre: r.nombre, slug_go: r.slug_go, keyword: r.keyword, kit_tag_id: r.kit_tag_id, estado: r.estado, tipo: r.tipo, descripcion: r.descripcion,
      leads: r.leads, leads_actualizado_en: r.leads_actualizado_en, leads_fuente: r.leads_fuente, leads_por_nombre: r.anoto?.nombre ?? null,
      resumen: resumenes.get(r.id)!,
      historias: (historias ?? []).filter((h) => h.recurso_id === r.id) as HistoriaLigada[],
    }))
    .sort((a, b) => (ORDEN_ESTADO_RECURSO[a.estado as EstadoRecurso] ?? 9) - (ORDEN_ESTADO_RECURSO[b.estado as EstadoRecurso] ?? 9));

  const vivos = filas.filter((r) => r.estado === "publicado" || r.estado === "contado").length;
  const leads = filas.reduce((s, r) => s + (r.leads ?? 0), 0);
  const sinDato = filas.filter((r) => (r.estado === "publicado" || r.estado === "contado") && r.leads == null).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Lead magnets</h1>
        <p className="text-sm text-muted-foreground">
          Un recurso es lo que se regala a cambio del DM: vive en go.folklore.mx, se pide con una keyword y Kit lo etiqueta. Aquí se ve qué historias lo empujaron y cuántos leads trajo. Los leads se anotan a mano con fecha de corte hasta que corra go_leads.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{vivos}</span> <span className="text-muted-foreground">publicados</span>
          <span className="text-muted-foreground"> · </span><span className="font-semibold">{leads.toLocaleString("es-MX")}</span> <span className="text-muted-foreground">leads contados</span>
          {sinDato > 0 && <span className="text-ambar"> · {sinDato} sin dato</span>}
        </p>
      </header>
      <ListaRecursos recursos={filas} puedeEditar={esOwner} />
    </div>
  );
}
