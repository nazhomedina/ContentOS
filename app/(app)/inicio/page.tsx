import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, hoyISO, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_META, resumenSistema, type NodoEstado } from "@/lib/dominio/nodo";
import { semaforoBuffer, CLASE_SEMAFORO } from "@/lib/dominio/buffer";
import { IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { BotonAprobarHistorias } from "@/components/hoy/aprobar-historias";
import { Captura } from "@/components/pieza/captura";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

type Slot = { id?: string; id_publico?: string; titulo?: string | null; estado?: string; dia?: number };

export default async function Inicio() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const semana = lunesDeHoy();
  const hoy = hoyISO();
  const ayer = sumarDias(hoy, -1);

  const [{ data: propuestas }, { data: bloqueadas }, { data: grabar }, { data: buffer }, { data: cuota }, { data: latidos }, { data: sistemas }, { data: editores }, { data: ind }] = await Promise.all([
    supabase.from("historias").select("id, dia, serie, copy").eq("semana", semana).eq("estado", "propuesta").order("dia"),
    supabase.from("tareas").select("id, tipo, nota_bloqueo, vence, pieza:piezas(id, id_publico, titulo), asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("estado", "bloqueada").order("vence"),
    supabase.from("tareas").select("id, vence, pieza:piezas(id, id_publico, titulo, formato)").eq("tipo", "grabar").neq("estado", "hecha").order("vence"),
    supabase.from("piezas").select("id, id_publico, titulo, formato, estado, fecha_objetivo").in("estado", ["listo", "programada"]).order("fecha_objetivo", { ascending: true, nullsFirst: false }),
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.rpc("latidos"),
    supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
    supabase.from("perfiles").select("user_id, nombre").eq("rol", "editor").order("nombre"),
    supabase.from("indicadores_semana").select("*").order("semana", { ascending: false }).limit(1).maybeSingle(),
  ]);
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
  const meta = filas.reduce((a, f) => a + f.meta, 0), pub = filas.reduce((a, f) => a + f.publicadas, 0), camino = filas.reduce((a, f) => a + f.en_camino, 0);
  const huecos = Math.max(0, meta - pub - camino);
  const nBuffer = (buffer ?? []).length;
  const sem = semaforoBuffer(nBuffer);
  const pendientes = (propuestas ?? []).length + (bloqueadas ?? []).length;
  const esLaboral = new Date(hoy + "T12:00:00").getDay() % 6 !== 0;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fechaCorta(hoy)} · semana del {fechaCorta(semana)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{pendientes === 0 ? "Nada espera tu mano." : `${pendientes} ${pendientes === 1 ? "cosa espera" : "cosas esperan"} tu mano.`}</h1>
        </div>
        <Captura />
      </header>

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

      {/* 1 · Crecimiento de cuenta */}
      <Bloque titulo="Crecimiento de cuenta" extra={<span className="text-muted-foreground">un dato sin fecha miente</span>}>
        <div className="grid grid-cols-3 gap-3">
          <Kpi etiqueta="Seguidores @nazho" valor={ind?.seguidores} corte={ind?.seguidores_corte} fuente="snapshot" />
          <Kpi etiqueta="Suscriptores CRITERIO" valor={ind?.suscriptores} corte={ind?.suscriptores_corte} fuente="Kit" />
          <Kpi etiqueta="Leads" valor={ind?.leads} corte={ind?.leads_corte} fuente="go.folklore" />
        </div>
      </Bloque>

      {/* 2 · Metas de la semana */}
      <Bloque titulo={`Metas de la semana · ${pub}/${meta} publicadas`} extra={huecos > 0 ? <span className="text-rojo">{huecos} huecos sin nada que los llene</span> : <span className="text-muted-foreground">{camino} en camino</span>}>
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
                    ? Array.from(new Set(slots.map((x) => x.dia!))).sort().map((d) => <li key={d} className="truncate rounded bg-muted/60 px-2 py-1"><Link href={`/historias?semana=${semana}`} className="hover:underline">{DIAS_SEMANA[d - 1]}</Link> · {slots.filter((x) => x.dia === d).length}</li>)
                    : slots.map((p) => <li key={p.id} className="flex items-center justify-between gap-1 rounded bg-muted/60 px-2 py-1"><Link href={`/piezas/${p.id}`} className="truncate hover:underline">{p.titulo ?? p.id_publico}</Link><InsigniaEstado estado={p.estado!} /></li>)}
                  {Array.from({ length: vacios }).map((_, i) => <li key={`v${i}`} className="rounded border border-dashed border-rojo/50 px-2 py-1 text-rojo">Hueco</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </Bloque>

      {/* 3 · Buffer */}
      <Bloque titulo="Buffer de contenidos" extra={<span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CLASE_SEMAFORO[sem])}>{nBuffer} {nBuffer === 1 ? "lista" : "listas"} · {sem === "ok" ? "sano" : sem === "ambar" ? "atención" : "vacío"}</span>}>
        {nBuffer === 0 ? <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">Nada terminado esperando publicación. Sano es ≥ 5.</p> : (
          <ul className="divide-y rounded-lg border text-sm">
            {buffer!.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-center gap-2 hover:underline"><IdPublico id={p.id_publico} /><span className="truncate font-medium">{p.titulo}</span></Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{p.formato && <InsigniaFormato formato={p.formato} />}<InsigniaEstado estado={p.estado} />{p.fecha_objetivo && fechaCorta(p.fecha_objetivo)}</span>
              </li>
            ))}
          </ul>
        )}
        {(grabar ?? []).length > 0 && (
          <p className="text-xs text-muted-foreground">Te toca grabar: {grabar!.map((t) => <Link key={t.id} href={`/piezas/${t.pieza!.id}`} className="mr-2 underline">{t.pieza!.id_publico}</Link>)}</p>
        )}
      </Bloque>

      {/* 4 · Cierre del día */}
      <Bloque titulo="Cierre del día" extra={<Link href="/equipo" className="underline">ver la semana del equipo</Link>}>
        {equipo.length === 0 ? <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">Cuando Mariela entre, aquí aparece su bitácora de hoy y de ayer.</p> : (
          <ul className="divide-y rounded-lg border text-sm">
            {equipo.map((e) => (
              <li key={e.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <Link href={`/equipo?persona=${e.user_id}`} className="font-medium hover:underline">{e.nombre}</Link>
                <span className="flex items-center gap-3 text-xs">
                  <span className={cn(e.hoy === 0 && esLaboral ? "font-semibold text-ambar" : "text-muted-foreground")}>hoy: {e.hoy === 0 ? "sin bitácora" : `${e.hoy} entradas`}</span>
                  <span className={cn(e.ayer === 0 ? "text-rojo" : "text-muted-foreground")}>ayer: {e.ayer === 0 ? "sin bitácora" : `${e.ayer} entradas`}</span>
                  <span className="text-muted-foreground">{e.tareas} tareas · {e.archivos} archivos hoy</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <ul className="divide-y rounded-lg border text-sm">
          {estados.map((sx) => {
            const r = resumenSistema(sx.nodos);
            return (
              <li key={sx.clave}>
                <Link href={`/sistemas?sistema=${sx.clave}`} className="flex items-center gap-4 px-3 py-2 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{sx.nombre}</span>
                  <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    {r.corrio > 0 && <span className="bg-ok" style={{ width: `${(r.corrio / r.total) * 100}%` }} />}
                    {r.hueco > 0 && <span className="bg-muted-foreground" style={{ width: `${(r.hueco / r.total) * 100}%` }} />}
                    {r.agendado > 0 && <span className="bg-ambar" style={{ width: `${(r.agendado / r.total) * 100}%` }} />}
                    {r.sin_sistema > 0 && <span className="bg-rojo" style={{ width: `${(r.sin_sistema / r.total) * 100}%` }} />}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="px-3 py-1.5 text-[11px] text-muted-foreground">La máquina · {atrasados > 0 ? <span className="text-rojo">{atrasados} latidos atrasados</span> : "latidos al día"} · <Link href="/sistemas" className="underline">sistemas</Link></li>
        </ul>
      </Bloque>
    </div>
  );
}

function Bloque({ titulo, children, acento, rojo, extra }: { titulo: string; children: React.ReactNode; acento?: boolean; rojo?: boolean; extra?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn("text-xs font-bold uppercase tracking-wider", acento ? "text-primary" : rojo ? "text-rojo" : "text-muted-foreground")}>{titulo}</h2>
        {extra && <span className="text-xs">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ etiqueta, valor, corte, fuente }: { etiqueta: string; valor: number | null | undefined; corte: string | null | undefined; fuente: string }) {
  const sin = valor == null;
  return (
    <div className={cn("rounded-xl border p-3", sin && "border-dashed")}>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={cn("text-2xl font-extrabold tabular-nums", sin && "text-muted-foreground/50")}>{sin ? "—" : valor.toLocaleString("es-MX")}</p>
      <p className="text-[11px] text-muted-foreground">{sin ? <span className="text-rojo">sin sensor</span> : `${fuente} · corte ${corte ? fechaCorta(corte) : "?"}`}</p>
    </div>
  );
}
