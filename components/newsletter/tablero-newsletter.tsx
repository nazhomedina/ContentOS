import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { FORMATO_NEWSLETTER, idKit, numeroEdicion, proximosEnvios, tituloSinNumero } from "@/lib/dominio/newsletter";
import { NOMBRE_ESTADO, type EstadoPieza } from "@/lib/dominio/estados";
import { fechaCorta, hoyISO } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";
import { AgendarEdicion } from "./agendar-edicion";
import { SelectorDiaEnvio } from "./selector-dia-envio";

type Edicion = {
  id: string; id_publico: string | null; titulo: string | null; estado: string; fecha_objetivo: string | null;
  publicada_en: string | null; url: string | null; notas: string | null; hipotesis_id: string | null; etiquetas: string[] | null;
};
type Senal = { tono: "rojo" | "ambar" | "azul"; texto: string };

const ENVIOS_ADELANTE = 8;
const NOMBRE_GRUPO: Record<string, string> = { lista: "Lista para enviar", kit: "En Kit · por programar", redaccion: "En redacción", borrador: "Borradores" };

/**
 * La pantalla del newsletter (docs/decisiones.md 2026-09-16, Opción A): la redacción pasa en Claude; aquí se ve
 * qué edición sale qué día y qué le falta. Izquierda, las ediciones por lo que les falta; derecha, los próximos
 * envíos con hueco para agendar. El día de envío vive en el formato FC-09 y se cambia aquí mismo.
 */
