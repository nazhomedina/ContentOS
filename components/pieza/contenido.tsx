"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { EditorMarkdown } from "@/components/pieza/editor-markdown";
import { guardarContenido } from "@/lib/acciones/redaccion";

const claveBorrador = (piezaId: string) => `contentos:borrador:${piezaId}`;
function leerBorrador(piezaId: string): string | null {
  try { return localStorage.getItem(claveBorrador(piezaId)); } catch { return null; }
}
function borrarBorrador(piezaId: string) {
  try { localStorage.removeItem(claveBorrador(piezaId)); } catch { /* sin almacenamiento */ }
}

/**
 * El contenido de la pieza (guion, copy, artículo, edición del newsletter), editable en la plataforma.
 * Se lee como markdown renderizado; «Editar» abre el editor visual, que guarda markdown.
 * Cada «Guardar» es una versión nueva. Lo que se escribe sin guardar se respalda en este navegador.
 */
export function Contenido({ piezaId, contenido, puedeEditar, vacio }: { piezaId: string; contenido: string | null; puedeEditar: boolean; vacio: string }) {
  const [editando, setEditando] = useState(false);
  const [inicial, setInicial] = useState(contenido ?? "");
  const [texto, setTexto] = useState(contenido ?? "");
  const [cambiado, setCambiado] = useState(false);
  const [recuperable, setRecuperable] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function abrir() {
    const b = leerBorrador(piezaId);
    setRecuperable(b && b.trim() && b !== (contenido ?? "") ? b : null);
    setInicial(contenido ?? "");
    setTexto(contenido ?? "");
    setCambiado(false);
    setEditando(true);
  }

  function recuperar() {
    if (!recuperable) return;
    setInicial(recuperable);
    setTexto(recuperable);
    setCambiado(true);
    setRecuperable(null);
    setEditando(false);
    setTimeout(() => setEditando(true), 0);
  }

  function cerrar() {
    if (cambiado && !window.confirm("Tienes cambios sin guardar. ¿Descartarlos?")) return;
    borrarBorrador(piezaId);
    setEditando(false);
  }

  function guardar() {
    if (!texto.trim() || !cambiado || pendiente) return;
    iniciar(async () => {
      const r = await guardarContenido(piezaId, texto);
      if (r.ok) { borrarBorrador(piezaId); toast.success(r.mensaje); setEditando(false); setCambiado(false); }
      else toast.error(r.mensaje);
    });
  }

  if (editando) {
    return (
      <div className="space-y-2">
        {recuperable && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ambar/60 bg-ambar/10 px-3 py-2 text-sm">
            <span>Hay un borrador sin guardar de esta pieza en este navegador.</span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { borrarBorrador(piezaId); setRecuperable(null); }}>Descartar</Button>
              <Button size="sm" onClick={recuperar}>Recuperarlo</Button>
            </span>
          </div>
        )}
        <EditorMarkdown
          key={inicial}
          inicial={inicial}
          borradorClave={claveBorrador(piezaId)}
          onCambio={(md, c) => { setTexto(md); setCambiado(c || md !== (contenido ?? "")); }}
          onGuardar={guardar}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{cambiado ? "Cambios sin guardar." : "Sin cambios."} Guardar crea una versión nueva; las anteriores quedan en el historial.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pendiente} onClick={cerrar}>Cancelar</Button>
            <Button size="sm" disabled={pendiente || !texto.trim() || !cambiado} onClick={guardar}>{pendiente ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {contenido?.trim() ? <Markdown texto={contenido} /> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{vacio}</p>}
      {puedeEditar && (
        <Button size="sm" variant="outline" className="mt-3" onClick={abrir}>
          <Pencil className="size-3.5" /> {contenido?.trim() ? "Editar" : "Escribir"}
        </Button>
      )}
    </div>
  );
}
