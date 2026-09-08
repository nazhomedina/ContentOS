import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, fechaHora, hoyISO, lunesDe, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { IdPublico } from "@/components/app/insignias";
import { cn } from "@/lib/utils";

export const metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

type Ev = {
  tareas_hechas: { id: string; tipo: string; pieza: string | null; pieza_id: string | null; titulo: string | null; cuando: string }[];
  estados: { resumen: string; cuando: string }[];
  historias_publicadas: number;
  archivos: { ruta: string; cuando: string }[];
  comentarios: number;
};

export default async function Equipo({ searchParams }: { searchParams: Promise<{ semana?: string; persona?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const { semana: s, persona } = await searchParams;
  const semana = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? lunesDe(s) : lunesDeHoy();
  const hoy = hoyISO();
  const supabase = await crearClienteServidor();

  const { data: editores } = await supabase.from("perfiles").select("user_id, nombre, rol").eq("rol", "editor").order("nombre");
  if (!editores?.length) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">Todavía nadie del equipo ha entrado. Cuando Mariela entre con su correo, aquí aparece su bitácora.</p>
      </div>
    );
  }
  const activa = editores.find((e) => e.user_id === persona) ?? editores[0];

  const [{ data: bitacora }, { data: resumen }] = await Promise.all([
    supabase.from("bitacora").select("id, fecha, texto, minutos, evidencia_url, created_at, pieza:piezas(id, id_publico, titulo)").eq("perfil_id", activa.user_id).gte("fecha", semana).lte("fecha", sumarDias(semana, 6)).order("created_at"),
    supabase.rpc("resumen_semana_persona", { p_perfil: activa.user_id, p_semana: semana }),
  ]);
  const evidencias = await Promise.all(Array.from({ length: 7 }, (_, i) => sumarDias(semana, i)).map(async (d) => {
    const { data } = await supabase.rpc("evidencia_dia", { p_perfil: activa.user_id, p_fecha: d });
    return [d, (data ?? {}) as unknown as Ev] as const;
  }));
  const evPorDia = Object.fromEntries(evidencias);

  const tot = (resumen ?? []).reduce((a, r) => ({ decl: a.decl + r.declaraciones, tareas: a.tareas + r.tareas_hechas, archivos: a.archivos + r.archivos, estados: a.estados + r.estados }), { decl: 0, tareas: 0, archivos: 0, estados: 0 });
  const diasLaborales = Array.from({ length: 5 }, (_, i) => sumarDias(semana, i)).filter((d) => d <= hoy);
  const diasSin = diasLaborales.filter((d) => !(bitacora ?? []).some((b) => b.fecha === d)).length;
  const minutos = (bitacora ?? []).reduce((a, b) => a + (b.minutos ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipo · semana del {fechaCorta(semana)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{activa.nombre}</h1>
        </div>
        <div className="flex gap-1">
          <Link href={`/equipo?persona=${activa.user_id}&semana=${sumarDias(semana, -7)}`} className="rounded-md border p-2" aria-label="Anterior"><ChevronLeft className="size-4" /></Link>
          <Link href={`/equipo?persona=${activa.user_id}`} className="rounded-md border px-3 py-2 text-xs font-medium">Esta semana</Link>
          <Link href={`/equipo?persona=${activa.user_id}&semana=${sumarDias(semana, 7)}`} className="rounded-md border p-2" aria-label="Siguiente"><ChevronRight className="size-4" /></Link>
        </div>
      </header>

      {editores.length > 1 && (
        <nav className="flex gap-1">
          {editores.map((e) => (
            <Link key={e.user_id} href={`/equipo?persona=${e.user_id}&semana=${semana}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", e.user_id === activa.user_id && "border-foreground bg-foreground text-background")}>{e.nombre}</Link>
          ))}
        </nav>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi etiqueta="Días con bitácora" valor={`${diasLaborales.length - diasSin}/${diasLaborales.length}`} rojo={diasSin > 0} />
        <Kpi etiqueta="Entradas" valor={tot.decl} />
        <Kpi etiqueta="Tareas hechas" valor={tot.tareas} />
        <Kpi etiqueta="Archivos subidos" valor={tot.archivos} />
        <Kpi etiqueta="Horas declaradas" valor={minutos ? (minutos / 60).toFixed(1) : "—"} />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => sumarDias(semana, i)).map((d, i) => {
          const decl = (bitacora ?? []).filter((b) => b.fecha === d);
          const ev = evPorDia[d];
          const laboral = i < 5;
          const pasado = d <= hoy;
          const sinBitacora = laboral && pasado && decl.length === 0;
          const nadaAun = !pasado;
          return (
            <section key={d} className={cn("rounded-xl border", sinBitacora && "border-rojo/50", nadaAun && "opacity-50")}>
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
                <h2 className="text-sm font-bold">{DIAS_SEMANA[i]} <span className="font-medium text-muted-foreground">{fechaCorta(d).replace(/^\w+ /, "")}</span>{d === hoy && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">hoy</span>}</h2>
                <p className="text-xs">
                  {sinBitacora ? <span className="font-semibold text-rojo">sin bitácora</span>
                    : decl.length > 0 ? <span className="text-ok">{decl.length} {decl.length === 1 ? "entrada" : "entradas"}</span>
                    : <span className="text-muted-foreground">{laboral ? "" : "fin de semana"}</span>}
                </p>
              </div>
              <div className="grid gap-4 px-4 py-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lo que declaró</p>
                  {decl.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
                    <ul className="space-y-1.5 text-sm">
                      {decl.map((b) => (
                        <li key={b.id}>
                          <p className="whitespace-pre-wrap">{b.texto}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.pieza && <Link href={`/piezas/${b.pieza.id}`} className="hover:underline"><IdPublico id={b.pieza.id_publico} /> {b.pieza.titulo}</Link>}
                            {b.minutos ? ` · ${b.minutos} min` : ""}{b.evidencia_url && <span> · <Paperclip className="inline size-3" /> {b.evidencia_url.split("/").pop()}</span>} · {fechaHora(b.created_at).split(",")[1]}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lo que la plataforma registró</p>
                  {!ev || (ev.tareas_hechas?.length ?? 0) + (ev.estados?.length ?? 0) + (ev.archivos?.length ?? 0) + (ev.historias_publicadas ?? 0) + (ev.comentarios ?? 0) === 0
                    ? <p className="text-xs text-muted-foreground">Nada: ni tareas cerradas, ni estados movidos, ni archivos.</p>
                    : (
                      <ul className="space-y-1 text-xs">
                        {ev.tareas_hechas?.map((t) => <li key={t.id}>✔ tarea <span className="font-medium">{t.tipo}</span> {t.pieza && <Link href={`/piezas/${t.pieza_id}`} className="hover:underline"><IdPublico id={t.pieza} /></Link>} {t.titulo}</li>)}
                        {ev.estados?.map((e, k) => <li key={k}>→ {e.resumen}</li>)}
                        {ev.archivos?.map((a) => <li key={a.ruta}><Paperclip className="inline size-3" /> {a.ruta}</li>)}
                        {ev.historias_publicadas > 0 && <li>{ev.historias_publicadas} historias publicadas</li>}
                        {ev.comentarios > 0 && <li>{ev.comentarios} comentarios</li>}
                      </ul>
                    )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">La columna izquierda es lo que la persona declara; la derecha, lo que la plataforma vio. Cuando no coinciden, es una conversación, no una estimación.</p>
    </div>
  );
}

function Kpi({ etiqueta, valor, rojo }: { etiqueta: string; valor: string | number; rojo?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={cn("text-2xl font-extrabold", rojo && "text-rojo")}>{valor}</p>
    </div>
  );
}
