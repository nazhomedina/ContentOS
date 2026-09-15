"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { guardarEtiquetas } from "@/lib/acciones/redaccion";

/** Etiquetas libres. Nazho las usa como quiera: bugs, temas, campañas. Se escriben y se quitan en línea. */
export function Etiquetas({ piezaId, etiquetas, puedeEditar }: { piezaId: string; etiquetas: string[]; puedeEditar: boolean }) {
  const [lista, setLista] = useState(etiquetas);
  const [nueva, setNueva] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(siguiente: string[]) {
    const previa = lista;
    setLista(siguiente);
    iniciar(async () => {
      const r = await guardarEtiquetas(piezaId, siguiente);
      if (!r.ok) { toast.error(r.mensaje); setLista(previa); }
    });
  }
  function agregar() {
    const t = nueva.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || lista.includes(t)) { setNueva(""); return; }
    guardar([...lista, t]);
    setNueva("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag className="size-3.5 text-muted-foreground" />
      {lista.length === 0 && !puedeEditar && <span className="text-xs text-muted-foreground">sin etiquetas</span>}
      {lista.map((e) => (
        <span key={e} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
          {e}
          {puedeEditar && <button type="button" onClick={() => guardar(lista.filter((x) => x !== e))} disabled={pendiente} className="text-muted-foreground hover:text-foreground" aria-label={`Quitar ${e}`}><X className="size-3" /></button>}
        </span>
      ))}
      {puedeEditar && (
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregar(); } }}
          onBlur={agregar}
          placeholder="+ etiqueta"
          className="h-6 w-28 rounded-full border border-dashed bg-transparent px-2 text-[11px] outline-none focus:border-foreground"
          disabled={pendiente}
        />
      )}
    </div>
  );
}
