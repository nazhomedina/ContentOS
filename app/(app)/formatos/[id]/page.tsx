import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { IdPublico, InsigniaEstado } from "@/components/app/insignias";
import { FichaFormato } from "@/components/formato/ficha-formato";
import { EtiquetasFormato } from "@/components/formato/etiquetas-formato";
import { PortadaFormato } from "@/components/formato/portada-formato";
import { ReferenciasFormato, type ReferenciaFila } from "@/components/formato/referencias-formato";
import { HipotesisFormato } from "@/components/formato/hipotesis-formato";
import { CAMINO_FC, ESTADO_FC, type HipotesisFormato as H } from "@/lib/dominio/formatos";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const MINIMO = 8;

/** Un formato abierto: portada, camino, etiquetas, ficha, cifras, referencias, hipótesis, episodios y molde. */
export default async function Formato({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  const { data: f } = await supabase.from("formatos")
    .select("id, codigo, nombre, estado, origen, etiquetas, portada, molde, notas, serie_propia, duracion, recompensa, cadencia, created_at, hipotesis:hipotesis(id, texto, campo, numero, fecha, estado), referencias(id, cuenta, url, multiplicador, views, duracion_s, nota, created_at, pieza:piezas(id, id_publico, titulo))")
    .eq("id", id).maybeSingle();
  if (!f) notFound();
  const [{ data: r }, { data: hr }, { data: piezas }, portadaUrl] = await Promise.all([
    supabase.rpc("resumen_formato", { p_formato_id: f.id }),
    supabase.rpc("resumen_hipotesis_formato", { p_formato_id: f.id }),
    supabase.from("piezas").select("id, id_publico, titulo, estado").eq("formato_id", f.id).neq("estado", "archivada").order("created_at", { ascending: false }),
    f.portada ? supabase.storage.from("assets").createSignedUrl(f.portada, 3600).then((x) => x.data?.signedUrl ?? null) : Promise.resolve(null),
  ]);
  const resumen = r?.[0];
  const publicadas = resumen?.publicadas ?? 0;
  const referencias = ((f.referencias ?? []) as unknown as ReferenciaFila[]).sort((a, b) => (b.multiplicador ?? -1) - (a.multiplicador ?? -1));
  const terceros = referencias.filter((x) => x.cuenta && x.cuenta !== "@nazho" && !x.pieza).length;
  const idxEstado = (CAMINO_FC as readonly string[]).indexOf(f.estado);

  return (
    <div className="space-y-6">
      <Link href="/formatos" className="text-xs text-muted-foreground hover:underline">← Formatos</Link>

      <header className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <PortadaFormato formatoId={f.id} codigo={f.codigo} url={portadaUrl} puedeEditar={esOwner} alta />
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><IdPublico id={f.codigo} /><span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">{ESTADO_FC[f.estado] ?? f.estado}</span><span>creado {fechaCorta(f.created_at.slice(0, 10))}{f.origen && ` · origen: ${f.origen}`}</span></div>
          <h1 className="text-2xl font-extrabold tracking-tight">{f.nombre}</h1>
          <ol className="flex flex-wrap items-center gap-0 text-xs">
            {CAMINO_FC.map((k, i) => (
              <li key={k} className="flex items-center"><span className={cn("rounded-full px-2.5 py-1 font-medium", i === idxEstado ? "bg-foreground text-background" : i < idxEstado ? "text-foreground" : "text-muted-foreground")}>{ESTADO_FC[k]}</span>{i < CAMINO_FC.length - 1 && <span className="mx-0.5 h-px w-4 bg-border" />}</li>
            ))}
            {f.estado === "retirado" && <li className="rounded-full bg-muted px-2.5 py-1 font-medium">Retirado</li>}
          </ol>
          <EtiquetasFormato formatoId={f.id} etiquetas={f.etiquetas} puedeEditar={esOwner} />
          <FichaFormato formato={f} puedeEditar={esOwner} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Cifra k="Episodios" v={resumen?.episodios ?? 0} nota="sin archivadas" />
        <Cifra k="Publicadas" v={publicadas} nota={publicadas >= MINIMO ? "listo para validar" : `de ${MINIMO} para validar`} />
        <Cifra k="Multiplicador promedio" v={resumen?.multiplicador_promedio != null ? `${resumen.multiplicador_promedio}x` : "—"} nota={resumen?.multiplicador_promedio == null ? "sin sensor todavía" : "≥ 3x = outlier"} />
        <Cifra k="Referencias" v={referencias.length} nota={`${terceros} de terceros · ${referencias.length - terceros} propias`} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ReferenciasFormato formatoId={f.id} referencias={referencias} puedeEditar={esOwner} />
        <HipotesisFormato formatoId={f.id} hipotesis={f.hipotesis as H} episodios={hr?.[0] ?? null} puedeEditar={esOwner} />
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between"><h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Episodios · {(piezas ?? []).length}</h2><Link href="/reels?vista=lista" className="text-xs text-primary hover:underline">ver en Reels</Link></div>
        {(piezas ?? []).length === 0 ? <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">Ninguna pieza con este formato todavía.</p> : (
          <ul className="grid gap-x-6 rounded-xl border px-3 sm:grid-cols-2">
            {(piezas ?? []).slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-b py-2 text-[13px] last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-center gap-1.5 hover:underline"><IdPublico id={p.id_publico} /><span className="truncate">{p.titulo}</span></Link><InsigniaEstado estado={p.estado} />
              </li>
            ))}
            {(piezas ?? []).length > 12 && <li className="py-2 text-xs text-muted-foreground">y {(piezas ?? []).length - 12} más</li>}
          </ul>
        )}
      </section>

      <details className="rounded-xl border">
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Molde · la receta completa</span><span className="text-xs text-muted-foreground">estructura, mecánica, evidencia y aprendizajes</span></summary>
        <div className="border-t px-4 py-4">{f.molde ? <Markdown texto={f.molde} className="prose-sm" /> : <p className="text-sm text-muted-foreground">Sin molde todavía. Claude lo escribe desde Cowork con actualizar_formato.</p>}</div>
      </details>
    </div>
  );
}

function Cifra({ k, v, nota }: { k: string; v: string | number; nota?: string }) {
  return (
    <div className="rounded-xl border px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</p>
      <p className="text-xl font-extrabold tabular-nums tracking-tight">{v}</p>
      {nota && <p className="text-[11px] text-muted-foreground">{nota}</p>}
    </div>
  );
}
