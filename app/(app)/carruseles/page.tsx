import { TableroFormato } from "@/components/formato/tablero-formato";
import { PESTANAS_FORMATO } from "@/lib/dominio/estados";

export const metadata = { title: "Carruseles" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const p = PESTANAS_FORMATO.find((x) => x.ruta === "/carruseles")!;
  return <TableroFormato ruta={p.ruta} etiqueta={p.etiqueta} formatos={p.formatos} vista={vista === "publicados" ? "publicados" : "produccion"} />;
}
