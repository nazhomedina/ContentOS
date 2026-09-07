import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { TableroIdeas, type IdeaCard } from "@/components/ideas/tablero-ideas";

export const metadata = { title: "Ideas" };
export const dynamic = "force-dynamic";

export default async function Ideas({ searchParams }: { searchParams: Promise<{ comunidad?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const { comunidad } = await searchParams;
  const supabase = await crearClienteServidor();

  const [{ data: comunidades }, { data: ideas }] = await Promise.all([
    supabase.from("comunidades").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("ideas")
      .select("id, titulo, origen, estado, etapa_embudo, notas, comunidad_id, formato_sugerido, notion_url, created_at, pensamientos(count)")
      .order("created_at", { ascending: false }),
  ]);
  const activa = comunidad ?? comunidades?.[0]?.id ?? "";
  const lista = ((ideas ?? []) as unknown as IdeaCard[]).filter((i) => !activa || i.comunidad_id === activa);

  return (
    <TableroIdeas
      ideas={lista}
      comunidades={comunidades ?? []}
      comunidadActiva={activa}
    />
  );
}
