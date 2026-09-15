import { TableroTipo, type FiltrosTipo } from "@/components/formato/tablero-formato";
import { PESTANAS_TIPO } from "@/lib/dominio/estados";

export const metadata = { title: "Artículos" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<FiltrosTipo> }) {
  const filtros = await searchParams;
  const p = PESTANAS_TIPO.find((x) => x.ruta === "/articulos")!;
  return <TableroTipo ruta={p.ruta} etiqueta={p.etiqueta} tipos={p.tipos} filtros={filtros} />;
}
