import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { IdPublico, InsigniaEstado } from "@/components/app/insignias";
import { Badge } from "@/components/ui/badge";
import { ESTADO_FC, FichaFormato } from "@/components/formato/ficha-formato";
import { cn } from "@/lib/utils";

export const metadata = { title: "Formatos" };
export const dynamic = "force-dynamic";

const MINIMO = 8;

export default async function Formatos() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";
  const [{ data: cards }, { data: piezas }] = await Promise.all([
    supabase.from("formatos").select("id, codigo, nombre, estado, origen, molde, notas, serie_propia, duracion, recompensa, cadencia, hipotesis_formato").order("codigo"),
    supabase.from("piezas").select("id, id_publico, titulo, estado, formato_id").not("formato_id", "is", null).neq("estado", "archivada").order("created_at", { ascending: false }),
  ]);
  // Los rollups se calculan, no se guardan: episodios, publicadas, multiplicador promedio, views y follows.
  const resumenes = await Promise.all((cards ?? []).map(async (c) => {
    const { data } = await supabase.rpc("resumen_formato", { p_formato_id: c.id });
    return [c.id, data?.[0] ?? null] as const;
  }));
  const resumen = Object.fromEntries(resumenes);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Formatos</h1>
        <p className="text-sm text-muted-foreground">
          Las Format Cards. Un formato es una estructura repetible, no un video. Se valida con ocho episodios publicados y datos propios. Moratoria: no se crean cards nuevas hasta que una llegue a validado propio.
        </p>
      </header>

      <div className="space-y-4">
        {(cards ?? []).map((c) => {
          const propias = (piezas ?? []).filter((p) => p.formato_id === c.id);
          const r = resumen[c.id];
          const publicadas = r?.publicadas ?? 0;
          const faltan = Math.max(0, MINIMO - publicadas);
          return (
            <details key={c.id} className="group rounded-xl border">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{c.codigo}</span>
                <span className="font-semibold">{c.nombre}</span>
                <Badge variant="outline">{ESTADO_FC[c.estado] ?? c.estado}</Badge>
                {c.serie_propia && <span className="text-xs text-muted-foreground">serie {c.serie_propia}</span>}
                <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{r?.episodios ?? propias.length} episodios</span>
                  <span>{publicadas} publicadas</span>
                  <span className={cn(faltan === 0 ? "font-semibold text-ok" : "")}>{faltan === 0 ? "listo para validar" : `${faltan} para validar`}</span>
                  <span className={cn("font-semibold", (r?.multiplicador_promedio ?? 0) >= 3 ? "text-ok" : "text-foreground")}>{r?.multiplicador_promedio != null ? `${r.multiplicador_promedio}x` : "— x"}</span>
                </span>
              </summary>
              <div className="space-y-5 border-t px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Cifra k="Episodios" v={r?.episodios ?? 0} nota="sin archivadas" />
                  <Cifra k="Publicadas" v={publicadas} nota={`de ${MINIMO} para validar`} />
                  <Cifra k="Multiplicador promedio" v={r?.multiplicador_promedio != null ? `${r.multiplicador_promedio}x` : "—"} nota={r?.multiplicador_promedio == null ? "sin sensor todavía" : "≥ 3x = outlier"} />
                  <Cifra k="Views · follows" v={`${(r?.views_totales ?? 0).toLocaleString("es-MX")} · ${(r?.follows_totales ?? 0).toLocaleString("es-MX")}`} nota="última lectura por pieza" />
                </div>
                <FichaFormato formato={c} puedeEditar={esOwner} />
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <details className="rounded-lg border">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">Molde · la receta completa</summary>
                    <div className="border-t px-3 py-3"><Markdown texto={c.molde} className="prose-sm" /></div>
                  </details>
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
                          {propias.length > 12 && <li className="text-[11px] text-muted-foreground">y {propias.length - 12} más</li>}
                        </ul>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Cifra({ k, v, nota }: { k: string; v: string | number; nota?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</p>
      <p className="text-lg font-extrabold tabular-nums">{v}</p>
      {nota && <p className="text-[11px] text-muted-foreground">{nota}</p>}
    </div>
  );
}
