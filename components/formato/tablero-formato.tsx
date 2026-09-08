import Link from "next/link";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { hipotesisEnUnaLinea } from "@/lib/dominio/hipotesis";
import { NOMBRE_ESTADO, NOMBRE_FORMATO, PRODUCCION, subetapas, type EstadoPieza, type Formato } from "@/lib/dominio/estados";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

/**
 * Pestaña de un formato: Producción en columnas (Redacción · Grabación · Diseño · Listo)
 * y Publicados con métricas. Las columnas que no aplican al formato se omiten.
 */
export async function TableroFormato({ ruta, etiqueta, formatos, vista }: { ruta: string; etiqueta: string; formatos: Formato[]; vista: "produccion" | "publicados" }) {
  const sesion = await sesionActual();
  const supabase = await crearClienteServidor();
  const esOwner = sesion?.perfil.rol === "owner";

  const { data } = await supabase
    .from("piezas")
    .select("id, id_publico, titulo, formato, estado, fecha_objetivo, publicada_en, url, hipotesis, serie, responsable:perfiles!piezas_responsable_id_fkey(nombre), format_card:format_cards(codigo)")
    .in("formato", formatos)
    .neq("estado", "archivada")
    .order("fecha_objetivo", { ascending: true, nullsFirst: false });
  const piezas = data ?? [];
  const produccion = piezas.filter((p) => !["borrador", "publicada", "en_trial"].includes(p.estado));
  const publicadas = piezas.filter((p) => ["publicada", "en_trial"].includes(p.estado)).sort((a, b) => (b.publicada_en ?? "").localeCompare(a.publicada_en ?? ""));
  const borradores = piezas.filter((p) => p.estado === "borrador").length;

  const columnas = PRODUCCION.filter((e) => formatos.some((f) => subetapas(f).includes(e)));
  const enColumna = (e: EstadoPieza) => produccion.filter((p) => (e === "listo" ? ["listo", "programada"].includes(p.estado) : p.estado === e));

  // Métricas de las publicadas: última lectura por pieza
  let metricas: Record<string, { views: number | null; likes: number | null; saves: number | null; multiplicador: number | null; fecha: string }> = {};
  if (vista === "publicados" && publicadas.length) {
    const { data: m } = await supabase.from("metricas").select("pieza_id, views, likes, saves, multiplicador, fecha").in("pieza_id", publicadas.map((p) => p.id)).neq("fuente", "pendiente").order("fecha", { ascending: false });
    for (const r of m ?? []) if (!metricas[r.pieza_id]) metricas = { ...metricas, [r.pieza_id]: r };
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{etiqueta}</h1>
          <p className="text-sm text-muted-foreground">
            {produccion.length} en producción · {publicadas.length} publicadas
            {borradores > 0 && <> · <Link href={`/ideas?formato=${formatos[0]}`} className="underline">{borradores} en borrador</Link></>}
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border p-0.5 text-xs font-medium">
          <Link href={ruta} className={cn("rounded-full px-3 py-1", vista === "produccion" ? "bg-foreground text-background" : "text-muted-foreground")}>Producción</Link>
          <Link href={`${ruta}?vista=publicados`} className={cn("rounded-full px-3 py-1", vista === "publicados" ? "bg-foreground text-background" : "text-muted-foreground")}>Publicados</Link>
        </nav>
      </header>

      {vista === "produccion" ? (
        <div className={cn("grid gap-3", columnas.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", "md:grid-cols-2")}>
          {columnas.map((e) => {
            const items = enColumna(e);
            return (
              <section key={e} className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <h2 className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {e === "listo" ? "Listo · buffer" : NOMBRE_ESTADO[e]} <span className="font-medium">{items.length}</span>
                </h2>
                {items.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Vacío</p> : (
                  <ul className="space-y-2">
                    {items.map((p) => (
                      <li key={p.id}>
                        <Link href={`/piezas/${p.id}`} className="block space-y-1 rounded-lg border bg-card p-3 text-sm hover:bg-muted/40">
                          <div className="flex items-center justify-between gap-2">
                            <IdPublico id={p.id_publico} />
                            {p.estado === "programada" && <InsigniaEstado estado="programada" />}
                          </div>
                          <p className="font-medium leading-snug">{p.titulo ?? "(sin título)"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatos.length > 1 && <span>{NOMBRE_FORMATO[p.formato as Formato]} · </span>}
                            {p.format_card?.codigo && <span>{p.format_card.codigo} · </span>}
                            {p.fecha_objetivo ? fechaCorta(p.fecha_objetivo) : "sin fecha"}
                            {p.responsable?.nombre && ` · ${p.responsable.nombre}`}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Pieza</th>
                <th className="px-3 py-2">Publicada</th>
                <th className="px-3 py-2 text-right">Views</th>
                <th className="px-3 py-2 text-right">Likes</th>
                <th className="px-3 py-2 text-right">Saves</th>
                <th className="px-3 py-2 text-right">Multiplicador</th>
                <th className="px-3 py-2">Hipótesis</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {publicadas.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nada publicado todavía en {etiqueta.toLowerCase()}.</td></tr>}
              {publicadas.map((p) => {
                const m = metricas[p.id];
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link href={`/piezas/${p.id}`} className="flex items-center gap-2 hover:underline"><IdPublico id={p.id_publico} /><span className="font-medium">{p.titulo}</span></Link>
                      {p.estado === "en_trial" && <span className="text-[10px] uppercase text-muted-foreground">trial</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.publicada_en ? fechaCorta(p.publicada_en.slice(0, 10)) : "—"}{p.url && <> · <a href={p.url} target="_blank" rel="noreferrer" className="underline">ver</a></>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m?.views ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m?.likes ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m?.saves ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", (m?.multiplicador ?? 0) >= 3 && "text-ok")}>{m?.multiplicador != null ? `${m.multiplicador}x` : <span className="font-normal text-muted-foreground">—</span>}</td>
                    <td className="max-w-[18rem] truncate px-3 py-2 text-xs text-muted-foreground">{hipotesisEnUnaLinea(p.hipotesis)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {publicadas.length > 0 && !Object.keys(metricas).length && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">Las métricas llegan con el post-scraper (sprint 2). Hasta entonces, «—» significa sin sensor, no cero.</p>
          )}
        </div>
      )}
      {esOwner && vista === "produccion" && (
        <p className="text-xs text-muted-foreground">
          Las piezas entran aquí cuando pasan de borrador a redacción con un formato. Se mueven de columna desde su detalle.{" "}
          <InsigniaFormato formato={formatos[0]} />
        </p>
      )}
    </div>
  );
}
