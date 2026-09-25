"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cambiarEstadoPieza } from "@/lib/acciones/piezas";

/** Grabación → diseño: la pieza pasa a «Para trabajar» en el tablero de Mariela y libera un lugar del tope. */
export function BotonYaGrabe({ piezaId }: { piezaId: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pendiente}
      onClick={() => iniciar(async () => {
        const r = await cambiarEstadoPieza(piezaId, "diseno");
        if (r.ok) toast.success("Grabada: ya está en «Para trabajar» de Mariela.");
        else toast.error(r.mensaje);
      })}
    >
      Ya grabé
    </Button>
  );
}
