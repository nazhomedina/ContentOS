import { notFound, redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaTipo, InsigniaTarea } from "@/components/app/insignias";
import { AccionesPieza } from "@/components/pieza/acciones-pieza";
import { AccionesOwner } from "@/components/pieza/acciones-owner";
import { Assets } from "@/components/pieza/assets";
import { Comentarios } from "@/components/pieza/comentarios";
import { Contenido } from "@/components/pieza/contenido";
import { Etiquetas } from "@/components/pieza/etiquetas";
import { Stream, type Pensamiento } from "@/components/pieza/stream";
import { UrlPieza } from "@/components/pieza/url-pieza";
import { Versiones, type Version } from "@/components/pieza/versiones";
import { NOMBRE_ESTADO_HIPOTESIS, hipotesisEnUnaLinea, hipotesisResoluble } from "@/lib/dominio/hipotesis";
import { fechaCorta, fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DetallePieza({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const [{ data: tareas }, { data: comentarios }, { data: assets }, { data: perfiles }, { data: formatos }, { data: pensamientos }, { data: versiones }] = await Promise.all([
    supabase.from("tareas").select("id, tipo, estado, vence, nota_bloqueo, hecha_en, asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.from("comentarios").select("id, texto, created_at, autor:perfiles!comentarios_autor_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.from("assets").select("ruta, nombre, carpeta, created_at").eq("pieza_id", id).order("created_at", { ascending: false }),
    supabase.from("perfiles").select("user_id, nombre, rol").in("rol", ["owner", "editor"]).order("nombre"),
    supabase.from("formatos").select("id, codigo, nombre").order("codigo"),
    esOwner
      ? supabase.from("pensamientos").select("id, tipo, texto, transcript_crudo, transcript_pulido, audio_url, duracion_s, ronda, responde_a, created_at").eq("pieza_id", id).order("created_at")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("contenido_versiones").select("version, contenido, instruccion, autor, created_at").eq("pieza_id", id).order("version"),
  ]);

  const stream: Pensamiento[] = (pensamientos ?? []).map((p) => ({
    id: p.id, tipo: p.tipo, texto: p.texto, transcript: p.transcript_crudo, transcript_pulido: p.transcript_pulido,
    audio_url: p.audio_url, duracion_s: p.duracion_s, ronda: p.ronda, responde_a: p.responde_a, cuando: fechaHora(p.created_at),
  }));
  const historial: Version[] = (versiones ?? []).map((v) => ({ version: v.version, contenido: v.contenido, instruccion: v.instruccion, autor: v.autor, cuando: fechaHora(v.created_at) }));
  const vigente = historial.length > 0 ? historial[historial.length - 1] : null;
  const enRedaccion = pieza.estado === "borrador" || pieza.estado === "redaccion";
  const h = pieza.hipotesis;
  const esLegado = (pieza.etiquetas ?? []).includes("legado");

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <IdPublico id={pieza.id_publico} />
          {pieza.tipo && <InsigniaTipo tipo={pieza.tipo} />}
          <InsigniaEstado estado={pieza.estado} />
          {pieza.formato && <span className="text-xs text-muted-foreground">{pieza.formato.codigo} · {pieza.formato.nombre}</span>}
          {pieza.serie && <span className="text-xs text-muted-foreground">· serie {pieza.serie}</span>}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{pieza.titulo ?? pieza.id_publico}</h1>
        <Etiquetas piezaId={pieza.id} etiquetas={pieza.etiquetas ?? []} puedeEditar={esOwner} />
        {!esOwner && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <Dato k="Fecha objetivo" v={fechaCorta(pieza.fecha_objetivo)} />
            <Dato k="Responsable" v={pieza.responsable?.nombre ?? "—"} />
            <Dato k="Etapa del embudo" v={pieza.etapa_embudo ?? "—"} />
          </dl>
        )}
        {pieza.estado === "borrador" && (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Es un borrador. Habla aquí abajo en el stream, contesta lo que Claude pregunte y, cuando tenga tipo, «Producir» la manda a redacción. Desde Claude: «entrevístame sobre {pieza.id_publico}».
          </p>
        )}
        {pieza.estado === "publicada" && pieza.publicada_en && (
          <p className="text-sm">Publicada {fechaHora(pieza.publicada_en)} en {pieza.plataforma}.</p>
        )}
      </header>

      {esOwner && (
        <AccionesOwner piezaId={pieza.id} estado={pieza.estado} tipo={pieza.tipo} fechaObjetivo={pieza.fecha_objetivo} responsableId={pieza.responsable_id} serie={pieza.serie} formatoId={pieza.formato_id} etapa={pieza.etapa_embudo} perfiles={perfiles ?? []} formatos={formatos ?? []} />
      )}

      {pieza.estado !== "borrador" && <UrlPieza piezaId={pieza.id} url={pieza.url} plataforma={pieza.plataforma} puedeEditar={puedeEditar} />}

      <Seccion titulo="Hipótesis">
        {h ? (
          <div className={cn("rounded-xl border px-4 py-3 text-sm", hipotesisResoluble(h) ? "" : "border-ambar/50 bg-ambar/5")}>
            <p className="font-medium">{h.texto}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hipotesisResoluble(h) ? `${h.campo} ≥ ${h.numero} al ${h.fecha}` : "Sin número ni fecha que la cierren. Claude la completa en redacción."}
              {" · "}{NOMBRE_ESTADO_HIPOTESIS[h.estado] ?? h.estado}
            </p>
          </div>
        ) : (
          <p className={cn("rounded-xl border border-dashed px-4 py-3 text-sm", esLegado ? "text-muted-foreground" : "border-rojo/50 text-rojo")}>
            {hipotesisEnUnaLinea(null)}{esLegado && " Heredada de Notion sin hipótesis; puede seguir en producción, pero no se mide."}
          </p>
        )}
      </Seccion>

      {esOwner && enRedaccion && (
        <Seccion titulo="Stream de redacción">
          <Stream piezaId={pieza.id} idPublico={pieza.id_publico} items={stream} puedeEscribir />
        </Seccion>
      )}

      <Seccion titulo={vigente ? `Contenido · v${vigente.version}` : "Contenido"}>
        {vigente && <p className="text-xs text-muted-foreground">{vigente.autor ?? "claude"} · {vigente.cuando}{vigente.instruccion && ` · «${vigente.instruccion}»`}</p>}
        <Contenido piezaId={pieza.id} contenido={pieza.contenido} puedeEditar={puedeEditar} vacio={pieza.estado === "borrador" ? "Todavía no hay contenido. Sale de la entrevista con Claude o se escribe aquí." : "Sin contenido. Escríbelo aquí o pídeselo a Claude."} />
        {historial.length > 1 && <Versiones piezaId={pieza.id} versiones={historial} puedeVolver={puedeEditar} />}
      </Seccion>

      {esOwner && !enRedaccion && stream.length > 0 && (
        <details className="group rounded-xl border">
          <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
            Stream de redacción <span className="ml-2 font-medium normal-case tracking-normal">· {stream.length} · lo que se dijo antes de escribir</span>
          </summary>
          <div className="border-t px-4 py-4"><Stream piezaId={pieza.id} idPublico={pieza.id_publico} items={stream} puedeEscribir={false} /></div>
        </details>
      )}

      <Seccion titulo="Notas">
        {pieza.notas ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{pieza.notas}</p> : <p className="text-sm text-muted-foreground">Sin notas. Aquí van spec visual, contexto, avisos: lo que rodea al contenido.</p>}
      </Seccion>

      <Seccion titulo="Assets">
        <Assets piezaId={pieza.id} assets={(assets ?? []).map((a) => ({ ruta: a.ruta, nombre: a.nombre, carpeta: a.carpeta === "otro" ? "" : a.carpeta }))} puedeSubir={puedeEditar} />
      </Seccion>

      <Seccion titulo="Tareas">
        {(tareas ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sin tareas asignadas.</p> : (
          <ul className="divide-y rounded-lg border text-sm">
            {(tareas ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <InsigniaTarea tipo={t.tipo} />
                <span className={cn("font-semibold", t.estado === "bloqueada" ? "text-rojo" : t.estado === "en_curso" ? "text-primary" : t.estado === "hecha" ? "text-ok" : "text-muted-foreground")}>{t.estado.replace("_", " ")}</span>
                <span className="text-muted-foreground">· {t.asignado?.nombre ?? "sin asignar"} · {t.estado === "hecha" ? `hecha ${fechaCorta(t.hecha_en?.slice(0, 10))}` : `vence ${fechaCorta(t.vence)}`}</span>
                {t.estado === "bloqueada" && <span className="text-rojo">{t.nota_bloqueo}</span>}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Comentarios">
        <Comentarios piezaId={pieza.id} comentarios={(comentarios ?? []).map((c) => ({ id: c.id, texto: c.texto, cuando: fechaHora(c.created_at), autor: c.autor?.nombre ?? "?" }))} />
      </Seccion>

      <AccionesPieza piezaId={pieza.id} estado={pieza.estado} rol={rol} urlActual={pieza.url} plataformaActual={pieza.plataforma} />
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
