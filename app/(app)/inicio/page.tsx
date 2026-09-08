import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, hoyISO, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_META, resumenSistema, type NodoEstado } from "@/lib/dominio/nodo";
import { ChipBuffer, IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { BotonAprobarHistorias } from "@/components/hoy/aprobar-historias";
import { Captura } from "@/components/pieza/captura";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

type Slot = { id?: string; id_publico?: string; titulo?: string | null; estado?: string; responsable?: string | null; dia?: number };

export default async function Inicio() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const semana = lunesDeHoy();
  const hoy = hoyISO();

  const [{ data: propuestas }, { data: bloqueadas }, { data: grabar }, { count: buffer }, { data: cuota }, { data: latidos }, { data: sistemas }, { data: editores }] = await Promise.all([
    supabase.from("historias").select("id, dia, serie, copy").eq("semana", semana).eq("estado", "propuesta").order("dia"),
    supabase.from("tareas").select("id, tipo, nota_bloqueo, vence, pieza:piezas(id, id_publico, titulo), asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("estado", "bloqueada").order("vence"),
    supabase.from("tareas").select("id, vence, pieza:piezas(id, id_publico, titulo, formato)").eq("tipo", "grabar").neq("estado", "hecha").order("vence"),
    supabase.from("piezas").select("id", { count: "exact", head: true }).eq("estado", "buffer"),
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.rpc("latidos"),
    supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
    supabase.from("perfiles").select("user_id, nombre").eq("rol", "editor").order("nombre"),
  ]);
  const ayer = sumarDias(hoy, -1);
  const equipo = await Promise.all((editores ?? []).map(async (e) => {
    const [{ count: hoyN }, { count: ayerN }, { data: ev }] = await Promise.all([
      supabase.from("bitacora").select("id", { count: "exact", head: true }).eq("perfil_id", e.user_id).eq("fecha", hoy),
      supabase.from("bitacora").select("id", { count: "exact", head: true }).eq("perfil_id", e.user_id).eq("fecha", ayer),
      supabase.rpc("evidencia_dia", { p_perfil: e.user_id, p_fecha: hoy }),
    ]);
    const evj = (ev ?? {}) as { tareas_hechas?: unknown[]; archivos?: unknown[] };
    return { ...e, hoy: hoyN ?? 0, ayer: ayerN ?? 0, tareas: evj.tareas_hechas?.length ?? 0, archivos: evj.archivos?.length ?? 0 };
  }));
  const estados = await Promise.all((sistemas ?? []).map(async (x) => {
    const { data } = await supabase.rpc("estado_nodos", { p_clave: x.clave, p_semana: semana });
    return { ...x, nodos: (data ?? []) as NodoEstado[] };
  }));
  const atrasados = (latidos ?? []).filter((l) => l.atrasado).length;

  const orden = ["newsletter", "reel", "carrusel", "historia_dia"];
  const filas = (cuota ?? []).sort((a, b) => orden.indexOf(a.formato) - orden.indexOf(b.formato));
  const meta = filas.reduce((a, f) => a + f.meta, 0);
  const pub = filas.reduce((a, f) => a + f.publicadas, 0);
  const camino = filas.reduce((a, f) => a + f.en_camino, 0);
  const huecos = Math.max(0, meta - pub - camino);
  const pendientes = (propuestas ?? []).length + (bloqueadas ?? []).length;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fechaCorta(hoy)} · semana del {fechaCorta(semana)}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {pendientes === 0 ? "Nada espera tu mano." : `${pendientes} ${pendientes === 1 ? "cosa espera" : "cosas esperan"} tu mano.`}
            </h1>
          </div>
          <ChipBuffer n={buffer ?? 0} />
        </div>
        <Captura />
      </header>

      {/* Lo que espera tu mano */}
      {(propuestas ?? []).length > 0 && (
        <Bloque titulo="Aprobar" acento>
          <ul className="divide-y rounded-lg border text-sm">
            {propuestas!.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">{DIAS_SEMANA[h.dia - 1]}</span>
                <span className="truncate"><span className="font-medium">{h.serie.replace(/_/g, " ")}</span>{h.copy && <span className="text-muted-foreground"> · {h.copy.slice(0, 80)}</span>}</span>
              </li>
            ))}
          </ul>
          <BotonAprobarHistorias semana={semana} n={propuestas!.length} />
        </Bloque>
      )}

      {(bloqueadas ?? []).length > 0 && (
        <Bloque titulo="Bloqueos" rojo>
          <ul className="divide-y rounded-lg border border-rojo/40 text-sm">
            {bloqueadas!.map((t) => (
              <li key={t.id} className="space-y-0.5 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {t.pieza && <IdPublico id={t.pieza.id_publico} />}
                  <Link href={t.pieza ? `/piezas/${t.pieza.id}` : "/cola"} className="font-medium hover:underline">{t.pieza?.titulo ?? t.tipo}</Link>
                  <span className="text-xs text-muted-foreground">{t.asignado?.nombre} · {t.tipo} · vence {fechaCorta(t.vence)}</span>
                </div>
                <p className="text-sm text-rojo">{t.nota_bloqueo}</p>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {equipo.length > 0 && (
        <Bloque titulo="Equipo" extra={<Link href="/equipo" className="underline">ver la semana</Link>}>
          <ul className="divide-y rounded-lg border text-sm">
            {equipo.map((e) => {
              const esLaboral = new Date(hoy + "T12:00:00").getDay() % 6 !== 0;
              return (
                <li key={e.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <Link href={`/equipo?persona=${e.user_id}`} className="font-medium hover:underline">{e.nombre}</Link>
                  <span className="flex items-center gap-3 text-xs">
                    <span className={cn(e.hoy === 0 && esLaboral ? "font-semibold text-ambar" : "text-muted-foreground")}>hoy: {e.hoy === 0 ? "sin bitácora" : `${e.hoy} entradas`}</span>
                    <span className={cn(e.ayer === 0 ? "text-rojo" : "text-muted-foreground")}>ayer: {e.ayer === 0 ? "sin bitácora" : `${e.ayer} entradas`}</span>
                    <span className="text-muted-foreground">{e.tareas} tareas · {e.archivos} archivos hoy</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Bloque>
      )}

      <Bloque titulo="Te toca grabar">
        {(grabar ?? []).length === 0 ? <Vacio texto="Nada pendiente de grabar." /> : (
          <ul className="divide-y rounded-lg border text-sm">
            {grabar!.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link href={`/piezas/${t.pieza!.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <IdPublico id={t.pieza!.id_publico} /><span className="truncate font-medium">{t.pieza!.titulo ?? "(sin título)"}</span>
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {t.pieza!.formato && <InsigniaFormato formato={t.pieza!.formato} />}
                  <span className={cn(t.vence && t.vence < hoy && "text-rojo")}>vence {fechaCorta(t.vence)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* Semana */}
      <Bloque titulo={`La semana · ${pub}/${meta} publicadas`} extra={huecos > 0 ? <span className="text-rojo">{huecos} huecos sin nada que los llene</span> : <span className="text-muted-foreground">{camino} en camino</span>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filas.map((f) => {
            const slots = (f.piezas as Slot[]) ?? [];
            const llenos = f.formato === "historia_dia" ? new Set(slots.map((x) => x.dia)).size : slots.length;
            const vacios = Math.max(0, f.meta - llenos);
            return (
              <div key={f.formato} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{NOMBRE_META[f.formato] ?? f.formato}</p>
                  <p className="text-sm"><span className={cn("text-xl font-extrabold", f.publicadas >= f.meta && "text-ok")}>{f.publicadas}</span><span className="text-muted-foreground"> / {f.meta}</span></p>
                </div>
                <ul className="space-y-1 text-xs">
                  {f.formato === "historia_dia"
                    ? Array.from(new Set(slots.map((x) => x.dia!))).sort().map((d) => (
                        <li key={d} className="truncate rounded bg-muted/60 px-2 py-1"><Link href={`/historias?semana=${semana}`} className="hover:underline">{DIAS_SEMANA[d - 1]}</Link> · {slots.filter((x) => x.dia === d).length}</li>
                      ))
                    : slots.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-1 rounded bg-muted/60 px-2 py-1">
                          <Link href={`/piezas/${p.id}`} className="truncate hover:underline">{p.titulo ?? p.id_publico}</Link>
                          <InsigniaEstado estado={p.estado!} />
                        </li>
                      ))}
                  {Array.from({ length: vacios }).map((_, i) => (
                    <li key={`v${i}`} className="rounded border border-dashed border-rojo/50 px-2 py-1 text-rojo">Hueco</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Bloque>

      {/* Sistemas */}
      <Bloque titulo="La máquina" extra={atrasados > 0 ? <Link href="/sistemas" className="text-rojo underline">{atrasados} latidos atrasados</Link> : undefined}>
        <ul className="divide-y rounded-lg border text-sm">
          {estados.map((sx) => {
            const r = resumenSistema(sx.nodos);
            return (
              <li key={sx.clave}>
                <Link href={`/sistemas?sistema=${sx.clave}`} className="flex items-center gap-4 px-3 py-2.5 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate font-medium">{sx.nombre}</span>
                  <span className="flex h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                    {r.corrio > 0 && <span className="bg-ok" style={{ width: `${(r.corrio / r.total) * 100}%` }} />}
                    {r.hueco > 0 && <span className="bg-muted-foreground" style={{ width: `${(r.hueco / r.total) * 100}%` }} />}
                    {r.agendado > 0 && <span className="bg-ambar" style={{ width: `${(r.agendado / r.total) * 100}%` }} />}
                    {r.sin_sistema > 0 && <span className="bg-rojo" style={{ width: `${(r.sin_sistema / r.total) * 100}%` }} />}
                  </span>
                  <span className="w-40 shrink-0 text-right text-xs text-muted-foreground">
                    <span className="text-ok">{r.corrio}</span> · <span className="text-ambar">{r.agendado}</span> · <span className="text-rojo">{r.sin_sistema}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Bloque>
    </div>
  );
}

function Bloque({ titulo, children, acento, rojo, extra }: { titulo: string; children: React.ReactNode; acento?: boolean; rojo?: boolean; extra?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={cn("text-xs font-bold uppercase tracking-wider", acento ? "text-primary" : rojo ? "text-rojo" : "text-muted-foreground")}>{titulo}</h2>
        {extra && <span className="text-xs">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">{texto}</p>;
}
