import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { Markdown } from "@/components/markdown";

export const metadata = { title: "Identidad" };
export const dynamic = "force-dynamic";

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length;

export default async function Identidad() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const { data: filas } = await supabase.from("identidad").select("clave, orden, titulo, resumen, cuerpo, version, actualizado, motivo").eq("vigente", true).order("orden");
  if (!filas?.length) return <p className="text-sm text-muted-foreground">La identidad todavía no está cargada. Se carga con <code>scripts/seed-identidad.mjs</code>.</p>;
  const esOwner = sesion.perfil.rol === "owner";
  const ultima = filas.reduce((m, f) => (f.actualizado > m ? f.actualizado : m), "");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Identidad</h1>
        <p className="text-sm text-muted-foreground">
          La verdad universal de quién es Nazho y cómo escribe. Todo agente la lee antes de escribir o decidir por él.
          {" "}Última edición {fechaCorta(ultima)}.
          {esOwner && <> Se edita desde Claude con <code>actualizar_identidad</code>; cada cambio guarda la versión anterior.</>}
        </p>
      </header>

      <nav aria-label="Filas" className="flex flex-wrap gap-2">
        {filas.map((f) => (
          <a key={f.clave} href={`#${f.clave}`} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
            <span className="font-semibold">{f.orden}.</span> {f.titulo}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {filas.map((f) => (
          <section key={f.clave} id={f.clave} className="scroll-mt-20 rounded-lg border">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
              <h2 className="text-lg font-bold"><span className="text-muted-foreground">{f.orden}.</span> {f.titulo}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                <code>{f.clave}</code> · v{f.version} · {palabras(f.cuerpo)} palabras · {fechaCorta(f.actualizado)}
              </p>
            </div>
            <p className="border-b bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{f.resumen}</p>
            <div className="px-4 py-4">
              <Markdown texto={f.cuerpo} />
            </div>
            {f.motivo && f.version > 1 && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Último cambio: {f.motivo}</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
