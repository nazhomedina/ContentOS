import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ListaHipotesis, type HipotesisFila } from "@/components/hipotesis/lista-hipotesis";
import { hoyISO } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Hipótesis" };
export const dynamic = "force-dynamic";

const VISTAS = [
  { clave: "", etiqueta: "Por resolver" },
  { clave: "abiertas", etiqueta: "Abiertas" },
  { clave: "incompletas", etiqueta: "Sin número ni fecha" },
  { clave: "resueltas", etiqueta: "Resueltas" },
];

/**
 * Las hipótesis, una por fila. Regla 1: ninguna pieza sin hipótesis; regla 2: una hipótesis se cierra con
 * número y fecha, no con opinión. Aquí se ve qué piezas responden a cada una y qué valor alcanzaron.
 */
export default async function Hipotesis({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol === "editor") redirect("/cola");
  const { v = "" } = await searchParams;
  const supabase = await crearClienteServidor();
  const hoy = hoyISO();
  const esOwner = sesion.perfil.rol === "owner";

  const { data } = await supabase
    .from("hipotesis")
    .select("id, texto, campo, numero, fecha, estado, veredicto, resuelta_en, created_at, piezas:piezas(id, id_publico, titulo, estado)")
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const todas = data ?? [];

  const esResoluble = (h: (typeof todas)[number]) => Boolean(h.campo && h.numero != null && h.fecha);
  const grupos = {
    "": todas.filter((h) => h.estado === "abierta" && esResoluble(h) && (h.fecha ?? "") <= hoy),
    abiertas: todas.filter((h) => h.estado === "abierta" && esResoluble(h) && (h.fecha ?? "") > hoy),
    incompletas: todas.filter((h) => h.estado === "abierta" && !esResoluble(h)),
    resueltas: todas.filter((h) => h.estado !== "abierta"),
  };
  const vista = (v in grupos ? v : "") as keyof typeof grupos;
  const seleccion = grupos[vista];

  // Evidencia solo para las resolubles que se muestran: valor alcanzado por cada pieza en el campo de la hipótesis.
  const evidencia = new Map<string, { pieza_id: string; valor: number | null; fecha: string | null }[]>();
  await Promise.all(seleccion.filter(esResoluble).slice(0, 60).map(async (h) => {
    const { data: e } = await supabase.rpc("evidencia_hipotesis", { p_hipotesis_id: h.id });
    evidencia.set(h.id, (e ?? []).map((x) => ({ pieza_id: x.pieza_id, valor: x.valor, fecha: x.fecha })));
  }));

  const filas: HipotesisFila[] = seleccion.map((h) => {
    const ev = evidencia.get(h.id) ?? [];
    return {
      id: h.id, texto: h.texto, campo: h.campo, numero: h.numero, fecha: h.fecha, estado: h.estado, veredicto: h.veredicto, resuelta_en: h.resuelta_en,
      vencida: Boolean(h.fecha && h.fecha <= hoy),
      piezas: (h.piezas ?? []).map((p) => {
        const x = ev.find((y) => y.pieza_id === p.id);
        return { id: p.id, id_publico: p.id_publico, titulo: p.titulo, estado: p.estado, valor: x?.valor ?? null, fecha: x?.fecha ?? null };
      }),
    };
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Hipótesis</h1>
          <p className="text-sm text-muted-foreground">
            Ninguna pieza sin hipótesis, y ninguna hipótesis sin número y fecha que la cierren. Varias piezas pueden responder a la misma. Cuando vence, se resuelve con los datos: verdadera, falsa o sin datos, y queda el veredicto.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISTAS.map((x) => (
            <Link key={x.clave} href={x.clave ? `/hipotesis?v=${x.clave}` : "/hipotesis"} className={cn("rounded-full border px-3 py-1 text-xs font-medium", vista === x.clave ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted", x.clave === "" && grupos[""].length > 0 && vista !== "" && "border-ambar text-ambar")}>
              {x.etiqueta} · {grupos[x.clave as keyof typeof grupos].length}
            </Link>
          ))}
        </div>
      </header>
      {vista === "incompletas" && (
        <p className="text-xs text-muted-foreground">Heredadas de Notion como texto libre. Con «Completar» se les pone campo, número y fecha; hasta entonces no se pueden resolver.</p>
      )}
      <ListaHipotesis filas={filas} puedeEditar={esOwner} />
    </div>
  );
}
