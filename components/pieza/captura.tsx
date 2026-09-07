"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crearPieza } from "@/lib/acciones/nodo";

/** Capturar una idea es escribir una línea y dar Enter. */
export function Captura() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [pendiente, iniciar] = useTransition();

  function capturar(abrir = false) {
    if (!titulo.trim()) return;
    iniciar(async () => {
      const r = await crearPieza({ titulo });
      if (!r.ok) { toast.error(r.mensaje); return; }
      setTitulo("");
      toast.success(r.mensaje);
      if (abrir && r.id) router.push(`/piezas/${r.id}`);
    });
  }

  return (
    <div className="flex gap-2">
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); capturar(e.metaKey || e.ctrlKey); } }}
        placeholder="Nueva idea… Enter para capturar, ⌘Enter para abrirla"
        className="h-10"
        disabled={pendiente}
      />
      <Button className="h-10" disabled={pendiente || !titulo.trim()} onClick={() => capturar(false)}>
        <Plus className="size-4" /> Capturar
      </Button>
    </div>
  );
}
