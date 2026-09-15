"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { guardarContenido } from "@/lib/acciones/redaccion";

/**
 * El contenido de la pieza (guion, copy, artículo, edición del newsletter), editable en la plataforma.
 * Se lee como markdown; «Editar» abre el texto; cada «Guardar» es una versión nueva.
 */
export function Contenido({ piezaId, contenido, puedeEditar, vacio }: { piezaId: string; contenido: string | null; puedeEditar: boolean; vacio: string }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(contenido ?? "");
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await guardarContenido(piezaId, texto);
      if (r.ok) { toast.success(r.mensaje); setEditando(false); } else toast.error(r.mensaje);
    });
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={Math.min(40, Math.max(12, texto.split("\n").length + 2))}
          className="font-mono text-[13px] leading-relaxed"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardar(); } }}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Markdown. ⌘Enter guarda como versión nueva.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pendiente} onClick={() => { setTexto(contenido ?? ""); setEditando(false); }}>Cancelar</Button>
            <Button size="sm" disabled={pendiente || !texto.trim() || texto === (contenido ?? "")} onClick={guardar}>Guardar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {contenido?.trim() ? <Markdown texto={contenido} /> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{vacio}</p>}
      {puedeEditar && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditando(true)}>
          <Pencil className="size-3.5" /> {contenido?.trim() ? "Editar" : "Escribir"}
        </Button>
      )}
    </div>
  );
}
