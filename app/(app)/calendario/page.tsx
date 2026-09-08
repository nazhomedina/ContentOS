import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { fechaCorta, hoyISO, lunesDe, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendario" };
export const dynamic = "force-dynamic";

export default async function Calendario({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { semana: s } = await searchParams;
  const semana = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? lunesDe(s) : lunesDeHoy();
  const fin = sumarDias(semana, 7);
  const hoy = hoyISO();
  const supabase = await crearClienteServidor();

  const [{ data: piezas }, { data: historias }] = await Promise.all([
    supabase.from("piezas")
      .select("id, id_publico, titulo, formato, estado, fecha_objetivo, publicada_en, responsable:perfiles!piezas_responsable_id_fkey(nombre)")
      .neq("estado", "archivada").neq("estado", "borrador")
      .or(`and(fecha_objetivo.gte.${semana},fecha_objetivo.lt.${fin}),and(publicada_en.gte.${semana},publicada_en.lt.${fin})`),
    supabase.from("historias").select("id, dia, serie, estado").eq("semana", semana).neq("estado", "descartada").order("dia").order("orden"),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(semana, i));
  const enDia = (d: string) => (piezas ?? []).filter((p) => (p.estado === "publicada" ? (p.publicada_en ?? "").slice(0, 10) === d : p.fecha_objetivo === d));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semana del {fechaCorta(semana)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Calendario</h1>
        </div>
        <div className="flex gap-1">
          <Link href={`/calendario?semana=${sumarDias(semana, -7)}`} className="rounded-md border p-2" aria-label="Anterior"><ChevronLeft className="size-4" /></Link>
          <Link href="/calendario" className="rounded-md border px-3 py-2 text-xs font-medium">Esta semana</Link>
          <Link href={`/calendario?semana=${sumarDias(semana, 7)}`} className="rounded-md border p-2" aria-label="Siguiente"><ChevronRight className="size-4" /></Link>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        {dias.map((d, i) => {
          const items = enDia(d);
          const hist = (historias ?? []).filter((h) => h.dia === i + 1);
          return (
            <section key={d} className={cn("space-y-2 rounded-xl border p-3", d === hoy && "border-primary/60")}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {DIAS_SEMANA[i].slice(0, 3)} <span className="font-medium">{fechaCorta(d).replace(/^\w+ /, "")}</span>
                {d === hoy && <span className="ml-1 text-primary">· hoy</span>}
              </h2>
              {hist.length > 0 && (
                <Link href={`/historias?semana=${semana}`} className="block rounded-md bg-muted/60 px-2 py-1.5 text-xs hover:bg-muted">
                  {hist.length} {hist.length === 1 ? "historia" : "historias"} · {hist.every((h) => h.estado === "publicada") ? <span className="text-ok">publicadas</span> : hist[0].estado}
                </Link>
              )}
              {items.length === 0 && hist.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
              <ul className="space-y-1.5">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/piezas/${p.id}`} className="block space-y-0.5 rounded-md border bg-card px-2 py-1.5 text-xs hover:bg-muted/40">
                      <div className="flex items-center justify-between gap-1"><IdPublico id={p.id_publico} />{p.formato && <InsigniaFormato formato={p.formato} />}</div>
                      <p className="truncate font-medium">{p.titulo ?? "(sin título)"}</p>
                      <div className="flex items-center justify-between gap-1 text-muted-foreground"><span className="truncate">{p.responsable?.nombre ?? ""}</span><InsigniaEstado estado={p.estado} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">En producción se ubica por fecha objetivo; publicado, por fecha de publicación. Los borradores no aparecen hasta que tienen formato y fecha.</p>
    </div>
  );
}
