import Link from "next/link";
import { BOLSAS, FILTROS_TIPO, NOMBRE_BOLSA, type Bolsa } from "@/lib/dominio/tablero";
import { cn } from "@/lib/utils";

/** Chips de bolsa (izquierda) y de tipo (derecha). Todo por URL, así se comparte y sobrevive a un refresh. */
export function Filtros({ bolsa, tipo, conteos }: { bolsa: Bolsa; tipo: string; conteos: Record<Bolsa, number> }) {
  const href = (b: string, t: string) => `/cola?bolsa=${b}${t !== "todo" ? `&tipo=${t}` : ""}`;
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <nav aria-label="Bolsa" className="flex gap-1.5 overflow-x-auto">
        {BOLSAS.map((b) => (
          <Link
            key={b}
            href={href(b, tipo)}
            aria-current={b === bolsa ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium tabular-nums",
              b === bolsa ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {NOMBRE_BOLSA[b]} · {conteos[b]}
          </Link>
        ))}
      </nav>
      <nav aria-label="Tipo" className="flex items-center gap-1.5 overflow-x-auto">
        <span className="hidden text-xs text-muted-foreground md:inline">Tipo</span>
        {FILTROS_TIPO.map((f) => (
          <Link
            key={f.clave}
            href={href(bolsa, f.clave)}
            aria-current={f.clave === tipo ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              f.clave === tipo ? "border-foreground text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.etiqueta}
          </Link>
        ))}
      </nav>
    </div>
  );
}
