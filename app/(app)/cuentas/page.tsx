import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ListaCuentas, type Cuenta } from "@/components/cuentas/lista-cuentas";

export const metadata = { title: "Cuentas en seguimiento" };
export const dynamic = "force-dynamic";

export default async function Cuentas() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("cuentas_referencia").select("id, handle, plataforma, nota, activa, ultimo_scrape, created_at").order("created_at");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Cuentas en seguimiento</h1>
        <p className="text-sm text-muted-foreground">La watchlist. Cuando entre el radar (v2), estas cuentas se scrapean a diario y sus outliers llegan como borradores a Ideas.</p>
      </header>
      <ListaCuentas cuentas={(data ?? []) as Cuenta[]} />
    </div>
  );
}
