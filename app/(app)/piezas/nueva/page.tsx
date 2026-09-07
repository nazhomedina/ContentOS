import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { FormularioPieza } from "@/components/pieza/formulario-pieza";
import { lunesDeHoy } from "@/lib/dominio/tiempo";

export const metadata = { title: "Nueva pieza" };
export const dynamic = "force-dynamic";

export default async function NuevaPieza({ searchParams }: { searchParams: Promise<{ formato?: string; semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const { formato, semana } = await searchParams;
  const supabase = await crearClienteServidor();
  const [{ data: comunidades }, { data: cards }, { data: perfiles }, { data: ultimos }] = await Promise.all([
    supabase.from("comunidades").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("format_cards").select("id, codigo, nombre").order("codigo"),
    supabase.from("perfiles").select("user_id, nombre, rol").in("rol", ["owner", "editor"]).order("nombre"),
    supabase.from("piezas").select("id_publico").order("created_at", { ascending: false }).limit(200),
  ]);

  // Sugerencia de ID: siguiente número del prefijo más usado recientemente por formato.
  const prefijos = (ultimos ?? []).map((p) => p.id_publico.split("-")[0]);
  const sugerido = prefijos.find((p) => !p.startsWith("DEMO")) ?? "SLT";
  const nums = (ultimos ?? []).filter((p) => p.id_publico.startsWith(sugerido + "-")).map((p) => parseInt(p.id_publico.split("-")[1], 10)).filter((n) => !Number.isNaN(n));
  const siguiente = `${sugerido}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Nueva pieza</h1>
        <p className="text-sm text-muted-foreground">Sin hipótesis con campo, número y fecha no se crea. Es la regla 1 de la constitución.</p>
      </header>
      <FormularioPieza
        comunidades={comunidades ?? []}
        cards={cards ?? []}
        perfiles={perfiles ?? []}
        inicial={{ formato: formato ?? "reel", id_publico: siguiente, semana: semana ?? lunesDeHoy() }}
      />
    </div>
  );
}
