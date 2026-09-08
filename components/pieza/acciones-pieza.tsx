"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cambiarEstadoPieza, marcarPublicada } from "@/lib/acciones/piezas";
import { motivoNoPublicable, siguienteEstadoEditor, transicionPermitida, NOMBRE_ESTADO, type EstadoPieza } from "@/lib/dominio/estados";
import type { Rol } from "@/lib/dominio/roles";

const PLATAFORMAS = ["instagram", "youtube", "x", "kit", "blog", "tiktok"];

export function AccionesPieza({ piezaId, estado, rol }: { piezaId: string; estado: string; rol: Rol }) {
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");
  const [plataforma, setPlataforma] = useState("instagram");

  if (rol === "viewer") return null;
  const motivo = motivoNoPublicable(estado);
  const siguiente = siguienteEstadoEditor(estado);
  const puedeAvanzar = siguiente && transicionPermitida(rol, estado, siguiente);
  const listoEs = estado === "diseno";

  function avanzar(a: EstadoPieza) {
    iniciar(async () => {
      const r = await cambiarEstadoPieza(piezaId, a);
      if (r.ok) toast.success(`Ahora está en ${NOMBRE_ESTADO[a]}.`); else toast.error(r.mensaje);
    });
  }

  function publicar() {
    iniciar(async () => {
      const r = await marcarPublicada(piezaId, url, plataforma);
      if (r.ok) { setAbierto(false); toast.success(r.mensaje ?? "Publicada."); } else toast.error(r.mensaje);
    });
  }

  return (
    <footer className="sticky bottom-16 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2">
        {puedeAvanzar && siguiente && (
          <Button variant="outline" disabled={pendiente} onClick={() => avanzar(siguiente)}>
            {listoEs ? "Marcar como lista" : `Pasar a ${NOMBRE_ESTADO[siguiente]}`}
          </Button>
        )}
        {motivo ? (
          <div className="text-right">
            <Button disabled>Publicada</Button>
            <p className="mt-1 text-xs text-muted-foreground">{motivo}</p>
          </div>
        ) : (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger render={<Button />}>Publicada</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Marcar como publicada</DialogTitle>
                <DialogDescription>La URL es obligatoria. Con ella el post-scraper captura las métricas.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" inputMode="url" placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Plataforma</Label>
                  <Select value={plataforma} onValueChange={(v) => setPlataforma(v ?? "instagram")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATAFORMAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
                <Button disabled={pendiente || !/^https?:\/\/\S+$/.test(url.trim())} onClick={publicar}>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </footer>
  );
}
