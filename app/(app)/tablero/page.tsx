import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaHora } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tablero" };
export const dynamic = "force-dynamic";

export default async function Tablero() {
  const supabase = await crearClienteServidor();
  const { data: latidos } = await supabase.rpc("latidos");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Latidos</h1>
        <p className="text-sm text-muted-foreground">Una fila por sistema automático con su última corrida. Sin fila no hubo corrida.</p>
      </header>
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latidos</h2>
        <ul className="divide-y rounded-lg border text-sm">
          {(latidos ?? []).map((l) => (
            <li key={l.sistema} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold">{l.sistema}</p>
                <p className="truncate text-xs text-muted-foreground">{l.ultimo_resumen ?? "sin corridas"}</p>
              </div>
              <div className="text-right text-xs">
                <p className={cn("font-semibold", l.atrasado ? "text-rojo" : "text-ok")}>{l.atrasado ? "atrasado" : "al día"}</p>
                <p className="text-muted-foreground">{l.ultima_corrida ? fechaHora(l.ultima_corrida) : "nunca"}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
