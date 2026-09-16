import { NOMBRE_ESTADO, subetapas, type EstadoPieza } from "@/lib/dominio/estados";
import { cn } from "@/lib/utils";

/**
 * El camino de estados de la pieza según su tipo: dónde va y qué sigue.
 * Los estados laterales (en trial, archivada) se muestran como aviso, no como paso.
 */
export function Camino({ tipo, estado, siguiente }: { tipo: string | null; estado: string; siguiente?: string | null }) {
  const pasos: EstadoPieza[] = ["borrador", ...subetapas(tipo), "programada", "publicada"];
  const lateral = estado === "en_trial" || estado === "archivada";
  const actual = lateral ? -1 : pasos.indexOf(estado as EstadoPieza);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-muted/30 px-3 py-2.5">
      <ol className="flex flex-wrap items-center">
        {pasos.map((p, i) => (
          <li key={p} className="flex items-center">
            <span className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              i === actual ? "bg-foreground text-background" : i < actual ? "text-foreground" : "text-muted-foreground",
            )}>
              {p === "listo" ? "Listo" : NOMBRE_ESTADO[p]}
            </span>
            {i < pasos.length - 1 && <span aria-hidden className={cn("mx-0.5 h-px w-4", i < actual ? "bg-foreground/50" : "bg-border")} />}
          </li>
        ))}
        {lateral && <li className="ml-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{NOMBRE_ESTADO[estado as EstadoPieza] ?? estado}</li>}
      </ol>
      {siguiente && <span className="text-xs text-muted-foreground">{siguiente}</span>}
    </div>
  );
}
