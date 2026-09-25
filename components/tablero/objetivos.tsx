import type { Objetivo } from "@/lib/dominio/tablero";
import { cn } from "@/lib/utils";

/** Cuatro tiles: número grande, barra (publicado en negro, programado en azul) y un dato de contexto. */
export function Objetivos({ objetivos }: { objetivos: Objetivo[] }) {
  return (
    <section aria-label="Objetivos de la semana" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {objetivos.map((o) => {
        const pubPct = Math.min(100, (o.publicadas / Math.max(1, o.meta)) * 100);
        const camPct = Math.min(100 - pubPct, (o.enCamino / Math.max(1, o.meta)) * 100);
        return (
          <article key={o.tipo} className={cn("flex flex-col gap-2 rounded-xl border p-4", o.tono === "rojo" && "border-rojo", o.tono === "ok" && "border-ok")}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold text-muted-foreground">{o.nombre}</span>
              <span className={cn("truncate text-xs", o.tono === "rojo" ? "font-semibold text-rojo" : o.tono === "ok" ? "font-semibold text-ok" : "text-muted-foreground")}>{o.contexto}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">{o.publicadas}</span>
              <span className="text-[15px] text-muted-foreground">de {o.meta}{o.tipo === "historia_dia" ? " días" : ""}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${o.publicadas} publicadas y ${o.enCamino} programadas de ${o.meta}`}>
              <div className="h-full bg-foreground" style={{ width: `${pubPct}%` }} />
              <div className="h-full bg-primary" style={{ width: `${camPct}%` }} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
