"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aprobarHistoriasSemana } from "@/lib/acciones/nodo";

export function BotonAprobarHistorias({ semana, n }: { semana: string; n: number }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      size="lg"
      className="w-full md:w-auto"
      disabled={pendiente}
      onClick={() => iniciar(async () => {
        const r = await aprobarHistoriasSemana(semana);
        if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
      })}
    >
      Aprobar las {n} historias y mandarlas a la cola de Mariela
    </Button>
  );
}
