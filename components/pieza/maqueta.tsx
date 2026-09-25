import Link from "next/link";
import { ExternalLink, Download } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { leerMaqueta } from "@/lib/maquetas";
import { fechaHora } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

/**
 * La pestaña Maqueta de una pieza: la versión elegida (la vigente por defecto) en un iframe con sandbox vacío
 * (sin scripts, sin formularios, sin acceso a la app), el selector de versiones y el aviso si el copy avanzó.
 */
export async function MaquetaPieza({ piezaId, idPublico, version }: { piezaId: string; idPublico: string; version?: number }) {
  const supabase = await crearClienteServidor();
  const [{ data: versiones }, m] = await Promise.all([
    supabase.from("assets").select("version, contenido_version, nota, created_at").eq("pieza_id", piezaId).eq("carpeta", "maqueta").not("version", "is", null).order("version", { ascending: false }),
    leerMaqueta(supabase, piezaId, version),
  ]);

  if (!m) {
    return (
      <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
        Esta pieza no tiene maqueta. Diseña desde las notas visuales, o pídele a Claude la maqueta con guardar_maqueta.
      </div>
    );
  }

  const { data: descarga } = await supabase.storage.from("assets").createSignedUrl(m.ruta, 600, { download: `${idPublico}-maqueta-v${m.version}.html` });
  const vigente = versiones?.[0]?.version;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Versiones de la maqueta" className="flex flex-wrap items-center gap-1.5">
          {(versiones ?? []).map((v) => (
            <Link
              key={v.version}
              href={`/piezas/${piezaId}?vista=maqueta&v=${v.version}`}
              aria-current={v.version === m.version ? "page" : undefined}
              title={`${fechaHora(v.created_at)}${v.nota ? ` · ${v.nota}` : ""}`}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium tabular-nums", v.version === m.version ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
            >
              v{v.version}{v.version === vigente ? " · vigente" : ""}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <a href={`/piezas/${piezaId}/maqueta/v${m.version}`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted">
            <ExternalLink className="size-3.5" /> Abrir en pestaña nueva
          </a>
          {descarga?.signedUrl && (
            <a href={descarga.signedUrl} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted">
              <Download className="size-3.5" /> Descargar .html
            </a>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        v{m.version} · {fechaHora(m.created_at)}{m.contenido_version ? ` · sobre el copy v${m.contenido_version}` : ""}{m.nota ? ` · ${m.nota}` : ""}
      </p>

      {m.desactualizada && (
        <p className="rounded-md border border-ambar/60 bg-ambar/10 px-3 py-2 text-sm">
          Maqueta de la versión {m.contenido_version ?? 0} del copy; el copy va en la {m.contenido_actual}. Pide una maqueta nueva o diseña sobre el copy.
        </p>
      )}

      {m.html ? (
        <iframe
          srcDoc={m.html}
          sandbox=""
          referrerPolicy="no-referrer"
          title={`Maqueta ${idPublico} v${m.version}`}
          className="h-[80vh] w-full rounded-xl border bg-white"
        />
      ) : (
        <p className="rounded-xl border border-dashed px-5 py-6 text-sm text-muted-foreground">No se pudo leer el archivo de esta versión.</p>
      )}
    </div>
  );
}
