import { TableroFormato, type FiltrosFormato } from "@/components/formato/tablero-formato";
import { PESTANAS_FORMATO } from "@/lib/dominio/estados";

export const metadata = { title: "Artículos" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<FiltrosFormato> }) {
  const filtros = await searchParams;
  const p = PESTANAS_FORMATO.find((x) => x.ruta === "/articulos")!;
  return <TableroFormato ruta={p.ruta} etiqueta={p.etiqueta} formatos={p.formatos} filtros={filtros} />;
}
