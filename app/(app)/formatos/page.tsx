import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ESTADO_FC, ETIQUETAS_CONOCIDAS, FACETAS, señalFormato, type HipotesisFormato } from "@/lib/dominio/formatos";
import { hoyISO } from "@/lib/dominio/tiempo";
import { NuevoFormato } from "@/components/formato/nuevo-formato";
import { cn } from "@/lib/utils";

export const metadata = { title: "Formatos" };
export const dynamic = "force-dynamic";

type Tarjeta = {
  id: string; codigo: string; nombre: string; estado: string; etiquetas: string[]; portada: string | null; serie_propia: string | null; duracion: string | null;
  hipotesis: HipotesisFormato; referencias: { count: number }[];
  episodios: number; publicadas: number; multiplicador: number | null; portadaUrl: string | null;
};

/**
 * La biblioteca de formatos (docs/decisiones.md 2026-09-23): una galería por etiquetas. Cada tarjeta dice
 * estado, multiplicador, episodios, serie, etiquetas y qué dice su hipótesis. Se alimenta desde aquí o desde
 * Cowork al analizar cuentas; la ficha de cada formato guarda las referencias y la hipótesis.
 */
export default async function Formatos({ searchParams }: { searchParams: Promise<{ e?: string | string[] }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { e } = await searchParams;
  const elegidas = (Array.isArray(e) ? e : e ? [e] : []).map((x) => x.toLowerCase());
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";
  const hoy = hoyISO();

  const { data } = await supabase.from("formatos")
    .select("id, codigo, nombre, estado, etiquetas, portada, serie_propia, duracion, hipotesis:hipotesis(id, texto, campo, numero, fecha, estado), referencias(count)")
    .order("codigo");
  const todos = data ?? [];
  const resumenes = new Map<string, { episodios: number; publicadas: number; multiplicador: number | null }>();
  await Promise.all(todos.map(async (f) => {
    const { data: r } = await supabase.rpc("resumen_formato", { p_formato_id: f.id });
    resumenes.set(f.id, { episodios: r?.[0]?.episodios ?? 0, publicadas: r?.[0]?.publicadas ?? 0, multiplicador: r?.[0]?.multiplicador_promedio ?? null });
  }));
  const conPortada = todos.filter((f) => f.portada).map((f) => f.portada!);
  const { data: firmadas } = conPortada.length ? await supabase.storage.from("assets").createSignedUrls(conPortada, 3600) : { data: [] };
  const urlDe = new Map((firmadas ?? []).map((x) => [x.path, x.signedUrl]));

  const tarjetas: Tarjeta[] = todos
    .map((f) => ({ ...f, hipotesis: f.hipotesis as HipotesisFormato, ...resumenes.get(f.id)!, portadaUrl: f.portada ? urlDe.get(f.portada) ?? null : null }))
    .sort((a, b) => (b.multiplicador ?? -1) - (a.multiplicador ?? -1) || b.episodios - a.episodios);
  const visibles = tarjetas.filter((t) => elegidas.every((x) => t.etiquetas.includes(x)));
  const cuenta = (et: string) => tarjetas.filter((t) => t.etiquetas.includes(et)).length;
  const otras = Array.from(new Set(tarjetas.flatMap((t) => t.etiquetas))).filter((x) => !ETIQUETAS_CONOCIDAS.has(x)).sort();
  const href = (et: string) => { const s = new URLSearchParams(); for (const x of elegidas.includes(et) ? elegidas.filter((y) => y !== et) : [...elegidas, et]) s.append("e", x); const q = s.toString(); return q ? `/formatos?${q}` : "/formatos"; };
  const porEstado = (k: string) => tarjetas.filter((t) => t.estado === k).length;
  const sinNumero = tarjetas.filter((t) => t.hipotesis && t.hipotesis.estado === "abierta" && !t.hipotesis.campo).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Formatos</h1>
          <p className="text-sm">
            <span className="font-semibold">{tarjetas.length}</span> <span className="text-muted-foreground">formatos · </span>
            {(["experimentando", "detectado", "validado_propio", "firma"] as const).filter((k) => porEstado(k) > 0).map((k, i) => <span key={k}><span className="font-semibold">{porEstado(k)}</span> <span className="text-muted-foreground">{ESTADO_FC[k].toLowerCase()}{i < 3 ? " · " : ""}</span></span>)}
            {porEstado("validado_propio") + porEstado("firma") === 0 && <span className="font-semibold text-rojo">ninguno validado</span>}
            {sinNumero > 0 && <span className="text-muted-foreground"> · {sinNumero} hipótesis de formato sin número ni fecha</span>}
          </p>
        </div>
        {esOwner && <NuevoFormato />}
      </header>

      <div className="space-y-2 rounded-xl border px-3.5 py-3">
        {FACETAS.map((f) => (
          <div key={f.clave} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{f.nombre}</span>
            <span className="flex flex-wrap gap-1.5">
              {f.clave === "donde" && <Link href="/formatos" className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", elegidas.length === 0 ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>Todos</Link>}
              {f.etiquetas.map((et) => <Link key={et} href={href(et)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", elegidas.includes(et) ? "border-foreground bg-foreground text-background" : cuenta(et) === 0 ? "text-muted-foreground/60" : "text-muted-foreground hover:bg-muted")}>{et} <span className="opacity-70">{cuenta(et)}</span></Link>)}
            </span>
          </div>
        ))}
        {otras.length > 0 && (
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Otras</span>
            <span className="flex flex-wrap gap-1.5">{otras.map((et) => <Link key={et} href={href(et)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", elegidas.includes(et) ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>{et} <span className="opacity-70">{cuenta(et)}</span></Link>)}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{visibles.length} {visibles.length === 1 ? "formato" : "formatos"} · ordenados por multiplicador</span>
        <span className="text-xs text-muted-foreground">— x = sin sensor todavía</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibles.map((t) => {
          const s = señalFormato(t.hipotesis, hoy);
          const refs = t.referencias?.[0]?.count ?? 0;
          return (
            <Link key={t.id} href={`/formatos/${t.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background transition hover:border-foreground">
              <div className={cn("relative flex h-40 flex-col justify-end p-3.5", t.portadaUrl ? "text-background" : "bg-foreground text-background")}>
                {t.portadaUrl && <><img src={t.portadaUrl} alt="" className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /></>}
                <span className={cn("absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium", t.estado === "detectado" ? "border border-background/60 bg-background/90 text-foreground" : "bg-background text-foreground")}>{ESTADO_FC[t.estado] ?? t.estado}</span>
                <span className="absolute right-2.5 top-2.5 rounded-full bg-background px-2 py-0.5 text-xs font-bold text-foreground">{t.multiplicador != null ? `${t.multiplicador}x` : "— x"}</span>
                <span className="relative font-mono text-[11px] tracking-widest opacity-80">{t.codigo} · {t.episodios} {t.episodios === 1 ? "episodio" : "episodios"}{!t.portada && " · sin portada"}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <p className="text-[15px] font-bold leading-tight">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">{[t.serie_propia && `Serie ${t.serie_propia}`, t.duracion].filter(Boolean).join(" · ") || "sin serie"}</p>
                <p className="flex flex-wrap gap-1">{t.etiquetas.map((et) => <span key={et} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{et}</span>)}</p>
                <p className="mt-auto flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">{s.tono && <span className={cn("size-[7px] rounded-full", s.tono === "ok" ? "bg-ok" : s.tono === "ambar" ? "bg-ambar" : "bg-rojo")} />}{s.texto}</span>
                  <span>{t.publicadas} publicadas · {refs} refs</span>
                </p>
              </div>
            </Link>
          );
        })}
        {esOwner && elegidas.length === 0 && <NuevoFormato variante="tarjeta" />}
      </div>
      {visibles.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Ningún formato con esas etiquetas. Un hueco en la biblioteca: si lo ves en una cuenta, créalo.</p>}
      <p className="text-xs text-muted-foreground">Verde: la hipótesis del formato resultó verdadera. Ámbar: le falta número y fecha, o ya venció. Rojo: no tiene hipótesis o resultó falsa. Un formato se valida con ocho episodios publicados y datos propios.</p>
    </div>
  );
}
