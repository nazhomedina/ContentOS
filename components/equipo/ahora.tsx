import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { NOMBRE_TAREA, type TipoTarea } from "@/lib/dominio/estados";
import { NOMBRE_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { bucketVencimiento, fechaCorta, fechaHora, hoyISO, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { IdPublico } from "@/components/app/insignias";
import { cn } from "@/lib/utils";

type TareaAbierta = {
  id: string; tipo: string; estado: string; vence: string | null; nota_bloqueo: string | null;
  pieza: { id: string; id_publico: string | null; titulo: string | null; estado: string } | null;
  historia: { id: string; dia: number | null; tipo: string; semana: string | null } | null;
};

const nombreTarea = (t: string) => NOMBRE_TAREA[t as TipoTarea] ?? t;

/**
 * En qué está una persona ahora, sin abrir nada más: la tarea en curso (o el último archivo que subió),
 * lo que sigue en su cola y cuántas trae abiertas o bloqueadas. Lo usan Inicio (por editor) y Equipo.
 */
export async function AhoraPersona({ perfilId, amplio = false }: { perfilId: string; amplio?: boolean }) {
  const supabase = await crearClienteServidor();
  const hoy = hoyISO();
  const [{ data: tareas }, { data: archivo }] = await Promise.all([
    supabase.from("tareas")
      .select("id, tipo, estado, vence, nota_bloqueo, pieza:piezas(id, id_publico, titulo, estado), historia:historias(id, dia, tipo, semana)")
      .eq("asignado_a", perfilId).neq("estado", "hecha").order("vence", { ascending: true, nullsFirst: false }).limit(30),
    supabase.from("assets").select("nombre, carpeta, created_at, pieza:piezas(id, id_publico, titulo)").eq("subido_por", perfilId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const abiertas = (tareas ?? []) as unknown as TareaAbierta[];
  const enCurso = abiertas.find((t) => t.estado === "en_curso") ?? null;
  const bloqueadas = abiertas.filter((t) => t.estado === "bloqueada");
  const vencidas = abiertas.filter((t) => t.estado !== "bloqueada" && bucketVencimiento(t.vence) === "vencida");
  const siguiente = abiertas.find((t) => t.id !== enCurso?.id && t.estado !== "bloqueada") ?? null;
  const archivoHoy = archivo && archivo.created_at.slice(0, 10) === hoy ? archivo : null;

  const Objetivo = ({ t }: { t: TareaAbierta }) => (
    <>
      <span className="font-medium">{nombreTarea(t.tipo)}</span>
      {t.pieza && <> · <Link href={`/piezas/${t.pieza.id}`} className="hover:underline"><IdPublico id={t.pieza.id_publico} /> {t.pieza.titulo ?? "(sin título)"}</Link></>}
      {t.historia && <> · <Link href={t.historia.semana ? `/historias?semana=${t.historia.semana}` : "/historias"} className="hover:underline">historia {t.historia.dia ? `del ${DIAS_SEMANA[t.historia.dia - 1].toLowerCase()}` : "sin fecha"} · {NOMBRE_TIPO_HISTORIA[t.historia.tipo] ?? t.historia.tipo}</Link></>}
      {t.vence && <span className={cn("text-xs", bucketVencimiento(t.vence) === "vencida" ? "text-rojo" : "text-muted-foreground")}> · vence {fechaCorta(t.vence)}</span>}
    </>
  );

  return (
    <div className={cn("space-y-1 text-sm", amplio && "rounded-xl border px-4 py-3")}>
      <p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ahora </span>
        {enCurso ? <Objetivo t={enCurso} />
          : archivoHoy ? <>subió <span className="font-medium">{archivoHoy.nombre}</span>{archivoHoy.pieza && <> a <Link href={`/piezas/${archivoHoy.pieza.id}`} className="hover:underline"><IdPublico id={archivoHoy.pieza.id_publico} /> {archivoHoy.pieza.titulo}</Link></>} <span className="text-xs text-muted-foreground">· {fechaHora(archivoHoy.created_at).split(",")[1]}</span></>
          : <span className="text-muted-foreground">sin tarea en curso{abiertas.length > 0 && " · no ha tomado ninguna"}</span>}
      </p>
      <p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sigue </span>
        {siguiente ? <Objetivo t={siguiente} /> : <span className="text-muted-foreground">{abiertas.length === 0 ? "nada asignado" : "nada más después de esto"}</span>}
      </p>
      <p className="text-xs text-muted-foreground">
        {abiertas.length} {abiertas.length === 1 ? "tarea abierta" : "tareas abiertas"}
        {vencidas.length > 0 && <> · <span className="font-semibold text-rojo">{vencidas.length} vencidas</span></>}
        {bloqueadas.length > 0 && <> · <span className="font-semibold text-rojo">{bloqueadas.length} bloqueadas{amplio && bloqueadas[0]?.nota_bloqueo ? `: ${bloqueadas[0].nota_bloqueo}` : ""}</span></>}
        {archivo && !archivoHoy && <> · último archivo {fechaCorta(archivo.created_at.slice(0, 10))}</>}
      </p>
    </div>
  );
}
