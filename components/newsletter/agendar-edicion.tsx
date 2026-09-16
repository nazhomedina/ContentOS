"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agendarEdicion } from "@/lib/acciones/newsletter";
import { fechaCorta } from "@/lib/dominio/tiempo";

/** Agenda una edición en una fecha: pide solo el criterio; el número y el formato se ponen solos. */
export function AgendarEdicion({ fecha, variante = "enlace" }: { fecha: string; variante?: "enlace" | "boton" }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cuando, setCuando] = useState(fecha);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await agendarEdicion(titulo, cuando);
      if (r.ok) { toast.success(r.mensaje); setTitulo(""); setAbierto(false); } else toast.error(r.mensaje);
    });
  }

  if (!abierto) {
    return variante === "boton"
      ? <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Plus className="size-3.5" /> Nueva edición</Button>
      : <button type="button" onClick={() => setAbierto(true)} className="text-xs font-medium text-primary hover:underline">Agendar</button>;
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setAbierto(false); }} placeholder="El criterio de la edición" className="h-7 min-w-0 flex-1 text-xs" autoFocus />
      {variante === "boton"
        ? <Input type="date" value={cuando} onChange={(e) => setCuando(e.target.value)} className="h-7 w-36 text-xs" />
        : <span className="text-xs text-muted-foreground">{fechaCorta(cuando)}</span>}
      <Button size="sm" className="h-7" disabled={pendiente || !titulo.trim()} onClick={guardar}>Agendar</Button>
      <Button size="sm" variant="ghost" className="h-7" disabled={pendiente} onClick={() => setAbierto(false)}>Cancelar</Button>
    </div>
  );
}
