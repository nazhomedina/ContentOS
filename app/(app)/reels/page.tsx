import { TableroTipo, type FiltrosTipo } from "@/components/formato/tablero-formato";
import { PESTANAS_TIPO } from "@/lib/dominio/estados";

export const metadata = { title: "Reels" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<FiltrosTipo> }) {
  const filtros = await searchParams;
  const p = PESTANAS_TIPO.find((x) => x.ruta === "/reels")!;
  return <TableroTipo ruta={p.ruta} etiqueta={p.etiqueta} tipos={p.tipos} filtros={filtros} />;
}
