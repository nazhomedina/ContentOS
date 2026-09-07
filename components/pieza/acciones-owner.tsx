"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { asignarTarea, moverEstado, actualizarPieza } from "@/lib/acciones/nodo";
import { ESTADOS_PIEZA, NOMBRE_ESTADO, checklistPorDefecto } from "@/lib/dominio/estados";
import { hoyISO, sumarDias } from "@/lib/dominio/tiempo";

type Perfil = { user_id: string; nombre: string; rol: string };

export function AccionesOwner({ piezaId, estado, formato, fechaObjetivo, responsableId, perfiles }: {
  piezaId: string; estado: string; formato: string; fechaObjetivo: string | null; responsableId: string | null; perfiles: Perfil[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const editor = perfiles.find((p) => p.rol === "editor");
  const [t, setT] = useState({ tipo: formato === "carrusel" ? "diseñar" : "editar", para: editor?.user_id ?? "", vence: sumarDias(hoyISO(), 2) });

  function mover(a: string) {
    if (a === estado) return;
    iniciar(async () => {
      const r = await moverEstado(piezaId, a);
      if (r.ok) toast.success(`Ahora en ${NOMBRE_ESTADO[a as keyof typeof NOMBRE_ESTADO]}.`); else toast.error(r.mensaje);
    });
  }
  function guardar(cambios: Parameters<typeof actualizarPieza>[1]) {
    iniciar(async () => {
      const r = await actualizarPieza(piezaId, cambios);
      if (r.ok) toast.success("Guardado."); else toast.error(r.mensaje);
    });
  }
  function asignar() {
    iniciar(async () => {
      const r = await asignarTarea({ pieza_id: piezaId, tipo: t.tipo, asignado_a: t.para, vence: t.vence, checklist: checklistPorDefecto(t.tipo, formato) });
      if (r.ok) { toast.success(r.mensaje); setAbierto(false); } else toast.error(r.mensaje);
    });
  }

  const sel = "h-8 rounded-md border border-input bg-background px-2 text-xs";
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado</Label>
        <select className={sel} value={estado} disabled={pendiente || estado === "publicada"} onChange={(e) => mover(e.target.value)}>
          {ESTADOS_PIEZA.filter((e) => e !== "publicada").map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
          {estado === "publicada" && <option value="publicada">Publicada</option>}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha objetivo</Label>
        <Input type="date" className="h-8 w-auto text-xs" defaultValue={fechaObjetivo ?? ""} onBlur={(e) => e.target.value !== (fechaObjetivo ?? "") && guardar({ fecha_objetivo: e.target.value || null })} />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsable</Label>
        <select className={sel} value={responsableId ?? ""} onChange={(e) => guardar({ responsable_id: e.target.value || null })}>
          <option value="">Sin asignar</option>
          {perfiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
        </select>
      </div>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>Asignar tarea</DialogTrigger>
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
    </div>
  );
}
