"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarFormato, type CambiosFormato } from "@/lib/acciones/formatos";

import { ESTADO_FC } from "@/lib/dominio/formatos";
export { ESTADO_FC };

type Formato = { id: string; codigo: string; nombre: string; estado: string; serie_propia: string | null; duracion: string | null; recompensa: string | null; cadencia: string | null };

/** Los campos propios de la card, en lectura y con edición en línea para el owner. */
export function FichaFormato({ formato, puedeEditar }: { formato: Formato; puedeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState<CambiosFormato & { nombre: string; estado: string }>({
    nombre: formato.nombre, estado: formato.estado, serie_propia: formato.serie_propia, duracion: formato.duracion,
    recompensa: formato.recompensa, cadencia: formato.cadencia,
  });
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await guardarFormato(formato.id, f);
      if (r.ok) { toast.success(r.mensaje); setEditando(false); } else toast.error(r.mensaje);
    });
  }

  if (!editando) {
    return (
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Dato k="Serie propia" v={formato.serie_propia} />
        <Dato k="Duración" v={formato.duracion} />
        <Dato k="Cadencia" v={formato.cadencia} />
        <Dato k="Recompensa" v={formato.recompensa} />
        {puedeEditar && <div className="sm:col-span-2"><Button size="sm" variant="outline" onClick={() => setEditando(true)}><Pencil className="size-3.5" /> Editar ficha</Button></div>}
      </dl>
    );
  }

  const campo = (k: keyof typeof f, etiqueta: string, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{etiqueta}</Label>
      <Input value={(f[k] as string | null) ?? ""} placeholder={placeholder} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {campo("nombre", "Nombre")}
        <div className="space-y-1">
          <Label className="text-xs">Estado de validación</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
            {Object.entries(ESTADO_FC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {campo("serie_propia", "Serie propia", "Criterio, Róbate…")}
        {campo("duracion", "Duración", "60-90 s")}
        {campo("cadencia", "Cadencia", "2 por semana")}
        {campo("recompensa", "Recompensa", "qué se lleva quien lo ve")}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pendiente} onClick={() => setEditando(false)}>Cancelar</Button>
        <Button size="sm" disabled={pendiente} onClick={guardar}>Guardar</Button>
      </div>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={v ? "font-medium" : "text-muted-foreground"}>{v ?? "—"}</dd>
    </div>
  );
}
