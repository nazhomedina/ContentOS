import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { Captura } from "@/components/pieza/captura";
import { Borradores, type Borrador } from "@/components/ideas/borradores";

export const metadata = { title: "Ideas" };
export const dynamic = "force-dynamic";

export default async function Ideas({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const { tipo } = await searchParams;
  const supabase = await crearClienteServidor();
  let q = supabase.from("piezas").select("id, id_publico, titulo, notas, etiquetas, notion_url, created_at").eq("estado", "borrador").order("created_at", { ascending: false });
  if (tipo) q = q.ilike("notas", `%Formato sugerido: %${tipo}%`);
  const { data } = await q;

  const borradores: Borrador[] = (data ?? []) as Borrador[];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            El espacio de borrador. Se alimenta desde aquí y desde Claude Cowork por MCP; la entrevista y la redacción pasan allá. Elegir tipo y «Producir» la manda a redacción en su pestaña.
          </p>
        </div>
        <Captura />
      </header>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{(data ?? []).length} borradores</p>
      <Borradores borradores={borradores} />
    </div>
  );
}
