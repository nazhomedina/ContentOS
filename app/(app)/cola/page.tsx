import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { bucketVencimiento, sumarDias, hoyISO } from "@/lib/dominio/tiempo";
import { ChipBuffer } from "@/components/app/insignias";
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

export default async function MiCola({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { f = "" } = await searchParams;
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  const hoyStr = hoyISO();
  const [{ data: tareas }, { count: buffer }, { data: declaraciones }, { data: misPiezas }] = await Promise.all([
    supabase
      .from("tareas")
      .select("id, tipo, estado, vence, checklist, nota_bloqueo, hecha_en, asignado_a, pieza:piezas(id, id_publico, titulo, formato, estado), historia:historias(id, serie, dia, semana, copy), asignado:perfiles!tareas_asignado_a_fkey(nombre)")
      .order("vence", { ascending: true, nullsFirst: false }),
    supabase.from("piezas").select("id", { count: "exact", head: true }).in("estado", ["listo", "programada"]),
    esOwner ? Promise.resolve({ data: [] }) : supabase.from("bitacora").select("id, texto, minutos, evidencia_url, created_at, pieza:piezas(id, id_publico, titulo)").eq("perfil_id", sesion.userId).eq("fecha", hoyStr).order("created_at"),
    esOwner ? Promise.resolve({ data: [] }) : supabase.from("piezas").select("id, id_publico, titulo").in("estado", ["grabacion", "diseno", "listo", "programada"]).order("updated_at", { ascending: false }).limit(50),
  ]);

  const hace7 = sumarDias(hoyISO(), -7);
  const todas = (tareas ?? []) as unknown as TareaEnCola[];
  const filtradas = todas.filter((t) => {
    if (f === "reels") return t.pieza && ["reel", "yap"].includes(t.pieza.formato);
    if (f === "carruseles") return t.pieza?.formato === "carrusel";
    if (f === "historias") return !!t.historia || t.pieza?.formato === "historia";
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

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{esOwner ? "Cola del equipo" : "Mi cola"}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{hoy.length} para hoy</span>
          <span className="text-muted-foreground">·</span>
          <span className={cn("font-semibold", bloqueadas.length > 0 && "text-rojo")}>{bloqueadas.length} bloqueadas</span>
          <span className="text-muted-foreground">·</span>
          <ChipBuffer n={buffer ?? 0} />
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
      </header>

      {!esOwner && (
        <TuDia userId={sesion.userId} hoy={hoyStr} declaraciones={(declaraciones ?? []) as unknown as Declaracion[]} piezas={misPiezas ?? []} />
      )}

      <Grupo titulo="Hoy" tareas={hoy} vacio="Nada para hoy." mostrarAsignado={esOwner} />
      <Grupo titulo="Esta semana" tareas={semana} vacio="Nada más esta semana." mostrarAsignado={esOwner} />
      {despues.length > 0 && <Grupo titulo="Después" tareas={despues} vacio="" mostrarAsignado={esOwner} />}
      <Grupo titulo="Bloqueadas" tareas={bloqueadas} vacio="Ninguna bloqueada." mostrarAsignado={esOwner} rojo />
      <Grupo titulo="Hechas (7 días)" tareas={hechas} vacio="Nada cerrado en la semana." mostrarAsignado={esOwner} />
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
          {tareas.map((t) => <FilaTarea key={t.id} tarea={t} mostrarAsignado={mostrarAsignado} />)}
        </ul>
      )}
    </section>
  );
}
