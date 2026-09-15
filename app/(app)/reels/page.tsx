import { TableroFormato, type FiltrosFormato } from "@/components/formato/tablero-formato";
import { PESTANAS_FORMATO } from "@/lib/dominio/estados";

export const metadata = { title: "Reels" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<FiltrosFormato> }) {
  const filtros = await searchParams;
  const p = PESTANAS_FORMATO.find((x) => x.ruta === "/reels")!;
  return <TableroFormato ruta={p.ruta} etiqueta={p.etiqueta} formatos={p.formatos} filtros={filtros} />;
}
