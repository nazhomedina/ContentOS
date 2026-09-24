"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { correrJobAhora } from "@/lib/acciones/jobs";
import { fechaHora } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type LatidoFila = { sistema: string; descripcion: string | null; dueno: string | null; esperado_cada: string; ultima_corrida: string | null; ultimo_estado: string | null; ultimo_resumen: string | null; atrasado: boolean; puedeCorrer: boolean; listo: boolean; faltan: string[] };

/** Los latidos: qué sistema corrió, cuándo y si va atrasado. Los de la app se pueden correr a mano. */
export function Latidos({ filas, esOwner }: { filas: LatidoFila[]; esOwner: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <ul className="divide-y rounded-xl border text-sm">
      {filas.map((l) => (
        <li key={l.sistema} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", l.atrasado ? "bg-rojo" : l.ultimo_estado === "error" ? "bg-rojo" : "bg-ok")} />
            <span className="min-w-0">
              <span className="font-mono text-xs font-semibold">{l.sistema}</span>
              <span className="ml-2 text-xs text-muted-foreground">{l.dueno ?? ""}{l.dueno && l.descripcion ? " · " : ""}{l.descripcion ?? ""}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {l.ultima_corrida ? <>última {fechaHora(l.ultima_corrida)} · {l.ultimo_estado}{l.ultimo_resumen && ` · ${l.ultimo_resumen}`}</> : "nunca ha corrido"}
                {l.atrasado && <span className="text-rojo"> · atrasado (cada {l.esperado_cada})</span>}
              </span>
            </span>
          </span>
          {esOwner && l.puedeCorrer && (
            l.listo
              ? <Button size="sm" variant="outline" className="h-7" disabled={pendiente} onClick={() => iniciar(async () => { const r = await correrJobAhora(l.sistema); if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje); })}><Play className="size-3.5" /> Correr ahora</Button>
              : <span className="text-[11px] text-ambar">falta {l.faltan.join(", ")} en Vercel</span>
          )}
        </li>
      ))}
    </ul>
  );
}
