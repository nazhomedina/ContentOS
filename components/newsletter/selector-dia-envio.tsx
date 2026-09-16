"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { guardarDiaEnvio } from "@/lib/acciones/newsletter";
import { DIAS_ENVIO } from "@/lib/dominio/newsletter";

/** «Sale los viernes»: el día de envío del newsletter, editable por el owner. */
export function SelectorDiaEnvio({ dia, puedeEditar }: { dia: number; puedeEditar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  if (!puedeEditar) return <span className="text-xs text-muted-foreground">Sale los {DIAS_ENVIO.find((d) => d[0] === dia)?.[1]}</span>;
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      Sale los
      <select
        value={dia}
        disabled={pendiente}
        onChange={(e) => iniciar(async () => { const r = await guardarDiaEnvio(Number(e.target.value)); if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje); })}
        className="h-7 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
        aria-label="Día de envío del newsletter"
      >
        {DIAS_ENVIO.map(([n, nombre]) => <option key={n} value={n}>{nombre}</option>)}
      </select>
    </label>
  );
}
