import { DetallePieza } from "@/components/pieza/detalle-pieza";

export const dynamic = "force-dynamic";

/** La pieza en página completa: liga directa, recarga o pestaña nueva. Desde la app se abre en el panel lateral (@modal). */
export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string; v?: string }> }) {
  const { id } = await params;
  const { vista, v } = await searchParams;
  return <DetallePieza id={id} vista={vista} v={v} />;
}
