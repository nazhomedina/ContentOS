import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { IdPublico, InsigniaEstado } from "@/components/app/insignias";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Formatos" };
export const dynamic = "force-dynamic";

const ESTADO_FC: Record<string, string> = {
  detectado: "Detectado", experimentando: "Experimentando", validado_propio: "Validado propio", firma: "Firma", retirado: "Retirado",
};

export default async function Formatos() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const [{ data: cards }, { data: piezas }] = await Promise.all([
    supabase.from("format_cards").select("id, codigo, nombre, estado, origen, molde, notas").order("codigo"),
    supabase.from("piezas").select("id, id_publico, titulo, estado, format_card_id").not("format_card_id", "is", null).neq("estado", "archivada").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Formatos</h1>
        <p className="text-sm text-muted-foreground">
          Las Format Cards. Un formato es una estructura repetible, no un video. Se valida con ocho episodios y datos propios. Moratoria: no se crean cards nuevas hasta que una llegue a validado propio.
        </p>
      </header>

      <div className="space-y-4">
        {(cards ?? []).map((c) => {
          const propias = (piezas ?? []).filter((p) => p.format_card_id === c.id);
          const publicadas = propias.filter((p) => p.estado === "publicada").length;
          return (
            <details key={c.id} className="group rounded-xl border">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{c.codigo}</span>
                <span className="font-semibold">{c.nombre}</span>
                <Badge variant="outline">{ESTADO_FC[c.estado] ?? c.estado}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {propias.length} piezas · {publicadas} publicadas · {Math.max(0, 8 - publicadas)} para validar
                </span>
              </summary>
              <div className="grid gap-6 border-t px-4 py-4 lg:grid-cols-[1fr_280px]">
                <Markdown texto={c.molde} className="prose-sm" />
                <aside className="space-y-3">
                  {c.origen && <p className="text-xs text-muted-foreground">Origen: {c.origen}</p>}
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Piezas con este formato</p>
                    {propias.length === 0 ? <p className="text-xs text-muted-foreground">Ninguna todavía.</p> : (
                      <ul className="space-y-1">
                        {propias.slice(0, 12).map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                            <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-center gap-1.5 hover:underline"><IdPublico id={p.id_publico} /><span className="truncate">{p.titulo}</span></Link>
                            <InsigniaEstado estado={p.estado} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </aside>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
