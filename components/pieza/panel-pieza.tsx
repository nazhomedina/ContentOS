"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

/**
 * Panel lateral para una pieza: entra desde la derecha y deja la pantalla de atrás intacta.
 * Cerrar (Esc, clic fuera o la X) regresa a donde estabas; las pestañas del panel no apilan historial.
 */
export function PanelPieza({ id, children }: { id: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(true);
  const origen = useRef(pathname);

  // Si la ruta deja de ser esta pieza (navegó a otra pantalla desde el panel), el panel se cierra solo.
  useEffect(() => {
    if (!pathname.startsWith(`/piezas/${id}`)) setAbierto(false);
    else setAbierto(true);
  }, [pathname, id]);

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        if (!o) {
          setAbierto(false);
          if (origen.current.startsWith(`/piezas/${id}`)) router.back();
        }
      }}
    >
      <SheetContent side="right" showCloseButton={false} className="w-[min(72rem,96vw)] gap-0 overflow-y-auto p-0 data-[side=right]:w-[min(72rem,96vw)] data-[side=right]:sm:max-w-none">
        <SheetTitle className="sr-only">Pieza</SheetTitle>
        <div className="sticky top-0 z-10 flex items-center justify-end gap-1 border-b bg-popover/95 px-4 py-2 backdrop-blur">
          <a href={`/piezas/${id}`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            <Maximize2 className="size-3.5" /> Página completa
          </a>
          <SheetClose className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" /> Cerrar
          </SheetClose>
        </div>
        <div className="px-5 py-5 sm:px-7">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
