"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { guardarSerie } from "@/lib/acciones/series";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type SerieFila = {
  id: string; nombre: string; descripcion: string | null; activa: boolean;
  formato: string | null;
  piezas: number; en_produccion: number; publicadas: number; ultima_publicada: string | null;
};

/** Las series declaradas: nombre, descripción, cuántas piezas llevan, y el interruptor para prender o apagar. */
export function ListaSeries({ series, puedeEditar }: { series: SerieFila[]; puedeEditar: boolean }) {
  const [nueva, setNueva] = useState(false);
  return (
    <div className="space-y-4">
      {puedeEditar && (
        nueva ? <FormaSerie onListo={() => setNueva(false)} /> : <Button size="sm" variant="outline" onClick={() => setNueva(true)}><Plus className="size-3.5" /> Nueva serie</Button>
      )}
      {series.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin series todavía.</p> : (
        <ul className="divide-y rounded-xl border">
          {series.map((s) => <Fila key={s.id} s={s} puedeEditar={puedeEditar} />)}
        </ul>
      )}
    </div>
  );
}

function Fila({ s, puedeEditar }: { s: SerieFila; puedeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  function prender(activa: boolean) {
    iniciar(async () => {
      const r = await guardarSerie(s.nombre, { activa });
      if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    });
  }
  return (
    <li className={cn("px-4 py-3", !s.activa && "bg-muted/40")}>
      {editando ? <FormaSerie serie={s} onListo={() => setEditando(false)} /> : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("font-semibold", !s.activa && "text-muted-foreground line-through decoration-muted-foreground/50")}>{s.nombre}</span>
              {!s.activa && <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">apagada</span>}
              {s.formato && <span className="text-xs text-muted-foreground">serie propia de {s.formato}</span>}
            </div>
            <p className={cn("text-sm", s.descripcion ? "text-foreground" : "text-muted-foreground")}>{s.descripcion ?? "Sin descripción."}</p>
            <p className="text-xs text-muted-foreground">
              <Link href={`/piezas?serie=${encodeURIComponent(s.nombre)}`} className="underline">{s.piezas} {s.piezas === 1 ? "pieza" : "piezas"}</Link>
              {" · "}{s.en_produccion} en producción · {s.publicadas} publicadas
              {s.ultima_publicada && <> · última {fechaCorta(s.ultima_publicada.slice(0, 10))}</>}
            </p>
          </div>
          {puedeEditar && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => setEditando(true)}><Pencil className="size-3.5" /> Editar</Button>
              <button
                type="button"
                role="switch"
                aria-checked={s.activa}
                disabled={pendiente}
                onClick={() => prender(!s.activa)}
                className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition", s.activa ? "bg-primary" : "bg-muted-foreground/40")}
                title={s.activa ? "Apagar serie" : "Prender serie"}
              >
                <span className={cn("inline-block size-4 rounded-full bg-background shadow transition", s.activa ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FormaSerie({ serie, onListo }: { serie?: SerieFila; onListo: () => void }) {
  const [nombre, setNombre] = useState(serie?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(serie?.descripcion ?? "");
  const [pendiente, iniciar] = useTransition();
  function guardar() {
    iniciar(async () => {
      const r = serie
        ? await guardarSerie(serie.nombre, { descripcion, nuevo_nombre: nombre !== serie.nombre ? nombre : undefined })
        : await guardarSerie(nombre, { descripcion, activa: true });
      if (r.ok) { toast.success(r.mensaje); onListo(); } else toast.error(r.mensaje);
    });
  }
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la serie" className="h-8 text-sm font-semibold" autoFocus />
      <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Qué es, para quién, qué la hace serie (y no una pieza suelta)." />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pendiente} onClick={onListo}>Cancelar</Button>
        <Button size="sm" disabled={pendiente || !nombre.trim()} onClick={guardar}>{serie ? "Guardar" : "Crear"}</Button>
      </div>
    </div>
  );
}
