"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Layers, X } from "lucide-react";
import { guardarSeriesPieza } from "@/lib/acciones/series";

/** Las series de la pieza como chips. Se agregan eligiendo entre las series activas; se quitan con la x. */
export function SeriesPieza({ piezaId, series, activas, puedeEditar }: { piezaId: string; series: string[]; activas: string[]; puedeEditar: boolean }) {
  const [lista, setLista] = useState(series);
  const [pendiente, iniciar] = useTransition();
  const disponibles = activas.filter((s) => !lista.includes(s));

  function guardar(siguiente: string[]) {
    const previa = lista;
    setLista(siguiente);
    iniciar(async () => {
      const r = await guardarSeriesPieza(piezaId, siguiente);
      if (!r.ok) { toast.error(r.mensaje); setLista(previa); }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Layers className="size-3.5 text-muted-foreground" />
      {lista.length === 0 && !puedeEditar && <span className="text-xs text-muted-foreground">sin serie</span>}
      {lista.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
          {s}
          {puedeEditar && <button type="button" onClick={() => guardar(lista.filter((x) => x !== s))} disabled={pendiente} className="text-background/70 hover:text-background" aria-label={`Quitar de ${s}`}><X className="size-3" /></button>}
        </span>
      ))}
      {puedeEditar && disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && guardar([...lista, e.target.value])}
          disabled={pendiente}
          className="h-6 rounded-full border border-dashed bg-transparent px-2 text-[11px] text-muted-foreground outline-none focus:border-foreground"
          aria-label="Agregar a una serie"
        >
          <option value="">+ serie</option>
          {disponibles.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}
