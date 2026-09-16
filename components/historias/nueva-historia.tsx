"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormaHistoria, type OpcionPieza, type OpcionRecurso } from "./forma-historia";

export function NuevaHistoria({ semana, recursos, piezas }: { semana: string; recursos: OpcionRecurso[]; piezas: OpcionPieza[] }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Plus className="size-3.5" /> Nueva historia</Button>;
  return <div className="w-full"><FormaHistoria semana={semana} recursos={recursos} piezas={piezas} onListo={() => setAbierto(false)} /></div>;
}
