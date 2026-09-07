import Link from "next/link";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { ESTADOS_PIEZA, NOMBRE_ESTADO } from "@/lib/dominio/estados";
import { TOPE_PRODUCCION } from "@/lib/dominio/buffer";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Piezas" };
export const dynamic = "force-dynamic";

export default async function Piezas() {
  const sesion = await sesionActual();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("piezas")
    .select("id, id_publico, titulo, formato, estado, fecha_objetivo, programa_aprobado, responsable:perfiles!piezas_responsable_id_fkey(nombre)")
    .neq("estado", "archivada")
    .order("fecha_objetivo", { ascending: true, nullsFirst: false });

  const piezas = data ?? [];
  const enProduccion = piezas.filter((p) => ["para_producir", "para_grabar"].includes(p.estado) && !p.programa_aprobado).length;
  const grupos = ESTADOS_PIEZA.filter((e) => e !== "archivada").map((e) => ({ estado: e, items: piezas.filter((p) => p.estado === e) }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Piezas</h1>
          {sesion?.perfil.rol === "owner" && <Link href="/piezas/nueva" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Nueva pieza</Link>}
        </div>
        {sesion?.perfil.rol === "owner" && (
          <p className={cn("text-sm", enProduccion > TOPE_PRODUCCION ? "font-semibold text-rojo" : "text-muted-foreground")}>
            {enProduccion} de {TOPE_PRODUCCION} en producción{enProduccion > TOPE_PRODUCCION && " · tope excedido (herencia de Notion)"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">El kanban con arrastre llega en el sprint 2. Esta es la lista por estado.</p>
      </header>
      {grupos.map((g) => g.items.length > 0 && (
        <section key={g.estado} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{NOMBRE_ESTADO[g.estado]} · {g.items.length}</h2>
          <ul className="divide-y rounded-lg border">
            {g.items.map((p) => (
              <li key={p.id}>
                <Link href={`/piezas/${p.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2"><IdPublico id={p.id_publico} /><span className="truncate font-semibold">{p.titulo ?? "(sin título)"}</span></div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <InsigniaFormato formato={p.formato} />
                      {p.fecha_objetivo && <span>objetivo {fechaCorta(p.fecha_objetivo)}</span>}
                      {p.responsable?.nombre && <span>· {p.responsable.nombre}</span>}
                    </div>
                  </div>
                  <InsigniaEstado estado={p.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {piezas.length === 0 && <p className="text-sm text-muted-foreground">No hay piezas visibles todavía.</p>}
    </div>
  );
}
