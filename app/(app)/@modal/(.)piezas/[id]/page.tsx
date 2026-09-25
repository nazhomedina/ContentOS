import { DetallePieza } from "@/components/pieza/detalle-pieza";
import { PanelPieza } from "@/components/pieza/panel-pieza";

export const dynamic = "force-dynamic";

/**
 * La pieza abierta desde cualquier pantalla de la app: se intercepta la ruta /piezas/[id] y se muestra en un panel
 * que entra desde la derecha, sin dejar la pantalla de atrás. La liga directa o una recarga abren la página completa.
 */
export default async function PiezaEnPanel({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string; v?: string }> }) {
  const { id } = await params;
  const { vista, v } = await searchParams;
  return (
    <PanelPieza id={id}>
      <DetallePieza id={id} vista={vista} v={v} enPanel />
    </PanelPieza>
  );
}
