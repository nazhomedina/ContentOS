import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { DIAS_SEMANA, fechaCorta, lunesDe, lunesDeHoy, sumarDias } from "@/lib/dominio/tiempo";
import { TarjetaHistoria, type HistoriaCard } from "@/components/historias/tarjeta-historia";
import type { Rol } from "@/lib/dominio/roles";

export const metadata = { title: "Historias de la semana" };
export const dynamic = "force-dynamic";

export default async function Historias({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { semana: s } = await searchParams;
  const semana = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? lunesDe(s) : lunesDeHoy();
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("historias")
    .select("id, dia, orden, serie, registro, copy, asset_url, keyword, estado, programada_para, publicada_en, views, replies, dms, pieza:piezas!historias_pieza_amplificada_id_fkey(id, id_publico, titulo), recurso:recursos(nombre, slug_go)")
    .eq("semana", semana)
    .neq("estado", "descartada")
    .order("dia").order("orden");

  const historias = (data ?? []) as unknown as HistoriaCard[];
  const rol = sesion.perfil.rol as Rol;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Historias</h1>
          <p className="text-sm text-muted-foreground">Semana del {fechaCorta(semana)} · {historias.length} historias</p>
        </div>
        <div className="flex gap-1">
          <Link href={`/historias?semana=${sumarDias(semana, -7)}`} className="rounded-md border p-2" aria-label="Semana anterior"><ChevronLeft className="size-4" /></Link>
          <Link href="/historias" className="rounded-md border px-3 py-2 text-xs font-medium">Hoy</Link>
          <Link href={`/historias?semana=${sumarDias(semana, 7)}`} className="rounded-md border p-2" aria-label="Semana siguiente"><ChevronRight className="size-4" /></Link>
        </div>
      </header>

      {historias.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {rol === "editor" ? "Nazho todavía no aprueba historias para esta semana." : "No hay historias en esta semana."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 lg:gap-2">
        {DIAS_SEMANA.map((nombre, i) => {
          const dia = i + 1;
          const delDia = historias.filter((h) => h.dia === dia);
          if (delDia.length === 0 && historias.length > 0) return <div key={dia} className="hidden lg:block" />;
          if (delDia.length === 0) return null;
          return (
            <section key={dia} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {nombre} <span className="font-medium">· {fechaCorta(sumarDias(semana, i)).replace(/^\w+ /, "")}</span>
              </h2>
              {delDia.map((h) => <TarjetaHistoria key={h.id} historia={h} rol={rol} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}
