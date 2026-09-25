import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaTipo, InsigniaTarea } from "@/components/app/insignias";
import { AccionesPieza } from "@/components/pieza/acciones-pieza";
import { AsignarTarea } from "@/components/pieza/asignar-tarea";
import { Assets } from "@/components/pieza/assets";
import { Camino } from "@/components/pieza/camino";
import { Comentarios } from "@/components/pieza/comentarios";
import { Contenido } from "@/components/pieza/contenido";
import { Etiquetas } from "@/components/pieza/etiquetas";
import { FichaPieza } from "@/components/pieza/ficha-pieza";
import { HipotesisPieza } from "@/components/pieza/hipotesis-pieza";
import { SeriesPieza } from "@/components/pieza/series-pieza";
import { UrlPieza } from "@/components/pieza/url-pieza";
import { Versiones, type Version } from "@/components/pieza/versiones";
import { MaquetaPieza } from "@/components/pieza/maqueta";
import { NOMBRE_TAREA, type TipoTarea } from "@/lib/dominio/estados";
import { bucketVencimiento, fechaCorta, fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";

/**
 * La pieza abierta (docs/decisiones.md 2026-09-16): el camino de estados arriba, el contenido como
 * documento a la izquierda y la ficha fija a la derecha con todo lo que describe la pieza.
 */
/** La ficha completa de una pieza. En página (liga directa, recarga) o dentro del panel lateral (enPanel). */
export async function DetallePieza({ id, vista, v, enPanel = false }: { id: string; vista?: string; v?: string; enPanel?: boolean }) {
  const vistaMaqueta = vista === "maqueta";
  const versionMaqueta = v && /^\d+$/.test(v) ? Number(v) : undefined;
  // En el panel las pestañas navegan dentro del panel (sin apilar historial); en página, navegación normal.
  const Liga = ({ href, className, children, ...rest }: { href: string; className?: string; children: React.ReactNode; "aria-current"?: "page" }) =>
    enPanel ? <NextLink href={href} replace scroll={false} className={className} {...rest}>{children}</NextLink> : <a href={href} className={className} {...rest}>{children}</a>;
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();

  const { data: pieza } = await supabase
    .from("piezas")
    .select("*, formato:formatos(id, codigo, nombre), responsable:perfiles!piezas_responsable_id_fkey(nombre), hipotesis:hipotesis(id, texto, campo, numero, fecha, estado)")
    .eq("id", id)
    .maybeSingle();
  if (!pieza) notFound();

  const rol = sesion.perfil.rol as Rol;
  const esOwner = rol === "owner";
  const puedeEditar = rol !== "viewer";

  const [{ data: tareas }, { data: comentarios }, { data: assets }, { data: perfiles }, { data: formatos }, { data: versiones }] = await Promise.all([
    supabase.from("tareas").select("id, tipo, estado, vence, nota_bloqueo, hecha_en, asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.from("comentarios").select("id, texto, created_at, autor:perfiles!comentarios_autor_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.from("assets").select("ruta, nombre, carpeta, created_at").eq("pieza_id", id).order("created_at", { ascending: false }),
    supabase.from("perfiles").select("user_id, nombre, rol").in("rol", ["owner", "editor"]).order("nombre"),
    supabase.from("formatos").select("id, codigo, nombre").order("codigo"),
    supabase.from("contenido_versiones").select("version, contenido, instruccion, autor, created_at").eq("pieza_id", id).order("version"),
  ]);
  const { data: maq } = await supabase.from("maqueta_actual").select("version, desactualizada").eq("pieza_id", id).maybeSingle();
  const { data: seriesActivas } = await supabase.from("series").select("nombre").eq("activa", true).order("nombre");
  const { data: abiertas } = esOwner
    ? await supabase.from("hipotesis").select("id, texto, campo, numero, fecha, estado").eq("estado", "abierta").order("created_at", { ascending: false }).limit(150)
    : { data: [] as { id: string; texto: string; campo: string | null; numero: number | null; fecha: string | null; estado: string }[] };

  const historial: Version[] = (versiones ?? []).map((v) => ({ version: v.version, contenido: v.contenido, instruccion: v.instruccion, autor: v.autor, cuando: fechaHora(v.created_at) }));
  const vigente = historial.length > 0 ? historial[historial.length - 1] : null;
  const esLegado = (pieza.etiquetas ?? []).includes("legado");

  // Qué sigue: la primera tarea abierta, o la fecha objetivo.
  const abiertasT = (tareas ?? []).filter((t) => t.estado !== "hecha");
  const proxima = abiertasT.find((t) => t.estado === "en_curso") ?? abiertasT[0];
  const siguiente = pieza.estado === "publicada" && pieza.publicada_en
    ? `Publicada ${fechaHora(pieza.publicada_en)} en ${pieza.plataforma}`
    : proxima
      ? `Sigue: ${NOMBRE_TAREA[proxima.tipo as TipoTarea]?.toLowerCase() ?? proxima.tipo} · ${proxima.asignado?.nombre ?? "sin asignar"}${proxima.vence ? ` · vence ${fechaCorta(proxima.vence)}` : ""}`
      : pieza.fecha_objetivo ? `Fecha objetivo ${fechaCorta(pieza.fecha_objetivo)}` : "Sin tarea abierta ni fecha objetivo";

  return (
    <article className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <IdPublico id={pieza.id_publico} />
            {pieza.tipo && <InsigniaTipo tipo={pieza.tipo} />}
            <InsigniaEstado estado={pieza.estado} />
            {pieza.formato && <span className="text-xs text-muted-foreground">{pieza.formato.codigo} · {pieza.formato.nombre}</span>}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-balance">{pieza.titulo ?? pieza.id_publico}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <SeriesPieza piezaId={pieza.id} series={pieza.series ?? []} activas={(seriesActivas ?? []).map((s) => s.nombre)} puedeEditar={esOwner} />
            <Etiquetas piezaId={pieza.id} etiquetas={pieza.etiquetas ?? []} puedeEditar={esOwner} />
          </div>
        </div>
        <div className="shrink-0 pt-1">
          <AccionesPieza piezaId={pieza.id} estado={pieza.estado} rol={rol} urlActual={pieza.url} plataformaActual={pieza.plataforma} />
        </div>
      </header>

      <Camino tipo={pieza.tipo} estado={pieza.estado} siguiente={siguiente} />

      {pieza.estado === "borrador" && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Es un borrador. La entrevista y la redacción pasan en Claude Cowork: «entrevístame sobre {pieza.id_publico}». Cuando tenga tipo, «Producir» la manda a redacción.
        </p>
      )}

      <div className={cn("grid items-start gap-8", enPanel ? "2xl:grid-cols-[minmax(0,1fr)_19rem]" : "xl:grid-cols-[minmax(0,1fr)_20.5rem]")}>
        <section className="min-w-0 space-y-6">
          <nav aria-label="Vista de la pieza" className="flex gap-1.5">
            <Liga href={`/piezas/${pieza.id}`} aria-current={!vistaMaqueta ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !vistaMaqueta ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>Contenido</Liga>
            <Liga href={`/piezas/${pieza.id}?vista=maqueta`} aria-current={vistaMaqueta ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-xs font-medium", vistaMaqueta ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted", maq?.desactualizada && !vistaMaqueta && "border-ambar text-ambar")}>
              Maqueta{maq ? ` · v${maq.version}` : ""}{maq?.desactualizada ? " · desactualizada" : ""}
            </Liga>
          </nav>
          {vistaMaqueta ? <MaquetaPieza piezaId={pieza.id} idPublico={pieza.id_publico ?? ""} version={versionMaqueta} enPanel={enPanel} /> : <>
          <div className="rounded-xl border px-5 py-5 sm:px-7">
            <div className="mb-3 flex flex-wrap items-baseline gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{vigente ? `Contenido · v${vigente.version}` : "Contenido"}</span>
              {vigente && <span className="text-xs text-muted-foreground">{vigente.autor ?? "claude"} · {vigente.cuando}{vigente.instruccion && ` · «${vigente.instruccion}»`}</span>}
            </div>
            <div className="max-w-[68ch]">
              <Contenido piezaId={pieza.id} contenido={pieza.contenido} puedeEditar={puedeEditar} vacio={pieza.estado === "borrador" ? "Todavía no hay contenido. Sale de la entrevista con Claude o se escribe aquí." : "Sin contenido. Escríbelo aquí o pídeselo a Claude."} />
            </div>
            {historial.length > 1 && <div className="mt-4"><Versiones piezaId={pieza.id} versiones={historial} puedeVolver={puedeEditar} /></div>}
          </div>

          <details className="group rounded-xl border" open={Boolean(pieza.notas)}>
            <summary className="flex cursor-pointer flex-wrap items-baseline gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas</span>
              <span className="text-xs text-muted-foreground">spec visual, contexto, avisos: lo que rodea al contenido</span>
            </summary>
            <div className="border-t px-4 py-3">
              {pieza.notas ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pieza.notas}</p> : <p className="text-sm text-muted-foreground">Sin notas.</p>}
            </div>
          </details>
          </>}


          <Bloque titulo="Comentarios">
            <Comentarios piezaId={pieza.id} comentarios={(comentarios ?? []).map((c) => ({ id: c.id, texto: c.texto, cuando: fechaHora(c.created_at), autor: c.autor?.nombre ?? "?" }))} />
          </Bloque>
        </section>

        <aside className={cn("space-y-4", !enPanel && "xl:sticky xl:top-8")}>
          <Tarjeta titulo="Ficha">
            {esOwner ? (
              <FichaPieza piezaId={pieza.id} estado={pieza.estado} tipo={pieza.tipo} fechaObjetivo={pieza.fecha_objetivo} responsableId={pieza.responsable_id} formatoId={pieza.formato_id} etapa={pieza.etapa_embudo} perfiles={perfiles ?? []} formatos={formatos ?? []} />
            ) : (
              <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                <Dato k="Fecha objetivo" v={fechaCorta(pieza.fecha_objetivo)} />
                <Dato k="Responsable" v={pieza.responsable?.nombre ?? "—"} />
                <Dato k="Etapa" v={pieza.etapa_embudo ?? "—"} />
              </dl>
            )}
          </Tarjeta>

          <Tarjeta titulo="Hipótesis">
            <HipotesisPieza piezaId={pieza.id} actual={pieza.hipotesis} abiertas={abiertas ?? []} esLegado={esLegado} puedeEditar={esOwner} />
          </Tarjeta>

          {pieza.estado !== "borrador" && (
            <Tarjeta titulo="URL">
              <UrlPieza piezaId={pieza.id} url={pieza.url} plataforma={pieza.plataforma} puedeEditar={puedeEditar} />
            </Tarjeta>
          )}

          <Tarjeta titulo="Tareas" accion={esOwner && pieza.estado !== "borrador" ? <AsignarTarea piezaId={pieza.id} tipo={pieza.tipo} perfiles={perfiles ?? []} /> : undefined}>
            {(tareas ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Sin tareas asignadas.</p> : (
              <ul className="space-y-1.5">
                {(tareas ?? []).map((t) => {
                  const vencida = t.estado !== "hecha" && bucketVencimiento(t.vence) === "vencida";
                  return (
                    <li key={t.id} className="space-y-0.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5"><InsigniaTarea tipo={t.tipo} /><span className={cn("font-medium", t.estado === "bloqueada" ? "text-rojo" : t.estado === "en_curso" ? "text-primary" : t.estado === "hecha" ? "text-ok" : "text-muted-foreground")}>{t.estado.replace("_", " ")}</span></span>
                        <span className={cn("shrink-0", vencida ? "font-medium text-rojo" : "text-muted-foreground")}>{t.estado === "hecha" ? `hecha ${fechaCorta(t.hecha_en?.slice(0, 10))}` : `${vencida ? "venció" : "vence"} ${fechaCorta(t.vence)}`}</span>
                      </div>
                      <p className="text-muted-foreground">{t.asignado?.nombre ?? "sin asignar"}{t.estado === "bloqueada" && t.nota_bloqueo && <span className="text-rojo"> · {t.nota_bloqueo}</span>}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Assets">
            <Assets piezaId={pieza.id} assets={(assets ?? []).map((a) => ({ ruta: a.ruta, nombre: a.nombre, carpeta: a.carpeta === "otro" ? "" : a.carpeta }))} puedeSubir={puedeEditar} />
          </Tarjeta>
        </aside>
      </div>
    </article>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Tarjeta({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </>
  );
}
