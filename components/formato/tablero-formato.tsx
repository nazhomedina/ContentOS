import Link from "next/link";
import { AlertTriangle, FileText, Link2, Search } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaTarea } from "@/components/app/insignias";
import { hipotesisEnUnaLinea } from "@/lib/dominio/hipotesis";
import { NOMBRE_ESTADO, NOMBRE_TIPO, PRODUCCION, subetapas, type EstadoPieza, type Tipo } from "@/lib/dominio/estados";
import { bucketVencimiento, fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type FiltrosTipo = { vista?: string; q?: string; estado?: string; serie?: string; responsable?: string; sin?: string; etiqueta?: string };
type Vista = "lista" | "tablero" | "publicados" | "archivo";

type TareaAbierta = { tipo: string; estado: string; vence: string | null; asignado: string | null };

/**
 * Pestaña de un tipo de pieza, pensada para escritorio: Lista (la base con filtros), Tablero
 * (columnas Redacción · Grabación · Diseño · Listo), Publicados (con métricas) y Archivo.
 * Cada fila dice quién la tiene, qué tarea está abierta y qué le falta.
 */
export async function TableroTipo({ ruta, etiqueta, tipos, filtros }: { ruta: string; etiqueta: string; tipos: Tipo[]; filtros: FiltrosTipo }) {
  const sesion = await sesionActual();
  const supabase = await crearClienteServidor();
  const esOwner = sesion?.perfil.rol === "owner";
  const vista: Vista = (["lista", "tablero", "publicados", "archivo"] as const).find((v) => v === filtros.vista) ?? "lista";

  const [{ data }, { data: perfiles }] = await Promise.all([
    supabase
      .from("piezas")
      .select("id, id_publico, titulo, tipo, estado, fecha_objetivo, publicada_en, url, series, notas, contenido, etiquetas, responsable_id, hipotesis_id, responsable:perfiles!piezas_responsable_id_fkey(nombre), formato:formatos(codigo), hipotesis:hipotesis(texto, campo, numero, fecha, estado)")
      .in("tipo", tipos)
      .order("fecha_objetivo", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("perfiles").select("user_id, nombre").in("rol", ["owner", "editor"]).order("nombre"),
  ]);
  const todas = (data ?? []).map((p) => ({ ...p, tiene_contenido: Boolean(p.contenido?.trim()), contenido: undefined }));

  // Tareas abiertas por pieza: la que está en curso manda; si no, la bloqueada; si no, la pendiente más próxima.
  const ids = todas.map((p) => p.id);
  const { data: tareas } = ids.length
    ? await supabase.from("tareas").select("pieza_id, tipo, estado, vence, asignado:perfiles!tareas_asignado_a_fkey(nombre)").in("pieza_id", ids).neq("estado", "hecha").order("vence", { ascending: true, nullsFirst: false })
    : { data: [] as never[] };
  const peso = (e: string) => (e === "en_curso" ? 0 : e === "bloqueada" ? 1 : 2);
  const tareaDe = new Map<string, TareaAbierta>();
  for (const t of tareas ?? []) {
    if (!t.pieza_id) continue;
    const actual = tareaDe.get(t.pieza_id);
    if (actual && peso(actual.estado) <= peso(t.estado)) continue;
    tareaDe.set(t.pieza_id, { tipo: t.tipo, estado: t.estado, vence: t.vence, asignado: t.asignado?.nombre ?? null });
  }

  const produccion = todas.filter((p) => !["borrador", "publicada", "en_trial", "archivada"].includes(p.estado));
  const publicadas = todas.filter((p) => ["publicada", "en_trial"].includes(p.estado)).sort((a, b) => (b.publicada_en ?? "").localeCompare(a.publicada_en ?? ""));
  const archivadas = todas.filter((p) => p.estado === "archivada");
  const borradores = todas.filter((p) => p.estado === "borrador").length;
  const buffer = produccion.filter((p) => p.estado === "listo" || p.estado === "programada").length;
  const series = [...new Set(todas.flatMap((p) => p.series ?? []))].sort();
  const etiquetas = [...new Set(todas.flatMap((p) => p.etiquetas ?? []))].sort();

  const q = (filtros.q ?? "").trim().toLowerCase();
  const filtrar = <T extends (typeof todas)[number]>(xs: T[]) =>
    xs.filter((p) => {
      if (q && !`${p.id_publico} ${p.titulo ?? ""} ${(p.series ?? []).join(" ")} ${p.notas ?? ""} ${(p.etiquetas ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      if (filtros.estado && !(filtros.estado === "listo" ? ["listo", "programada"].includes(p.estado) : p.estado === filtros.estado)) return false;
      if (filtros.serie && !(p.series ?? []).includes(filtros.serie)) return false;
      if (filtros.responsable && p.responsable_id !== filtros.responsable) return false;
      if (filtros.etiqueta && !(p.etiquetas ?? []).includes(filtros.etiqueta)) return false;
      if (filtros.sin === "hipotesis" && p.hipotesis_id) return false;
      if (filtros.sin === "contenido" && p.tiene_contenido) return false;
      if (filtros.sin === "responsable" && p.responsable_id) return false;
      if (filtros.sin === "url" && p.url) return false;
      return true;
    });
  const listaProd = filtrar(produccion);
  const listaArchivo = filtrar(archivadas);
  const listaPub = filtrar(publicadas);
  const hayFiltro = Boolean(q || filtros.estado || filtros.serie || filtros.responsable || filtros.sin || filtros.etiqueta);

  const columnas = PRODUCCION.filter((e) => tipos.some((t) => subetapas(t).includes(e)));
  const enColumna = (e: EstadoPieza) => listaProd.filter((p) => (e === "listo" ? ["listo", "programada"].includes(p.estado) : p.estado === e));

  let metricas: Record<string, { views: number | null; likes: number | null; saves: number | null; multiplicador: number | null; fecha: string; fuente: string }> = {};
  if (vista === "publicados" && listaPub.length) {
    const { data: m } = await supabase.from("metricas").select("pieza_id, views, likes, saves, multiplicador, fecha, fuente").in("pieza_id", listaPub.map((p) => p.id)).neq("fuente", "pendiente").order("fecha", { ascending: false });
    for (const r of m ?? []) if (!metricas[r.pieza_id]) metricas = { ...metricas, [r.pieza_id]: r };
  }

  const href = (v: Vista) => {
    const sp = new URLSearchParams();
    if (v !== "lista") sp.set("vista", v);
    for (const k of ["q", "estado", "serie", "responsable", "sin", "etiqueta"] as const) if (filtros[k]) sp.set(k, filtros[k]!);
    const s = sp.toString();
    return s ? `${ruta}?${s}` : ruta;
  };
  const sel = "h-8 rounded-md border border-input bg-background px-2 text-xs";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{etiqueta}</h1>
          <p className="text-sm text-muted-foreground">
            {produccion.length} en producción · buffer {buffer} · {publicadas.length} publicadas · {archivadas.length} en archivo
            {borradores > 0 && esOwner && <> · <Link href={`/ideas?tipo=${tipos[0]}`} className="underline">{borradores} en borrador</Link></>}
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border p-0.5 text-xs font-medium">
          {([["lista", "Lista"], ["tablero", "Tablero"], ["publicados", "Publicados"], ["archivo", "Archivo"]] as const).map(([v, n]) => (
            <Link key={v} href={href(v)} className={cn("rounded-full px-3 py-1", vista === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{n}</Link>
          ))}
        </nav>
      </header>

      <form method="get" action={ruta} className="flex flex-wrap items-center gap-2 text-xs">
        {vista !== "lista" && <input type="hidden" name="vista" value={vista} />}
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar por ID, título, serie, nota o etiqueta" className="h-8 w-72 rounded-md border border-input bg-background pl-7 pr-2 text-xs" />
        </label>
        {vista !== "publicados" && vista !== "archivo" && (
          <select name="estado" defaultValue={filtros.estado ?? ""} className={sel}>
            <option value="">Toda la producción</option>
            {columnas.map((e) => <option key={e} value={e}>{e === "listo" ? "Listo · buffer" : NOMBRE_ESTADO[e]}</option>)}
          </select>
        )}
        {series.length > 0 && (
          <select name="serie" defaultValue={filtros.serie ?? ""} className={sel}>
            <option value="">Todas las series</option>
            {series.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {etiquetas.length > 0 && (
          <select name="etiqueta" defaultValue={filtros.etiqueta ?? ""} className={sel}>
            <option value="">Cualquier etiqueta</option>
            {etiquetas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select name="responsable" defaultValue={filtros.responsable ?? ""} className={sel}>
          <option value="">Cualquier responsable</option>
          {(perfiles ?? []).map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
        </select>
        <select name="sin" defaultValue={filtros.sin ?? ""} className={sel}>
          <option value="">Sin faltantes en particular</option>
          <option value="hipotesis">Sin hipótesis</option>
          <option value="contenido">Sin contenido</option>
          <option value="responsable">Sin responsable</option>
          <option value="url">Sin URL</option>
        </select>
        <button type="submit" className="h-8 rounded-md bg-foreground px-3 text-xs font-semibold text-background">Filtrar</button>
        {hayFiltro && <Link href={href(vista)} className="text-muted-foreground underline">quitar filtros</Link>}
      </form>

      {vista === "lista" && (
        <Tabla vacio={hayFiltro ? "Nada coincide con esos filtros." : `Nada en producción en ${etiqueta.toLowerCase()}.`} filas={listaProd.length}>
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Pieza</th>
              <th className="px-3 py-2">Etapa</th>
              <th className="px-3 py-2">Serie · formato</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Tarea abierta</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Le falta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listaProd.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="max-w-[26rem] px-3 py-2">
                  <Link href={`/piezas/${p.id}`} className="block hover:underline">
                    <span className="flex items-center gap-2"><IdPublico id={p.id_publico} />{tipos.length > 1 && <span className="text-[10px] uppercase text-muted-foreground">{NOMBRE_TIPO[p.tipo as Tipo]}</span>}</span>
                    <span className="line-clamp-2 font-medium leading-snug">{p.titulo ?? "(sin título)"}</span>
                  </Link>
                  {(p.etiquetas ?? []).length > 0 && <span className="mt-0.5 block text-[10px] text-muted-foreground">{p.etiquetas.join(" · ")}</span>}
                </td>
                <td className="px-3 py-2"><InsigniaEstado estado={p.estado} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{(p.series ?? []).join(", ") || "—"}{p.formato?.codigo && <span className="block text-[10px]">{p.formato.codigo}</span>}</td>
                <td className="px-3 py-2 text-xs">{p.responsable?.nombre ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2"><CeldaTarea t={tareaDe.get(p.id)} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.fecha_objetivo ? fechaCorta(p.fecha_objetivo) : "—"}</td>
                <td className="px-3 py-2"><Faltantes sinHipotesis={!p.hipotesis_id} sinContenido={!p.tiene_contenido} sinUrl={["listo", "programada"].includes(p.estado) && !p.url} /></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {vista === "tablero" && (
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
                    {items.map((p) => {
                      const t = tareaDe.get(p.id);
                      return (
                        <li key={p.id}>
                          <Link href={`/piezas/${p.id}`} className="block space-y-1.5 rounded-lg border bg-card p-3 text-sm hover:bg-muted/40">
                            <div className="flex items-center justify-between gap-2">
                              <IdPublico id={p.id_publico} />
                              <span className="flex items-center gap-1.5">{p.estado === "programada" && <InsigniaEstado estado="programada" />}<Faltantes sinHipotesis={!p.hipotesis_id} sinContenido={!p.tiene_contenido} sinUrl={false} compacto /></span>
                            </div>
                            <p className="font-medium leading-snug">{p.titulo ?? "(sin título)"}</p>
                            <p className="text-xs text-muted-foreground">
                              {(p.series ?? []).length > 0 && <span>{p.series.join(", ")} · </span>}
                              {p.fecha_objetivo ? fechaCorta(p.fecha_objetivo) : "sin fecha"}
                              {p.responsable?.nombre && ` · ${p.responsable.nombre}`}
                            </p>
                            {t && <CeldaTarea t={t} />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {vista === "publicados" && (
        <Tabla vacio={`Nada publicado todavía en ${etiqueta.toLowerCase()}.`} filas={listaPub.length} pie={listaPub.length > 0 && !Object.keys(metricas).length ? "Las métricas llegan con el post-scraper. Hasta entonces, «—» significa sin sensor, no cero." : undefined}>
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Pieza</th>
              <th className="px-3 py-2">Serie</th>
              <th className="px-3 py-2">Publicada</th>
              <th className="px-3 py-2 text-right">Views</th>
              <th className="px-3 py-2 text-right">Likes</th>
              <th className="px-3 py-2 text-right">Saves</th>
              <th className="px-3 py-2 text-right">Multiplicador</th>
              <th className="px-3 py-2">Hipótesis</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listaPub.map((p) => {
              const m = metricas[p.id];
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="max-w-[24rem] px-3 py-2">
                    <Link href={`/piezas/${p.id}`} className="flex items-center gap-2 hover:underline"><IdPublico id={p.id_publico} /><span className="line-clamp-2 font-medium">{p.titulo}</span></Link>
                    {p.estado === "en_trial" && <span className="text-[10px] uppercase text-muted-foreground">trial</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{(p.series ?? []).join(", ") || "—"}</td>
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
        </Tabla>
      )}

      {vista === "archivo" && (
        <Tabla vacio="El archivo está vacío." filas={listaArchivo.length} pie="El archivo es el banco: lo que se descartó o se publicó sin registrar URL. Desde el detalle se puede regresar a borrador.">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Pieza</th>
              <th className="px-3 py-2">Serie</th>
              <th className="px-3 py-2">Nota</th>
              <th className="px-3 py-2">Contenido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listaArchivo.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="max-w-[26rem] px-3 py-2"><Link href={`/piezas/${p.id}`} className="flex items-center gap-2 hover:underline"><IdPublico id={p.id_publico} /><span className="line-clamp-2 font-medium">{p.titulo}</span></Link></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{(p.series ?? []).join(", ") || "—"}</td>
                <td className="max-w-[24rem] truncate px-3 py-2 text-xs text-muted-foreground">{p.notas?.split("\n")[0] ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.tiene_contenido ? "sí" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </div>
  );
}

function Tabla({ children, filas, vacio, pie }: { children: React.ReactNode; filas: number; vacio: string; pie?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">{children}</table>
      {filas === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{vacio}</p>}
      {pie && <p className="border-t px-3 py-2 text-xs text-muted-foreground">{pie}</p>}
    </div>
  );
}

function CeldaTarea({ t }: { t?: TareaAbierta }) {
  if (!t) return <span className="text-xs text-muted-foreground">sin tarea</span>;
  const vencida = bucketVencimiento(t.vence) === "vencida";
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <InsigniaTarea tipo={t.tipo} />
      <span className={cn("font-semibold", t.estado === "bloqueada" ? "text-rojo" : t.estado === "en_curso" ? "text-primary" : "text-muted-foreground")}>
        {t.estado === "bloqueada" ? "bloqueada" : t.estado === "en_curso" ? "en curso" : "pendiente"}
      </span>
      <span className="text-muted-foreground">
        {t.asignado && <>{t.asignado}</>}
        {t.vence && <span className={cn(vencida && t.estado !== "bloqueada" && "text-rojo")}> · {vencida ? "venció" : "vence"} {fechaCorta(t.vence)}</span>}
      </span>
    </div>
  );
}

function Faltantes({ sinHipotesis, sinContenido, sinUrl, compacto }: { sinHipotesis: boolean; sinContenido: boolean; sinUrl: boolean; compacto?: boolean }) {
  const faltas: { k: string; texto: string; Icono: typeof AlertTriangle; clase: string }[] = [];
  if (sinHipotesis) faltas.push({ k: "h", texto: "sin hipótesis", Icono: AlertTriangle, clase: "text-rojo" });
  if (sinContenido) faltas.push({ k: "c", texto: "sin contenido", Icono: FileText, clase: "text-ambar" });
  if (sinUrl) faltas.push({ k: "u", texto: "sin URL", Icono: Link2, clase: "text-ambar" });
  if (faltas.length === 0) return compacto ? null : <span className="text-xs text-ok">nada</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
      {faltas.map((f) => <span key={f.k} className={cn("inline-flex items-center gap-1", f.clase)} title={f.texto}><f.Icono className="size-3.5" />{!compacto && f.texto}</span>)}
    </span>
  );
}
