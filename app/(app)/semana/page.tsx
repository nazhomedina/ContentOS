import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, lunesDe, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_META, resumenSistema, type NodoEstado } from "@/lib/dominio/nodo";
import { IdPublico, InsigniaEstado } from "@/components/app/insignias";
import { cn } from "@/lib/utils";

export const metadata = { title: "Semana" };
export const dynamic = "force-dynamic";

type Slot = { id?: string; id_publico?: string; titulo?: string | null; estado?: string; fecha_objetivo?: string | null; responsable?: string | null; dia?: number; serie?: string };

export default async function Semana({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { semana: s } = await searchParams;
  const semana = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? lunesDe(s) : lunesDeHoy();
  const supabase = await crearClienteServidor();

  const [{ data: cuota }, { data: sistemas }, { data: huecos }] = await Promise.all([
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
    supabase.from("huecos").select("sistema_clave, nodo_clave, nota").eq("semana", semana),
  ]);
  const estados = await Promise.all((sistemas ?? []).map(async (x) => {
    const { data } = await supabase.rpc("estado_nodos", { p_clave: x.clave, p_semana: semana });
    return { ...x, nodos: (data ?? []) as NodoEstado[] };
  }));

  const filas = (cuota ?? []).sort((a, b) => ["newsletter", "reel", "carrusel", "historia_dia"].indexOf(a.formato) - ["newsletter", "reel", "carrusel", "historia_dia"].indexOf(b.formato));
  const totalMeta = filas.reduce((a, f) => a + f.meta, 0);
  const totalPub = filas.reduce((a, f) => a + f.publicadas, 0);
  const totalCamino = filas.reduce((a, f) => a + f.en_camino, 0);
  const totalHueco = Math.max(0, totalMeta - totalPub - totalCamino);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semana del {fechaCorta(semana)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {totalPub} <span className="text-muted-foreground">/ {totalMeta}</span> publicadas
          </h1>
          <p className="text-sm text-muted-foreground">{totalCamino} en camino · <span className={cn(totalHueco > 0 && "font-semibold text-rojo")}>{totalHueco} sin nada que las llene</span></p>
        </div>
        <div className="flex gap-1">
          <Link href={`/semana?semana=${sumarDias(semana, -7)}`} className="rounded-md border p-2" aria-label="Anterior"><ChevronLeft className="size-4" /></Link>
          <Link href="/semana" className="rounded-md border px-3 py-2 text-xs font-medium">Esta semana</Link>
          <Link href={`/semana?semana=${sumarDias(semana, 7)}`} className="rounded-md border p-2" aria-label="Siguiente"><ChevronRight className="size-4" /></Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {filas.map((f) => {
          const slots = (f.piezas as Slot[]) ?? [];
          const vacios = Math.max(0, f.meta - (f.formato === "historia_dia" ? new Set(slots.map((x) => x.dia)).size : slots.length));
          return (
            <div key={f.formato} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">{NOMBRE_META[f.formato] ?? f.formato}</h2>
                <p className="text-sm"><span className={cn("text-2xl font-extrabold", f.publicadas >= f.meta ? "text-ok" : "")}>{f.publicadas}</span><span className="text-muted-foreground"> / {f.meta}</span></p>
              </div>
              <ul className="space-y-1.5">
                {f.formato === "historia_dia"
                  ? Array.from(new Set(slots.map((x) => x.dia!))).sort().map((d) => {
                      const del = slots.filter((x) => x.dia === d);
                      const pub = del.some((x) => x.estado === "publicada");
                      return (
                        <li key={d} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <Link href={`/historias?semana=${semana}`} className="font-medium hover:underline">{DIAS_SEMANA[d - 1]}</Link>
                          <span className="text-xs text-muted-foreground">{del.length} historias · {pub ? <span className="text-ok">publicado</span> : del[0]?.estado}</span>
                        </li>
                      );
                    })
                  : slots.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                        <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                          <IdPublico id={p.id_publico!} /><span className="truncate">{p.titulo ?? "(sin título)"}</span>
                        </Link>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          {p.responsable && <span>{p.responsable}</span>}
                          <InsigniaEstado estado={p.estado!} />
                        </span>
                      </li>
                    ))}
                {Array.from({ length: vacios }).map((_, i) => (
                  <li key={`v${i}`} className="flex items-center justify-between rounded-md border border-dashed border-rojo/50 px-3 py-2 text-sm text-rojo">
                    <span>Hueco: nadie lo tiene</span>
                    {sesion.perfil.rol === "owner" && (
                      <Link href={f.formato === "historia_dia" ? `/historias?semana=${semana}` : `/piezas/nueva?formato=${f.formato === "reel" ? "reel" : f.formato}&semana=${semana}`} className="text-xs font-semibold underline">
                        llenar
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">La máquina esta semana</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {estados.map((sx) => {
            const r = resumenSistema(sx.nodos);
            return (
              <Link key={sx.clave} href={`/maquina?sistema=${sx.clave}&semana=${semana}`} className="space-y-2 rounded-xl border p-4 hover:bg-muted/40">
                <p className="font-semibold leading-tight">{sx.nombre}</p>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                  {r.corrio > 0 && <span className="bg-ok" style={{ width: `${(r.corrio / r.total) * 100}%` }} />}
                  {r.hueco > 0 && <span className="bg-muted-foreground" style={{ width: `${(r.hueco / r.total) * 100}%` }} />}
                  {r.agendado > 0 && <span className="bg-ambar" style={{ width: `${(r.agendado / r.total) * 100}%` }} />}
                  {r.sin_sistema > 0 && <span className="bg-rojo" style={{ width: `${(r.sin_sistema / r.total) * 100}%` }} />}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-ok">{r.corrio} corrió</span> · <span className="text-ambar">{r.agendado} sin correr</span> · <span className="text-rojo">{r.sin_sistema} sin sistema</span>
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {(huecos ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Huecos declarados</h2>
          <ul className="space-y-1 text-sm">
            {huecos!.map((h) => (
              <li key={`${h.sistema_clave}/${h.nodo_clave}`} className="rounded-md bg-muted/50 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{h.sistema_clave} / {h.nodo_clave}</span> · {h.nota}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
