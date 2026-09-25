import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { NOMBRE_TIPO, type Tipo } from "@/lib/dominio/estados";
import { fechaCorta, hoyISO, sumarDias } from "@/lib/dominio/tiempo";
import { IdPublico } from "@/components/app/insignias";
import { BotonYaGrabe } from "./ya-grabe";
import { cn } from "@/lib/utils";

const TOPE = 10;

type PiezaMesa = {
  id: string; id_publico: string | null; titulo: string | null; tipo: string | null; estado: string;
  fecha_objetivo: string | null; programa_aprobado: boolean; contenido: string | null; hipotesis_id: string | null;
  updated_at: string; formato: { codigo: string } | null;
};

const palabras = (t: string | null) => (t ?? "").trim().split(/\s+/).filter(Boolean).length;
const nombreTipo = (t: string | null) => NOMBRE_TIPO[t as Tipo] ?? t ?? "sin tipo";

/**
 * Tu mesa: lo que solo Nazho mueve. Para grabar (piezas en grabación) y para redactar (en redacción),
 * con qué tiene cada una y cuándo sale. El banco de yaps con programa aprobado va aparte, como cifra.
 * Arriba, cuánto del tope de producción está ocupado.
 */
export async function TuMesa() {
  const supabase = await crearClienteServidor();
  const hoy = hoyISO();
  const finSemana = sumarDias(hoy, 7);

  const { data } = await supabase
    .from("piezas")
    .select("id, id_publico, titulo, tipo, estado, fecha_objetivo, programa_aprobado, contenido, hipotesis_id, updated_at, formato:formatos(codigo)")
    .in("estado", ["grabacion", "redaccion"])
    .order("fecha_objetivo", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  const todas = (data ?? []) as unknown as PiezaMesa[];

  const ids = todas.filter((p) => p.estado === "grabacion").map((p) => p.id);
  const { data: raws } = ids.length ? await supabase.from("assets").select("pieza_id").eq("carpeta", "raw").in("pieza_id", ids) : { data: [] };
  const conRaw = new Set((raws ?? []).map((r) => r.pieza_id));

  const enTope = todas.filter((p) => !p.programa_aprobado);
  const banco = todas.filter((p) => p.programa_aprobado);
  const grabar = enTope.filter((p) => p.estado === "grabacion");
  const redactar = enTope.filter((p) => p.estado === "redaccion");
  const bancoGrabar = banco.filter((p) => p.estado === "grabacion").length;
  const bancoRedactar = banco.filter((p) => p.estado === "redaccion").length;
  const lleno = enTope.length >= TOPE;

  const fecha = (p: PiezaMesa) => {
    if (!p.fecha_objetivo) return { texto: "sin fecha", tono: "normal" as const };
    if (p.fecha_objetivo < hoy) return { texto: `venció ${fechaCorta(p.fecha_objetivo)}`, tono: "rojo" as const };
    if (p.fecha_objetivo <= finSemana) return { texto: `sale ${fechaCorta(p.fecha_objetivo)}`, tono: "ambar" as const };
    return { texto: `sale ${fechaCorta(p.fecha_objetivo)}`, tono: "normal" as const };
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Tu mesa</h2>
        <p className={cn("text-xs", lleno ? "font-semibold text-rojo" : "text-muted-foreground")}>
          Tope de producción {enTope.length} / {TOPE}{lleno ? " · lleno: nada nuevo entra a redacción hasta que algo pase a diseño o vuelva a borrador" : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Columna
          titulo="Para grabar"
          n={grabar.length}
          vacio="Nada esperando cámara."
          pie={bancoGrabar > 0 ? <>y <b>{bancoGrabar}</b> yaps del banco con programa aprobado · <Link href="/reels?estado=grabacion" className="underline">ver todos</Link></> : null}
        >
          {grabar.map((p) => {
            const f = fecha(p);
            const n = palabras(p.contenido);
            const raw = conRaw.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-baseline gap-2 hover:underline">
                    <IdPublico id={p.id_publico} />
                    <span className="truncate text-sm font-semibold">{p.titulo ?? "(sin título)"}</span>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {nombreTipo(p.tipo)}{p.formato ? ` · ${p.formato.codigo}` : ""} · {n > 0 ? `guion de ${n} palabras` : <span className="text-ambar">sin guion</span>}
                    {raw && <span className="font-semibold text-ok"> · RAW subido</span>}
                  </p>
                </div>
                <span className={cn("shrink-0 text-xs", f.tono === "rojo" && "font-semibold text-rojo", f.tono === "ambar" && "font-semibold text-ambar", f.tono === "normal" && "text-muted-foreground")}>{f.texto}</span>
                <BotonYaGrabe piezaId={p.id} />
              </li>
            );
          })}
        </Columna>

        <Columna
          titulo="Para redactar"
          n={redactar.length}
          vacio="Nada en redacción."
          pie={<>{bancoRedactar > 0 && <>y <b>{bancoRedactar}</b> yaps del banco con programa aprobado · </>}La redacción pasa en Cowork: «entrevístame sobre CAR-04».</>}
        >
          {redactar.map((p) => {
            const f = fecha(p);
            const n = palabras(p.contenido);
            const falta = [!p.hipotesis_id && "hipótesis", n === 0 && "contenido"].filter(Boolean).join(" y ");
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link href={`/piezas/${p.id}`} className="flex min-w-0 items-baseline gap-2 hover:underline">
                    <IdPublico id={p.id_publico} />
                    <span className="truncate text-sm font-semibold">{p.titulo ?? "(sin título)"}</span>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {nombreTipo(p.tipo)}{p.formato ? ` · ${p.formato.codigo}` : ""} · {n > 0 ? `${n} palabras` : "sin texto"}
                    {falta && <span className="text-ambar"> · falta {falta}</span>}
                  </p>
                </div>
                <span className={cn("shrink-0 text-xs", f.tono === "rojo" && "font-semibold text-rojo", f.tono === "ambar" && "font-semibold text-ambar", f.tono === "normal" && "text-muted-foreground")}>{f.texto}</span>
              </li>
            );
          })}
        </Columna>
      </div>
    </section>
  );
}

function Columna({ titulo, n, vacio, pie, children }: { titulo: string; n: number; vacio: string; pie: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between px-0.5">
        <h3 className="text-sm font-bold">{titulo}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
      </div>
      {n === 0 ? <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">{vacio}</p> : <ul className="divide-y rounded-lg border">{children}</ul>}
      {pie && <p className="px-0.5 text-xs text-muted-foreground">{pie}</p>}
    </div>
  );
}
