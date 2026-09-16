import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { bucketVencimiento, sumarDias, hoyISO } from "@/lib/dominio/tiempo";
import { NOMBRE_ESTADO, type EstadoPieza } from "@/lib/dominio/estados";
import { ChipBuffer, IdPublico, InsigniaEstado, InsigniaTipo } from "@/components/app/insignias";
import { FilaTarea, type TareaEnCola } from "@/components/cola/fila-tarea";
import { TuDia, type Declaracion } from "@/components/bitacora/tu-dia";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mi cola" };
export const dynamic = "force-dynamic";

const FILTROS = [
  { clave: "", etiqueta: "Todo" },
  { clave: "reels", etiqueta: "Reels" },
  { clave: "carruseles", etiqueta: "Carruseles" },
  { clave: "historias", etiqueta: "Historias" },
];

/**
 * La pantalla de Mariela, pensada para escritorio: a la izquierda la cola por urgencia con el
 * siguiente paso de cada tarea; a la derecha su bitácora del día y las piezas que tiene en manos.
 */
export default async function MiCola({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { f = "" } = await searchParams;
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  const hoyStr = hoyISO();
  const [{ data: tareas }, { count: buffer }, { data: declaraciones }, { data: enManos }] = await Promise.all([
    supabase
      .from("tareas")
      .select("id, tipo, estado, vence, nota_bloqueo, hecha_en, asignado_a, pieza:piezas(id, id_publico, titulo, tipo, estado, series), historia:historias(id, serie, dia, semana, copy), asignado:perfiles!tareas_asignado_a_fkey(nombre)")
      .order("vence", { ascending: true, nullsFirst: false }),
    supabase.from("piezas").select("id", { count: "exact", head: true }).in("estado", ["listo", "programada"]),
    esOwner ? Promise.resolve({ data: [] }) : supabase.from("bitacora").select("id, texto, minutos, evidencia_url, created_at, pieza:piezas(id, id_publico, titulo)").eq("perfil_id", sesion.userId).eq("fecha", hoyStr).order("created_at"),
    supabase.from("piezas").select("id, id_publico, titulo, tipo, estado, series, fecha_objetivo").in("estado", ["grabacion", "diseno", "listo", "programada"]).order("fecha_objetivo", { ascending: true, nullsFirst: false }).limit(80),
  ]);

  const hace7 = sumarDias(hoyISO(), -7);
  const todas = (tareas ?? []) as unknown as TareaEnCola[];
  const filtradas = todas.filter((t) => {
    if (f === "reels") return t.pieza && ["reel", "yap", "youtube"].includes(t.pieza.tipo);
    if (f === "carruseles") return t.pieza?.tipo === "carrusel";
    if (f === "historias") return !!t.historia || t.pieza?.tipo === "historia";
    return true;
  });

  const hoy: TareaEnCola[] = [], semana: TareaEnCola[] = [], despues: TareaEnCola[] = [], bloqueadas: TareaEnCola[] = [], hechas: TareaEnCola[] = [];
  for (const t of filtradas) {
    if (t.estado === "hecha") { if ((t.hecha_en ?? "") >= hace7) hechas.push(t); continue; }
    if (t.estado === "bloqueada") { bloqueadas.push(t); continue; }
    const b = bucketVencimiento(t.vence);
    if (b === "vencida" || b === "hoy") hoy.push(t);
    else if (b === "semana") semana.push(t);
    else despues.push(t);
  }
  const enCurso = todas.filter((t) => t.estado === "en_curso");

  // Piezas en manos: las que tienen tarea abierta mía, o en las etapas que ejecuta el equipo.
  const conTareaMia = new Set(todas.filter((t) => t.estado !== "hecha" && (esOwner || t.asignado_a === sesion.userId) && t.pieza).map((t) => t.pieza!.id));
  const piezas = (enManos ?? []);
  const porEstado = (["grabacion", "diseno", "listo", "programada"] as EstadoPieza[]).map((e) => ({ estado: e, piezas: piezas.filter((p) => p.estado === e) })).filter((g) => g.piezas.length > 0);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{esOwner ? "Cola del equipo" : "Mi cola"}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{hoy.length} para hoy</span>
              <span className="text-muted-foreground">·</span>
              <span className={cn("font-semibold", enCurso.length > 0 ? "text-primary" : "text-muted-foreground")}>{enCurso.length} en curso</span>
              <span className="text-muted-foreground">·</span>
              <span className={cn("font-semibold", bloqueadas.length > 0 && "text-rojo")}>{bloqueadas.length} bloqueadas</span>
              <span className="text-muted-foreground">·</span>
              <ChipBuffer n={buffer ?? 0} />
            </p>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {FILTROS.map((x) => (
              <Link
                key={x.clave}
                href={x.clave ? `/cola?f=${x.clave}` : "/cola"}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                  f === x.clave ? "border-secondary bg-secondary text-secondary-foreground" : "text-muted-foreground",
                )}
              >
                {x.etiqueta}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Grupo titulo="Hoy" tareas={hoy} vacio="Nada para hoy." mostrarAsignado={esOwner} />
          <Grupo titulo="Esta semana" tareas={semana} vacio="Nada más esta semana." mostrarAsignado={esOwner} />
          {despues.length > 0 && <Grupo titulo="Después" tareas={despues} vacio="" mostrarAsignado={esOwner} />}
          <Grupo titulo="Bloqueadas" tareas={bloqueadas} vacio="Ninguna bloqueada." mostrarAsignado={esOwner} rojo />
          <Grupo titulo="Hechas (7 días)" tareas={hechas} vacio="Nada cerrado en la semana." mostrarAsignado={esOwner} />
        </div>

        <aside className="space-y-4 xl:order-none order-first">
          {!esOwner && (
            <TuDia userId={sesion.userId} hoy={hoyStr} declaraciones={(declaraciones ?? []) as unknown as Declaracion[]} piezas={piezas.map((p) => ({ id: p.id, id_publico: p.id_publico, titulo: p.titulo }))} />
          )}
          <section className="space-y-3 rounded-xl border p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">{esOwner ? "En producción" : "Piezas en tus manos"}</h2>
              <span className="text-xs text-muted-foreground">{piezas.length}</span>
            </div>
            {porEstado.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nada en grabación, diseño o buffer.</p>
            ) : porEstado.map((g) => (
              <div key={g.estado} className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{NOMBRE_ESTADO[g.estado]} · {g.piezas.length}</p>
                <ul className="space-y-1">
                  {g.piezas.slice(0, 12).map((p) => (
                    <li key={p.id}>
                      <Link href={`/piezas/${p.id}`} className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted", conTareaMia.has(p.id) && "font-semibold")}>
                        <IdPublico id={p.id_publico} />
                        <span className="min-w-0 flex-1 truncate">{p.titulo ?? "(sin título)"}</span>
                        <InsigniaTipo tipo={p.tipo ?? "reel"} />
                      </Link>
                    </li>
                  ))}
                  {g.piezas.length > 12 && <li className="px-2 text-[11px] text-muted-foreground">y {g.piezas.length - 12} más en <Link href="/reels" className="underline">Reels</Link> y <Link href="/carruseles" className="underline">Carruseles</Link></li>}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">En negritas, las que tienen una tarea tuya abierta. <InsigniaEstado estado="listo" /> es el buffer.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Grupo({ titulo, tareas, vacio, mostrarAsignado, rojo }: { titulo: string; tareas: TareaEnCola[]; vacio: string; mostrarAsignado: boolean; rojo?: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className={cn("text-xs font-bold uppercase tracking-wider", rojo && tareas.length > 0 ? "text-rojo" : "text-muted-foreground")}>
        {titulo} <span className="font-medium">· {tareas.length}</span>
      </h2>
      {tareas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          <li className="hidden grid-cols-[minmax(0,1fr)_11rem_7rem_auto] gap-4 bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Pieza</span><span>Tarea</span><span>Vence</span><span className="w-40" />
          </li>
          {tareas.map((t) => <FilaTarea key={t.id} tarea={t} mostrarAsignado={mostrarAsignado} />)}
        </ul>
      )}
    </section>
  );
}
