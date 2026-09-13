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

  // Qué stream está maduro: cuántas entradas tiene cada borrador y cuántas preguntas de Claude siguen sin respuesta.
  const ids = (data ?? []).map((b) => b.id);
  const { data: pens } = ids.length
    ? await supabase.from("pensamientos").select("id, pieza_id, tipo, responde_a").in("pieza_id", ids)
    : { data: [] as { id: string; pieza_id: string | null; tipo: string; responde_a: string | null }[] };
  const respondidas = new Set((pens ?? []).filter((p) => p.tipo === "respuesta" && p.responde_a).map((p) => p.responde_a as string));
  const streamPor = new Map<string, { entradas: number; sin_responder: number }>();
  for (const p of pens ?? []) {
    if (!p.pieza_id) continue;
    const s = streamPor.get(p.pieza_id) ?? { entradas: 0, sin_responder: 0 };
    s.entradas += 1;
    if (p.tipo === "pregunta" && !respondidas.has(p.id)) s.sin_responder += 1;
    streamPor.set(p.pieza_id, s);
  }
  const borradores: Borrador[] = (data ?? []).map((b) => ({ ...(b as Borrador), stream: streamPor.get(b.id) ?? { entradas: 0, sin_responder: 0 } }));

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
      <Borradores borradores={borradores} />
    </div>
  );
}
