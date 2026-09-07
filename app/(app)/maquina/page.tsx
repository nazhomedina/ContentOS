import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, lunesDe, lunesDeHoy, sumarDias } from "@/lib/dominio/tiempo";
import { resumenSistema, type AristaDef, type NodoEstado } from "@/lib/dominio/nodo";
import { Grafo } from "@/components/maquina/grafo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Máquina" };
export const dynamic = "force-dynamic";

export default async function Maquina({ searchParams }: { searchParams: Promise<{ sistema?: string; semana?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const { sistema: sParam, semana: wParam } = await searchParams;
  const semana = wParam && /^\d{4}-\d{2}-\d{2}$/.test(wParam) ? lunesDe(wParam) : lunesDeHoy();
  const supabase = await crearClienteServidor();

  const { data: sistemas } = await supabase.from("sistemas").select("clave, nombre, proposito, nodos, aristas, version, updated_at").eq("activo", true).order("orden");
  if (!sistemas?.length) {
    return <p className="text-sm text-muted-foreground">No hay sistemas definidos. Se definen desde Claude con definir_sistema.</p>;
  }
  const activo = sistemas.find((x) => x.clave === sParam) ?? sistemas[0];
  const estados = await Promise.all(sistemas.map(async (x) => {
    const { data } = await supabase.rpc("estado_nodos", { p_clave: x.clave, p_semana: semana });
    return [x.clave, (data ?? []) as NodoEstado[]] as const;
  }));
  const porSistema = Object.fromEntries(estados);
  const nodos = porSistema[activo.clave] ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">La máquina · semana del {fechaCorta(semana)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{activo.nombre}</h1>
          {activo.proposito && <p className="max-w-2xl text-sm text-muted-foreground">{activo.proposito}</p>}
        </div>
        <div className="flex gap-1 text-xs">
          <Link href={`/maquina?sistema=${activo.clave}&semana=${sumarDias(semana, -7)}`} className="rounded-md border px-3 py-2">← semana</Link>
          <Link href={`/maquina?sistema=${activo.clave}`} className="rounded-md border px-3 py-2 font-medium">hoy</Link>
          <Link href={`/maquina?sistema=${activo.clave}&semana=${sumarDias(semana, 7)}`} className="rounded-md border px-3 py-2">semana →</Link>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {sistemas.map((x) => {
          const r = resumenSistema(porSistema[x.clave] ?? []);
          const es = x.clave === activo.clave;
          return (
            <Link
              key={x.clave}
              href={`/maquina?sistema=${x.clave}&semana=${semana}`}
              className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm", es ? "border-foreground bg-foreground text-background" : "hover:bg-muted/50")}
            >
              <span className={cn("size-2 rounded-full", r.peor === "corrio" ? "bg-ok" : r.peor === "agendado" ? "bg-ambar" : r.peor === "hueco" ? "bg-muted-foreground" : "bg-rojo")} />
              {x.nombre}
            </Link>
          );
        })}
      </nav>

      <Grafo
        sistema={activo.clave}
        semana={semana}
        nodos={nodos}
        aristas={(activo.aristas as AristaDef[]) ?? []}
        puedeDeclarar={sesion.perfil.rol === "owner"}
      />

      <p className="text-xs text-muted-foreground">
        Versión {activo.version} · el sistema se redefine desde Claude con <code className="font-mono">definir_sistema</code>. Los nodos se pintan con la evidencia de esta semana: nada se estima.
      </p>
    </div>
  );
}
