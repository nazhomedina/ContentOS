"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { guardarChecklist } from "@/lib/acciones/tareas";

type Item = { texto: string; hecho: boolean };

export function Checklist({ tareaId, inicial, editable }: { tareaId: string; inicial: Item[]; editable: boolean }) {
  const [items, setItems] = useState(inicial);
  const [, iniciar] = useTransition();

  function alternar(i: number) {
    const nuevos = items.map((x, j) => (j === i ? { ...x, hecho: !x.hecho } : x));
    setItems(nuevos);
    iniciar(async () => {
      const r = await guardarChecklist(tareaId, nuevos);
      if (!r.ok) { toast.error(r.mensaje); setItems(items); }
    });
  }

  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin checklist.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <Checkbox id={`${tareaId}-${i}`} checked={it.hecho} disabled={!editable} onCheckedChange={() => alternar(i)} />
          <label htmlFor={`${tareaId}-${i}`} className={it.hecho ? "text-muted-foreground line-through" : ""}>{it.texto}</label>
        </li>
      ))}
    </ul>
  );
}
