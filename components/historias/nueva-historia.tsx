"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormaHistoria, type OpcionPieza, type OpcionRecurso } from "./forma-historia";

export function NuevaHistoria({ semana, dia, recursos, piezas, variante = "boton" }: { semana: string; dia?: number; recursos: OpcionRecurso[]; piezas: OpcionPieza[]; variante?: "boton" | "enlace" }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return variante === "boton"
      ? <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Plus className="size-3.5" /> Nueva historia</Button>
      : <button type="button" onClick={() => setAbierto(true)} className="text-xs font-medium text-primary hover:underline">Proponer una</button>;
  }
  return <div className="w-full"><FormaHistoria semana={semana} dia={dia} recursos={recursos} piezas={piezas} onListo={() => setAbierto(false)} /></div>;
}
