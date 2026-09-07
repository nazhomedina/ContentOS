import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaFormato } from "@/components/app/insignias";
import { Captura } from "@/components/pieza/captura";
import { FORMATOS, NOMBRE_ESTADO, NOMBRE_FORMATO, type EstadoPieza, type Formato } from "@/lib/dominio/estados";
import { TOPE_PRODUCCION } from "@/lib/dominio/buffer";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Piezas" };
export const dynamic = "force-dynamic";

const ORDEN: EstadoPieza[] = ["idea", "para_producir", "para_grabar", "edicion", "buffer", "programada", "publicada", "en_trial", "archivada"];

export default async function Piezas({ searchParams }: { searchParams: Promise<{ estado?: string; formato?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { estado: fEstado, formato: fFormato } = await searchParams;
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  let q = supabase
    .from("piezas")
    .select("id, id_publico, titulo, formato, estado, fecha_objetivo, programa_aprobado, notas, created_at, responsable:perfiles!piezas_responsable_id_fkey(nombre)")
    .order("created_at", { ascending: false });
  if (fEstado) q = q.eq("estado", fEstado); else q = q.neq("estado", "archivada");
  if (fFormato) q = q.eq("formato", fFormato);
  const { data } = await q;
  const piezas = data ?? [];

  const { data: todas } = await supabase.from("piezas").select("estado, formato, programa_aprobado").neq("estado", "archivada");
  const conteo = (e: string) => (todas ?? []).filter((p) => p.estado === e).length;
  const enProduccion = (todas ?? []).filter((p) => ["para_producir", "para_grabar"].includes(p.estado) && !p.programa_aprobado).length;

  const grupos = ORDEN.filter((e) => !fEstado || e === fEstado).map((e) => ({ estado: e, items: piezas.filter((p) => p.estado === e) })).filter((g) => g.items.length > 0);
  const url = (k: "estado" | "formato", v: string | null) => {
    const sp = new URLSearchParams();
    const e = k === "estado" ? v : fEstado; const f = k === "formato" ? v : fFormato;
    if (e) sp.set("estado", e); if (f) sp.set("formato", f);
    const s = sp.toString(); return `/piezas${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Piezas</h1>
          {esOwner && (
            <p className={cn("text-sm", enProduccion > TOPE_PRODUCCION ? "font-semibold text-rojo" : "text-muted-foreground")}>
              {enProduccion} de {TOPE_PRODUCCION} en producción
            </p>
          )}
        </div>
        {esOwner && <Captura />}
        <div className="flex flex-wrap gap-1.5">
          <Chip href={url("estado", null)} activo={!fEstado}>Todas · {(todas ?? []).length}</Chip>
          {ORDEN.filter((e) => e !== "archivada").map((e) => (
            <Chip key={e} href={url("estado", e)} activo={fEstado === e}>{NOMBRE_ESTADO[e]} · {conteo(e)}</Chip>
          ))}
          <Chip href={url("estado", "archivada")} activo={fEstado === "archivada"} tenue>Archivadas</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href={url("formato", null)} activo={!fFormato} tenue>Todo formato</Chip>
          {FORMATOS.map((f) => (
            <Chip key={f} href={url("formato", f)} activo={fFormato === f} tenue>{NOMBRE_FORMATO[f as Formato]}</Chip>
          ))}
        </div>
      </header>

      {grupos.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nada con ese filtro.</p>}

      {grupos.map((g) => (
        <section key={g.estado} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{NOMBRE_ESTADO[g.estado]} · {g.items.length}</h2>
          <ul className="divide-y rounded-lg border">
            {g.items.map((p) => (
              <li key={p.id}>
                <Link href={`/piezas/${p.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <IdPublico id={p.id_publico} />
                      <span className="truncate font-medium">{p.titulo ?? "(sin título)"}</span>
                    </div>
                    {p.estado === "idea" && p.notas && <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.notas.split("\n")[0]}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {p.formato && <InsigniaFormato formato={p.formato} />}
                    {p.fecha_objetivo && <span className="hidden sm:inline">{fechaCorta(p.fecha_objetivo)}</span>}
                    {p.responsable?.nombre && <span className="hidden sm:inline">{p.responsable.nombre}</span>}
                    {!fEstado && <InsigniaEstado estado={p.estado} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Chip({ href, activo, tenue, children }: { href: string; activo: boolean; tenue?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        activo ? "border-foreground bg-foreground text-background" : tenue ? "text-muted-foreground hover:bg-muted" : "hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
