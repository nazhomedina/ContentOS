"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { asignarTarea } from "@/lib/acciones/nodo";
import { hoyISO, sumarDias } from "@/lib/dominio/tiempo";

type Perfil = { user_id: string; nombre: string; rol: string };

/** Botón «Asignar» de la tarjeta de tareas: tipo, para quién y cuándo vence. Owner. */
export function AsignarTarea({ piezaId, tipo, perfiles }: { piezaId: string; tipo: string | null; perfiles: Perfil[] }) {
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const editor = perfiles.find((p) => p.rol === "editor");
  const [t, setT] = useState({ tipo: tipo === "carrusel" ? "diseñar" : "editar", para: editor?.user_id ?? "", vence: sumarDias(hoyISO(), 2) });

  function asignar() {
    iniciar(async () => {
      const r = await asignarTarea({ pieza_id: piezaId, tipo: t.tipo, asignado_a: t.para, vence: t.vence });
      if (r.ok) { toast.success(r.mensaje); setAbierto(false); } else toast.error(r.mensaje);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-primary" />}>+ Asignar</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva tarea para la cola</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label>Tipo</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={t.tipo} onChange={(e) => setT({ ...t, tipo: e.target.value })}>
              {["grabar", "editar", "diseñar", "publicar", "capturar_metricas", "revisar"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Para</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={t.para} onChange={(e) => setT({ ...t, para: e.target.value })}>
              {perfiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Vence</Label><Input type="date" value={t.vence} onChange={(e) => setT({ ...t, vence: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button disabled={pendiente || !t.para || !t.vence} onClick={asignar}>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
