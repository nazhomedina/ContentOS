import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ListaSeries, type SerieFila } from "@/components/series/lista-series";

export const metadata = { title: "Series" };
export const dynamic = "force-dynamic";

/** Las series declaradas: colecciones con nombre y descripción que se prenden y se apagan. Junto a Formatos e Hipótesis. */
export default async function Series() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";

  const [{ data: series }, { data: formatos }] = await Promise.all([
    supabase.from("series").select("id, nombre, descripcion, activa").order("activa", { ascending: false }).order("nombre"),
    supabase.from("formatos").select("codigo, serie_propia"),
  ]);
  const filas: SerieFila[] = await Promise.all((series ?? []).map(async (s) => {
    const { data: r } = await supabase.rpc("resumen_serie", { p_nombre: s.nombre });
    const x = r?.[0];
    return {
      ...s, formato: (formatos ?? []).find((f) => f.serie_propia === s.nombre)?.codigo ?? null,
      piezas: x?.piezas ?? 0, en_produccion: x?.en_produccion ?? 0, publicadas: x?.publicadas ?? 0, ultima_publicada: x?.ultima_publicada ?? null,
    };
  }));
  const activas = filas.filter((s) => s.activa).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Series</h1>
        <p className="text-sm text-muted-foreground">
          Una serie es una colección de piezas con nombre propio: Criterio, Róbate, Brand Reels. Se declara aquí con su descripción y se prende o se apaga; en la pieza se elige como etiqueta, y una pieza puede pertenecer a varias. {activas} activas de {filas.length}.
        </p>
      </header>
      <ListaSeries series={filas} puedeEditar={esOwner} />
    </div>
  );
}
