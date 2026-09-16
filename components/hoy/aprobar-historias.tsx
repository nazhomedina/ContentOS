"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aprobarHistoriasSemana } from "@/lib/acciones/nodo";

export function BotonAprobarHistorias({ semana, n, compacto = false }: { semana: string; n: number; compacto?: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      size={compacto ? "sm" : "lg"}
      className={compacto ? undefined : "w-full md:w-auto"}
      disabled={pendiente}
      onClick={() => iniciar(async () => {
        const r = await aprobarHistoriasSemana(semana);
        if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
      })}
    >
      {compacto ? `Aprobar la semana · ${n}` : `Aprobar las ${n} historias y mandarlas a la cola de Mariela`}
    </Button>
  );
}
