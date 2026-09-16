import { TableroNewsletter } from "@/components/newsletter/tablero-newsletter";

export const metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  return <TableroNewsletter vista={vista} />;
}
