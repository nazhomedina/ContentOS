import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, hoyISO, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_META, type NodoEstado } from "@/lib/dominio/nodo";
import { ChipBuffer, IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { BotonAprobarHistorias } from "@/components/hoy/aprobar-historias";
import { cn } from "@/lib/utils";

export const metadata = { title: "Hoy" };
export const dynamic = "force-dynamic";

export default async function Hoy() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const semana = lunesDeHoy();
  const hoy = hoyISO();

  const [
    { data: propuestas },
    { data: bloqueadas },
    { data: grabar },
    { count: buffer },
    { data: cuota },
    { data: latidos },
    { data: sistemas },
  ] = await Promise.all([
    supabase.from("historias").select("id, dia, serie, copy").eq("semana", semana).eq("estado", "propuesta").order("dia"),
    supabase.from("tareas").select("id, tipo, nota_bloqueo, vence, pieza:piezas(id, id_publico, titulo, formato), asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("estado", "bloqueada").order("vence"),
    supabase.from("tareas").select("id, vence, estado, pieza:piezas(id, id_publico, titulo, formato, estado)").eq("tipo", "grabar").neq("estado", "hecha").order("vence"),
    supabase.from("piezas").select("id", { count: "exact", head: true }).eq("estado", "buffer"),
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.rpc("latidos"),
    supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
  ]);

  const atrasados = (latidos ?? []).filter((l) => l.atrasado);
  const sinSistema: { sistema: string; nombre: string; nodo: NodoEstado }[] = [];
  for (const s of sistemas ?? []) {
    const { data } = await supabase.rpc("estado_nodos", { p_clave: s.clave, p_semana: semana });
    for (const n of (data ?? []) as NodoEstado[]) if (n.estado === "sin_sistema") sinSistema.push({ sistema: s.clave, nombre: s.nombre, nodo: n });
  }
  const meta = (cuota ?? []).reduce((a, f) => a + f.meta, 0);
  const pub = (cuota ?? []).reduce((a, f) => a + f.publicadas, 0);
  const camino = (cuota ?? []).reduce((a, f) => a + f.en_camino, 0);
  const huecos = Math.max(0, meta - pub - camino);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fechaCorta(hoy)} · semana del {fechaCorta(semana)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Hoy</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ChipBuffer n={buffer ?? 0} />
          <Link href="/semana" className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted/50">
            {pub}/{meta} publicadas · {huecos > 0 ? <span className="text-rojo">{huecos} huecos</span> : "sin huecos"}
          </Link>
        </div>
      </header>

      {/* 1 · Lo que espera tu mano */}
      <Bloque titulo="Espera tu aprobación" acento={(propuestas ?? []).length > 0}>
        {(propuestas ?? []).length === 0 ? (
          <Vacio texto="Nada en propuesta. Cuando Milo proponga el paquete de historias, aquí lo apruebas en un toque." accion={{ href: `/historias?semana=${semana}`, texto: "Proponer a mano" }} />
        ) : (
          <div className="space-y-3">
            <ul className="divide-y rounded-lg border text-sm">
              {propuestas!.map((h) => (
                <li key={h.id} className="flex items-center gap-3 p-3">
                  <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">{DIAS_SEMANA[h.dia - 1]}</span>
                  <span className="truncate"><span className="font-medium">{h.serie.replace(/_/g, " ")}</span>{h.copy && <span className="text-muted-foreground"> · {h.copy.slice(0, 80)}</span>}</span>
                </li>
              ))}
            </ul>
            <BotonAprobarHistorias semana={semana} n={propuestas!.length} />
          </div>
        )}
      </Bloque>

      {/* 2 · Bloqueos */}
      <Bloque titulo="Bloqueos de Mariela" acento={(bloqueadas ?? []).length > 0} rojo>
        {(bloqueadas ?? []).length === 0 ? (
          <Vacio texto="Nada bloqueado." />
        ) : (
          <ul className="divide-y rounded-lg border border-rojo/40 text-sm">
            {bloqueadas!.map((t) => (
              <li key={t.id} className="space-y-1 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {t.pieza && <IdPublico id={t.pieza.id_publico} />}
                  <Link href={t.pieza ? `/piezas/${t.pieza.id}` : "/cola"} className="font-semibold hover:underline">{t.pieza?.titulo ?? t.tipo}</Link>
                  <span className="text-xs text-muted-foreground">{t.asignado?.nombre} · {t.tipo} · vence {fechaCorta(t.vence)}</span>
                </div>
                <p className="text-rojo">{t.nota_bloqueo}</p>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* 3 · Lo tuyo */}
      <Bloque titulo="Te toca grabar">
        {(grabar ?? []).length === 0 ? (
          <Vacio texto="No hay tareas de grabación abiertas. Si hay hueco de reels esta semana, aquí aparece." accion={{ href: "/piezas/nueva?formato=yap", texto: "Nueva pieza" }} />
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {grabar!.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3">
                <Link href={`/piezas/${t.pieza!.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <IdPublico id={t.pieza!.id_publico} /><span className="truncate font-medium">{t.pieza!.titulo ?? "(sin título)"}</span>
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <InsigniaFormato formato={t.pieza!.formato} />
                  <span className={cn(t.vence && t.vence < hoy && "text-rojo")}>vence {fechaCorta(t.vence)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* 4 · La máquina */}
      <Bloque titulo="La máquina" acento={atrasados.length + sinSistema.length > 0} rojo>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latidos atrasados · {atrasados.length}</p>
            {atrasados.length === 0 ? <p className="text-muted-foreground">Todo late.</p> : (
              <ul className="space-y-1">
                {atrasados.slice(0, 6).map((l) => (
                  <li key={l.sistema} className="flex justify-between gap-2"><span className="font-mono text-xs">{l.sistema}</span><span className="text-xs text-rojo">{l.ultima_corrida ? `última ${fechaCorta(l.ultima_corrida.slice(0, 10))}` : "nunca"}</span></li>
                ))}
                {atrasados.length > 6 && <li><Link href="/tablero" className="text-xs underline">ver todos</Link></li>}
              </ul>
            )}
          </div>
          <div className="space-y-1.5 rounded-lg border p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nodos sin sistema · {sinSistema.length}</p>
            {sinSistema.length === 0 ? <p className="text-muted-foreground">Todos los nodos tienen quien los dispare.</p> : (
              <ul className="space-y-1">
                {sinSistema.slice(0, 6).map((x) => (
                  <li key={`${x.sistema}/${x.nodo.nodo_clave}`}>
                    <Link href={`/maquina?sistema=${x.sistema}`} className="hover:underline"><span className="text-rojo">●</span> {x.nodo.nombre} <span className="text-xs text-muted-foreground">· {x.nombre}</span></Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Bloque>

      {/* 5 · Cuota */}
      <Bloque titulo="Cuota de la semana">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(cuota ?? []).map((f) => (
            <Link key={f.formato} href="/semana" className="rounded-lg border p-3 hover:bg-muted/40">
              <p className="text-xs text-muted-foreground">{NOMBRE_META[f.formato] ?? f.formato}</p>
              <p className="text-2xl font-extrabold">{f.publicadas}<span className="text-base font-semibold text-muted-foreground"> / {f.meta}</span></p>
              <p className="text-xs text-muted-foreground">{f.en_camino} en camino</p>
            </Link>
          ))}
        </div>
      </Bloque>

      <p className="text-xs text-muted-foreground">Semana que viene: {fechaCorta(sumarDias(semana, 7))}. Estado de piezas: <InsigniaEstado estado="buffer" /> significa listo para programar.</p>
    </div>
  );
}

function Bloque({ titulo, children, acento, rojo }: { titulo: string; children: React.ReactNode; acento?: boolean; rojo?: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className={cn("text-xs font-bold uppercase tracking-wider", acento ? (rojo ? "text-rojo" : "text-primary") : "text-muted-foreground")}>{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio({ texto, accion }: { texto: string; accion?: { href: string; texto: string } }) {
  return (
    <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
      <span>{texto}</span>
      {accion && <Link href={accion.href} className="text-xs font-semibold text-primary underline">{accion.texto}</Link>}
    </p>
  );
}
