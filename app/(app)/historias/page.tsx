import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { DIAS_SEMANA, fechaCorta, hoyISO, lunesDe, lunesDeHoy, sumarDias } from "@/lib/dominio/tiempo";
import { NOMBRE_TIPO_HISTORIA, TIPOS_HISTORIA, TONO_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { FilaHistoria, TarjetaHistoria, type HistoriaCard } from "@/components/historias/tarjeta-historia";
import { NuevaHistoria } from "@/components/historias/nueva-historia";
import { TomarDelBuffer } from "@/components/historias/agendar";
import { BotonAprobarHistorias } from "@/components/hoy/aprobar-historias";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Historias de la semana" };
export const dynamic = "force-dynamic";

const SELECT = "id, semana, dia, orden, tipo, registro, copy, asset_url, keyword, estado, programada_para, publicada_en, views, replies, dms, recurso_id, pieza_amplificada_id, pieza:piezas!historias_pieza_amplificada_id_fkey(id, id_publico, titulo), recurso:recursos(id, nombre, slug_go, keyword)";

/**
 * La semana en filas, hoy abierto (docs/decisiones.md 2026-09-16 · Historias). Un bloque por día; hoy con la
 * tarjeta completa, los demás una fila por historia; los días vacíos dicen que faltan. Abajo, el buffer:
 * historias sin fecha que se agendan en un día y se aprueban al hacerlo.
 */
export default async function Historias({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { semana: s } = await searchParams;
  const semana = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? lunesDe(s) : lunesDeHoy();
  const hoy = hoyISO();
  const supabase = await crearClienteServidor();
  const rol = sesion.perfil.rol as Rol;
  const esOwner = rol === "owner";

  const consulta = supabase.from("historias").select(SELECT).neq("estado", "descartada").order("dia", { ascending: true, nullsFirst: false }).order("orden");
  const [{ data }, { data: recursos }, { data: piezas }] = await Promise.all([
    esOwner ? consulta.or(`semana.eq.${semana},semana.is.null`) : consulta.eq("semana", semana),
    esOwner ? supabase.from("recursos").select("id, nombre, keyword").in("estado", ["publicado", "contado", "produccion"]).order("nombre") : Promise.resolve({ data: [] }),
    esOwner ? supabase.from("piezas").select("id, id_publico, titulo").in("estado", ["listo", "programada", "publicada"]).in("tipo", ["reel", "yap", "carrusel", "newsletter"]).order("fecha_objetivo", { ascending: false, nullsFirst: false }).limit(40) : Promise.resolve({ data: [] }),
  ]);
  const todas = (data ?? []) as unknown as HistoriaCard[];
  const conFecha = todas.filter((h) => h.semana === semana);
  const buffer = todas.filter((h) => !h.semana);
  const opcionesRecursos = (recursos ?? []) as { id: string; nombre: string; keyword: string | null }[];
  const opcionesPiezas = (piezas ?? []) as { id: string; id_publico: string | null; titulo: string | null }[];

  const publicadas = conFecha.filter((h) => h.estado === "publicada").length;
  const porPublicar = conFecha.filter((h) => h.estado === "aprobada" || h.estado === "programada").length;
  const propuestas = conFecha.filter((h) => h.estado === "propuesta").length;
  const diaHoy = Array.from({ length: 7 }, (_, i) => i + 1).find((d) => sumarDias(semana, d - 1) === hoy) ?? null;
  const diasSin = [1, 2, 3, 4, 5].filter((d) => !conFecha.some((h) => h.dia === d)).length;
  const bloques = [
    ...[1, 2, 3, 4, 5].map((d) => ({ clave: String(d), nombre: DIAS_SEMANA[d - 1], fecha: fechaCorta(sumarDias(semana, d - 1)).replace(/^\w+ /, ""), dias: [d], laboral: true })),
    { clave: "fin", nombre: "Sábado · domingo", fecha: `${fechaCorta(sumarDias(semana, 5)).replace(/^\w+ /, "")} – ${fechaCorta(sumarDias(semana, 6)).replace(/^\w+ /, "")}`, dias: [6, 7], laboral: false },
  ];
  const bufferCorto = buffer.map((h) => ({ id: h.id, tipo: h.tipo, copy: h.copy }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Historias</h1>
          <p className="text-sm">
            <span className="text-muted-foreground">Semana del {fechaCorta(semana)} · </span>
            {conFecha.length === 0
              ? <span className="text-muted-foreground">{rol === "editor" ? "Nazho todavía no aprueba historias para esta semana." : "sin historias todavía"}</span>
              : <><span className="font-semibold">{publicadas} de {conFecha.length}</span> <span className="text-muted-foreground">publicadas</span><span className="text-muted-foreground"> · </span><span className="font-semibold">{porPublicar}</span> <span className="text-muted-foreground">por publicar</span>{propuestas > 0 && <span className="text-muted-foreground"> · {propuestas} en propuesta</span>}</>}
            {diasSin > 0 && <><span className="text-muted-foreground"> · </span><span className="font-semibold text-ambar">{diasSin} {diasSin === 1 ? "día" : "días"} entre semana sin historia</span></>}
            {esOwner && buffer.length > 0 && <><span className="text-muted-foreground"> · </span><span className="font-semibold">{buffer.length}</span> <span className="text-muted-foreground">en el buffer</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {esOwner && propuestas > 0 && <BotonAprobarHistorias semana={semana} n={propuestas} compacto />}
          {esOwner && <NuevaHistoria semana={semana} recursos={opcionesRecursos} piezas={opcionesPiezas} />}
          <div className="flex gap-1">
            <Link href={`/historias?semana=${sumarDias(semana, -7)}`} className="rounded-md border p-2" aria-label="Semana anterior"><ChevronLeft className="size-4" /></Link>
            <Link href="/historias" className="rounded-md border px-3 py-2 text-xs font-medium">Esta semana</Link>
            <Link href={`/historias?semana=${sumarDias(semana, 7)}`} className="rounded-md border p-2" aria-label="Semana siguiente"><ChevronRight className="size-4" /></Link>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {TIPOS_HISTORIA.map((t) => <span key={t} className="inline-flex items-center gap-1.5 font-semibold text-foreground"><i className={cn("size-2 rounded-[2px]", TONO_TIPO_HISTORIA[t])} />{NOMBRE_TIPO_HISTORIA[t]}</span>)}
        <span>· el tipo dice qué busca la historia; el registro (orgánico o producido) dice si Mariela diseña un asset</span>
      </div>

      {bloques.map((b) => {
        const del = conFecha.filter((h) => b.dias.includes(h.dia ?? 0));
        const esHoy = diaHoy != null && b.dias.includes(diaHoy);
        const vacio = del.length === 0;
        const pub = del.filter((h) => h.estado === "publicada").length;
        return (
          <section key={b.clave} className={cn("rounded-xl border", esHoy && "border-foreground", vacio && "border-dashed")}>
            <div className={cn("flex flex-wrap items-center justify-between gap-2 px-3.5 py-2", !vacio && "border-b bg-muted/40")}>
              <h2 className="text-sm font-bold">{b.nombre} <span className="font-medium text-muted-foreground">{b.fecha}</span>{esHoy && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">hoy</span>}</h2>
              {vacio
                ? <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{b.laboral ? "Sin historia" : "Fin de semana · sin historia"}{esOwner && b.laboral && <><TomarDelBuffer semana={semana} dia={b.dias[0]} buffer={bufferCorto} /><NuevaHistoria semana={semana} dia={b.dias[0]} recursos={opcionesRecursos} piezas={opcionesPiezas} variante="enlace" /></>}</span>
                : <span className="text-xs text-muted-foreground">{del.length} {del.length === 1 ? "historia" : "historias"}{pub > 0 && ` · ${pub} ${pub === 1 ? "publicada" : "publicadas"}`}</span>}
            </div>
            {!vacio && (
              <div className="divide-y">
                {del.map((h) => esHoy
                  ? <TarjetaHistoria key={h.id} historia={h} rol={rol} recursos={opcionesRecursos} piezas={opcionesPiezas} semanaVista={semana} />
                  : <FilaHistoria key={h.id} historia={h} rol={rol} recursos={opcionesRecursos} piezas={opcionesPiezas} semanaVista={semana} />)}
              </div>
            )}
          </section>
        );
      })}

      {esOwner && (
        <section className="rounded-xl border border-dashed">
          <div className={cn("flex flex-wrap items-center justify-between gap-2 px-3.5 py-2", buffer.length > 0 && "border-b")}>
            <h2 className="text-sm font-bold">Buffer <span className="font-medium text-muted-foreground">sin fecha</span></h2>
            <span className="text-xs text-muted-foreground">{buffer.length === 0 ? "Vacío. Las historias sin día caen aquí: frases, preguntas, la siguiente captura." : `${buffer.length} ${buffer.length === 1 ? "historia lista" : "historias listas"} para agendar · se aprueban al tomar día`}</span>
          </div>
          {buffer.length > 0 && <div className="divide-y">{buffer.map((h) => <FilaHistoria key={h.id} historia={h} rol={rol} recursos={opcionesRecursos} piezas={opcionesPiezas} semanaVista={semana} />)}</div>}
        </section>
      )}

      <p className="text-xs text-muted-foreground">Hoy se abre con el copy completo, el asset y los botones; los demás días son una fila por historia. Agendar una del buffer la aprueba y la manda a la cola de Mariela.</p>
    </div>
  );
}
