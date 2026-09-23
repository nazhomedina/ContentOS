"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { guardarEtiquetasFormato } from "@/lib/acciones/formatos";
import { FACETAS } from "@/lib/dominio/formatos";

/** Las etiquetas del formato: las de la galería. Se agregan escribiendo o eligiendo una conocida; se quitan con la x. */
export function EtiquetasFormato({ formatoId, etiquetas, puedeEditar }: { formatoId: string; etiquetas: string[]; puedeEditar: boolean }) {
  const [lista, setLista] = useState(etiquetas);
  const [nueva, setNueva] = useState("");
  const [pendiente, iniciar] = useTransition();
  const sugeridas = FACETAS.flatMap((f) => f.etiquetas).filter((e) => !lista.includes(e));

  function guardar(siguiente: string[]) {
    const previa = lista;
    setLista(siguiente);
    iniciar(async () => { const r = await guardarEtiquetasFormato(formatoId, siguiente); if (!r.ok) { toast.error(r.mensaje); setLista(previa); } });
  }
  function agregar(t: string) {
    const e = t.trim().toLowerCase();
    if (!e || lista.includes(e)) { setNueva(""); return; }
    guardar([...lista, e]); setNueva("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lista.length === 0 && <span className="text-xs text-muted-foreground">sin etiquetas</span>}
      {lista.map((e) => (
        <span key={e} className="inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 text-[11px] font-medium">
          {e}
          {puedeEditar && <button type="button" onClick={() => guardar(lista.filter((x) => x !== e))} disabled={pendiente} className="text-muted-foreground hover:text-foreground" aria-label={`Quitar ${e}`}><X className="size-3" /></button>}
        </span>
      ))}
      {puedeEditar && (
        <>
          <input list={`etq-${formatoId}`} value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregar(nueva); } }} onBlur={() => agregar(nueva)} placeholder="+ etiqueta" className="h-5 w-28 rounded border border-dashed bg-transparent px-1.5 text-[11px] outline-none focus:border-foreground" disabled={pendiente} />
          <datalist id={`etq-${formatoId}`}>{sugeridas.map((s) => <option key={s} value={s} />)}</datalist>
        </>
      )}
    </div>
  );
}
