import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { Captura } from "@/components/pieza/captura";
import { Borradores, type Borrador } from "@/components/ideas/borradores";

export const metadata = { title: "Ideas" };
export const dynamic = "force-dynamic";

export default async function Ideas({ searchParams }: { searchParams: Promise<{ formato?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const { formato } = await searchParams;
  const supabase = await crearClienteServidor();
  let q = supabase.from("piezas").select("id, id_publico, titulo, notas, origen, formato_sugerido, notion_url, created_at").eq("estado", "borrador").order("created_at", { ascending: false });
  if (formato) q = q.contains("formato_sugerido", [formato]);
  const { data } = await q;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            El espacio de borrador. Se alimenta desde aquí, desde Claude o Cowork por MCP, y desde Claude Code. Elegir formato y «Producir» la manda a redacción en su pestaña.
          </p>
        </div>
        <Captura />
      </header>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{(data ?? []).length} borradores</p>
      <Borradores borradores={(data ?? []) as Borrador[]} />
    </div>
  );
}
