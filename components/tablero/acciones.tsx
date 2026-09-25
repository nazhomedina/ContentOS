"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { piezaLista, programarPieza, publicarHistoriaTablero, publicarPieza, tomarPieza } from "@/lib/acciones/tablero";
import { PLATAFORMAS, plataformaPorDefecto } from "@/lib/dominio/tablero";
import { hoyISO } from "@/lib/dominio/tiempo";
import type { Resultado } from "@/lib/acciones/resultado";

function useAccion() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const correr = (fn: () => Promise<Resultado>, despues?: () => void) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.mensaje ?? "Listo."); despues?.(); router.refresh(); }
      else toast.error(r.mensaje);
    });
  return { pendiente, correr };
}

export function BotonTomar({ piezaId }: { piezaId: string }) {
  const { pendiente, correr } = useAccion();
  return <Button size="sm" variant="outline" className="border-foreground" disabled={pendiente} onClick={() => correr(() => tomarPieza(piezaId))}>Tomar</Button>;
}

export function BotonLista({ piezaId }: { piezaId: string }) {
  const { pendiente, correr } = useAccion();
  return <Button size="sm" variant="secondary" disabled={pendiente} onClick={() => correr(() => piezaLista(piezaId))}>Lista</Button>;
}

/** Programar: fecha de hoy en adelante. Sirve también para mover una ya programada. */
export function BotonProgramar({ piezaId, fechaActual, variante = "outline" }: { piezaId: string; fechaActual?: string | null; variante?: "outline" | "ghost" }) {
  const { pendiente, correr } = useAccion();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(fechaActual ?? hoyISO());
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant={variante} />}>{fechaActual ? "Mover" : "Programar"}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>¿Qué día sale?</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`fecha-${piezaId}`}>Fecha de salida</Label>
          <Input id={`fecha-${piezaId}`} type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <p className="text-xs text-muted-foreground">Queda como tu tarea de publicar ese día y cuenta como «en camino» para la meta.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button disabled={pendiente || !fecha} onClick={() => correr(() => programarPieza(piezaId, fecha), () => setAbierto(false))}>Programar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Publicada: si la pieza necesita URL, la pide aquí; el esquema no deja publicar sin ella. */
export function BotonPublicadaPieza({ piezaId, tipo, idPublico }: { piezaId: string; tipo: string | null; idPublico: string }) {
  const { pendiente, correr } = useAccion();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");
  const [plataforma, setPlataforma] = useState(plataformaPorDefecto(tipo));
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" />}>Publicada</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{idPublico} ya está arriba</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`url-${piezaId}`}>Pega la URL publicada</Label>
            <Input id={`url-${piezaId}`} type="url" inputMode="url" autoFocus placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`plat-${piezaId}`}>Plataforma</Label>
            <select id={`plat-${piezaId}`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
              {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Sin URL no queda publicada: es la regla del sistema, no un capricho. Con la URL el scraper trae las métricas solo.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button disabled={pendiente || !/^https?:\/\/\S+$/.test(url.trim())} onClick={() => correr(() => publicarPieza(piezaId, url, plataforma), () => setAbierto(false))}>Publicada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BotonPublicadaHistoria({ historiaId }: { historiaId: string }) {
  const { pendiente, correr } = useAccion();
  return <Button size="sm" disabled={pendiente} onClick={() => correr(() => publicarHistoriaTablero(historiaId))}>Publicada</Button>;
}

/** Copiar el copy de una historia. Utilidad, no cambio de estado. */
export function CopiarTexto({ texto }: { texto: string }) {
  return (
    <button
      type="button"
      aria-label="Copiar texto"
      title="Copiar texto"
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={async () => {
        try { await navigator.clipboard.writeText(texto); toast.success("Texto copiado."); }
        catch { toast.error("No se pudo copiar. Selecciónalo a mano."); }
      }}
    >
      <Copy className="size-3.5" />
    </button>
  );
}