export async function TableroNewsletter({ vista }: { vista?: string }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";
  const hoy = hoyISO();

  const [{ data: piezas }, { data: fmt }] = await Promise.all([
    supabase.from("piezas").select("id, id_publico, titulo, estado, fecha_objetivo, publicada_en, url, notas, hipotesis_id, etiquetas")
      .eq("tipo", "newsletter").neq("estado", "archivada").order("fecha_objetivo", { ascending: true, nullsFirst: false }),
    supabase.from("formatos").select("dia_envio").eq("codigo", FORMATO_NEWSLETTER).maybeSingle(),
  ]);
  const dia = fmt?.dia_envio ?? 5;
  const todas: Edicion[] = piezas ?? [];
  const publicadas = todas.filter((p) => p.estado === "publicada" || p.estado === "en_trial").sort((a, b) => (b.publicada_en ?? "").localeCompare(a.publicada_en ?? ""));
  const activas = todas.filter((p) => !publicadas.includes(p));

  // Preguntas sin responder en el stream de las que están en redacción.
  const enRedaccion = activas.filter((p) => p.estado === "redaccion").map((p) => p.id);
  const { data: pens } = enRedaccion.length
    ? await supabase.from("pensamientos").select("id, pieza_id, tipo, responde_a").in("pieza_id", enRedaccion).in("tipo", ["pregunta", "respuesta"])
    : { data: [] as { id: string; pieza_id: string | null; tipo: string; responde_a: string | null }[] };
  const respondidas = new Set((pens ?? []).filter((x) => x.tipo === "respuesta" && x.responde_a).map((x) => x.responde_a as string));
  const sinResponder = new Map<string, number>();
  for (const x of pens ?? []) if (x.tipo === "pregunta" && x.pieza_id && !respondidas.has(x.id)) sinResponder.set(x.pieza_id, (sinResponder.get(x.pieza_id) ?? 0) + 1);

  const señalDe = (p: Edicion): Senal | null => {
    if (p.fecha_objetivo && p.fecha_objetivo < hoy) return { tono: "rojo", texto: `venció el ${fechaCorta(p.fecha_objetivo)}` };
    if (p.estado === "diseno") return { tono: "ambar", texto: `programar en Kit para el ${fechaCorta(p.fecha_objetivo)} y marcar lista` };
    const n = sinResponder.get(p.id) ?? 0;
    if (p.estado === "redaccion" && n > 0) return { tono: "azul", texto: `${n} ${n === 1 ? "pregunta sin responder" : "preguntas sin responder"}` };
    if (!p.hipotesis_id && !["borrador", "redaccion"].includes(p.estado) && !(p.etiquetas ?? []).includes("legado")) return { tono: "rojo", texto: "sin hipótesis" };
    return null;
  };

  const grupos = [
    { clave: "lista", piezas: activas.filter((p) => p.estado === "listo" || p.estado === "programada") },
    { clave: "kit", piezas: activas.filter((p) => p.estado === "diseno") },
    { clave: "redaccion", piezas: activas.filter((p) => p.estado === "redaccion" || p.estado === "grabacion") },
    { clave: "borrador", piezas: activas.filter((p) => p.estado === "borrador") },
  ].filter((g) => g.piezas.length > 0);

  // Los próximos envíos, más cualquier edición agendada fuera del día de envío.
  const envios = proximosEnvios(dia, hoy, ENVIOS_ADELANTE);
  const ultimo = envios[envios.length - 1];
  const porFecha = new Map<string, Edicion[]>();
  for (const p of activas) if (p.fecha_objetivo && p.fecha_objetivo >= hoy) (porFecha.get(p.fecha_objetivo) ?? porFecha.set(p.fecha_objetivo, []).get(p.fecha_objetivo)!).push(p);
  const filas = [...new Set([...envios, ...[...porFecha.keys()].filter((f) => f <= ultimo)])].sort();
  const huecos = envios.filter((f) => !porFecha.has(f));
  const primerHueco = huecos[0] ?? envios[0];

  const siguiente = activas.find((p) => p.fecha_objetivo && p.fecha_objetivo >= hoy && ["listo", "programada", "diseno"].includes(p.estado));
  const redactando = activas.find((p) => p.estado === "redaccion");
  const vistaActual = vista === "publicadas" ? "publicadas" : "ediciones";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Newsletter</h1>
          <p className="text-sm">
            {activas.length === 0 && <span className="text-muted-foreground">Sin ediciones en camino.</span>}
            {siguiente && <><span className="font-semibold">{numeroEdicion(siguiente.titulo) ?? siguiente.id_publico}</span> <span className="text-muted-foreground">sale el {fechaCorta(siguiente.fecha_objetivo)}</span></>}
            {siguiente && redactando && <span className="text-muted-foreground"> · </span>}
            {redactando && <><span className="font-semibold">{numeroEdicion(redactando.titulo) ?? redactando.id_publico}</span> <span className="text-muted-foreground">en redacción{redactando.fecha_objetivo && <> para el {fechaCorta(redactando.fecha_objetivo)}</>}</span></>}
            {(siguiente || redactando) && huecos.length > 0 && <span className="text-muted-foreground"> · </span>}
            {huecos.length > 0 && <><span className="font-semibold text-ambar">{huecos.length} {huecos.length === 1 ? "envío" : "envíos"} sin edición</span> <span className="text-muted-foreground">de aquí al {fechaCorta(ultimo)}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex gap-1 text-xs font-medium">
            {([["ediciones", "Ediciones"], ["publicadas", `Publicadas · ${publicadas.length}`]] as const).map(([v, n]) => (
              <Link key={v} href={v === "ediciones" ? "/newsletter" : `/newsletter?vista=${v}`} className={cn("rounded-full px-3 py-1", vistaActual === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{n}</Link>
            ))}
          </nav>
          {esOwner && <AgendarEdicion fecha={primerHueco} variante="boton" />}
        </div>
      </header>

      {vistaActual === "publicadas" ? (
        publicadas.length === 0
          ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía ninguna. {siguiente ? `La primera sale el ${fechaCorta(siguiente.fecha_objetivo)}.` : ""}</p>
          : (
            <ul className="divide-y rounded-xl border">
              {publicadas.map((p) => (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <Link href={`/piezas/${p.id}`} className="min-w-0 truncate text-sm font-medium hover:underline"><span className="mr-2 font-mono text-xs text-muted-foreground">{numeroEdicion(p.titulo) ?? p.id_publico}</span>{tituloSinNumero(p.titulo)}</Link>
                  <span className="text-xs text-muted-foreground">{fechaCorta(p.publicada_en?.slice(0, 10) ?? p.fecha_objetivo)}</span>
                  {p.url && <a href={p.url} target="_blank" rel="noopener" className="col-start-1 truncate text-xs text-primary hover:underline">{p.url}</a>}
                </li>
              ))}
            </ul>
          )
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="space-y-5">
            {grupos.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin ediciones en camino. Agenda la primera en el siguiente envío.</p>}
            {grupos.map((g) => (
              <section key={g.clave} className="space-y-1.5">
                <div className="flex items-baseline justify-between px-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{NOMBRE_GRUPO[g.clave]}</h2>
                  <span className="text-xs text-muted-foreground">{g.piezas.length}</span>
                </div>
                <ul className="divide-y rounded-xl border">
                  {g.piezas.map((p) => {
                    const s = señalDe(p);
                    const kit = idKit(p.notas);
                    return (
                      <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5">
                        <Link href={`/piezas/${p.id}`} className="min-w-0 text-sm font-medium leading-snug hover:underline"><span className="mr-2 font-mono text-xs text-muted-foreground">{numeroEdicion(p.titulo) ?? p.id_publico}</span>{tituloSinNumero(p.titulo)}</Link>
                        <span className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
                          {s && <span className={cn("size-[7px] rounded-full", s.tono === "rojo" ? "bg-rojo" : s.tono === "ambar" ? "bg-ambar" : "bg-primary")} aria-hidden />}
                          {p.fecha_objetivo ? fechaCorta(p.fecha_objetivo) : "sin fecha"}
                        </span>
                        {(s || kit) && (
                          <span className="col-start-1 flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
                            {kit && <span>Kit · borrador {kit}</span>}
                            {s && <span className={cn("font-semibold", s.tono === "rojo" ? "text-rojo" : s.tono === "ambar" ? "text-ambar" : "text-primary")}>{s.texto}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="text-xs text-muted-foreground">La redacción pasa en Claude con el skill del newsletter; aquí se ve qué edición sale qué día y qué le falta para salir. Publicadas guarda las enviadas con su liga.</p>
          </div>

          <aside className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Los próximos envíos</h2>
              <SelectorDiaEnvio dia={dia} puedeEditar={esOwner} />
            </div>
            <ul className="divide-y rounded-xl border">
              {filas.map((f) => {
                const eds = porFecha.get(f) ?? [];
                const fuera = !envios.includes(f);
                const d = parseISO(f);
                return (
                  <li key={f} className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 px-3 py-2", f === envios[0] && "bg-primary/[0.04]")}>
                    <span className="flex flex-col leading-none">
                      <b className="text-lg font-extrabold tracking-tight">{format(d, "d")}</b>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{format(d, "MMM", { locale: es })}{fuera && ` · ${format(d, "EEE", { locale: es })}`}</span>
                    </span>
                    {eds.length === 0
                      ? <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span>Sin edición</span>{esOwner && <AgendarEdicion fecha={f} />}</span>
                      : (
                        <span className="flex min-w-0 flex-col gap-1">
                          {eds.map((p) => (
                            <span key={p.id} className="flex items-center justify-between gap-2">
                              <Link href={`/piezas/${p.id}`} className="min-w-0 truncate text-sm hover:underline"><span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{numeroEdicion(p.titulo) ?? p.id_publico}</span>{tituloSinNumero(p.titulo)}</Link>
                              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", p.estado === "listo" || p.estado === "programada" ? "border-foreground bg-foreground text-background" : p.estado === "borrador" ? "border-dashed text-muted-foreground" : "")}>
                                {p.estado === "diseno" ? "En Kit" : NOMBRE_ESTADO[p.estado as EstadoPieza] ?? p.estado}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                  </li>
                );
              })}
            </ul>
            <p className="px-0.5 text-[11px] text-muted-foreground">Cambiar el día recorre los próximos envíos y la fecha por defecto de las ediciones nuevas; las agendadas conservan su fecha. Agendar crea la edición como borrador con el siguiente número.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
