"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { volverAVersion } from "@/lib/acciones/redaccion";

export type Version = {
  version: number;
  guion: string;
  hipotesis: string;
  fidelidad: string | null;
  instruccion: string | null;
  autor: string | null;
  cuando: string;
};

/** Historial del guion. La más alta es la vigente; a cualquier otra se puede volver (entra como versión nueva). */
export function Versiones({ piezaId, versiones, puedeVolver }: { piezaId: string; versiones: Version[]; puedeVolver: boolean }) {
  const [pendiente, iniciar] = useTransition();
  if (versiones.length === 0) return null;
  const vigente = Math.max(...versiones.map((v) => v.version));
  const orden = [...versiones].sort((a, b) => b.version - a.version);

  function volver(v: number) {
    iniciar(async () => {
      const r = await volverAVersion(piezaId, v);
      if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    });
  }

  return (
    <details className="group rounded-xl border">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
        <History className="size-3.5" /> Versiones del guion <span className="font-medium normal-case tracking-normal">· {versiones.length}</span>
      </summary>
      <ol className="divide-y border-t">
        {orden.map((v) => (
          <li key={v.version} className="px-4 py-3 text-sm">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-xs [&::-webkit-details-marker]:hidden">
                <span className="font-mono font-bold">v{v.version}</span>
                {v.version === vigente && <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">vigente</span>}
                <span className="text-muted-foreground">{v.autor ?? "claude"} · {v.fidelidad ?? "—"} · {v.cuando}</span>
                {v.instruccion && <span className="text-muted-foreground">· «{v.instruccion}»</span>}
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">Hipótesis: {v.hipotesis}</p>
                <Markdown texto={v.guion} />
                {puedeVolver && v.version !== vigente && (
                  <Button size="sm" variant="outline" disabled={pendiente} onClick={() => volver(v.version)}>Volver a esta versión</Button>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </details>
  );
}
