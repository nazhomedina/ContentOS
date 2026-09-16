"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearYLigarHipotesis, ligarHipotesis } from "@/lib/acciones/hipotesis";
import { CAMPOS_HIPOTESIS, NOMBRE_ESTADO_HIPOTESIS, hipotesisResoluble } from "@/lib/dominio/hipotesis";
import { fechaCorta, hoyISO, sumarDias } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

type H = { id: string; texto: string; campo: string | null; numero: number | null; fecha: string | null; estado: string };

/** La hipótesis de la pieza: se ve siempre; el owner la liga a una existente, crea una nueva o la quita. */
export function HipotesisPieza({ piezaId, actual, abiertas, esLegado, puedeEditar }: { piezaId: string; actual: H | null; abiertas: H[]; esLegado: boolean; puedeEditar: boolean }) {
  const [modo, setModo] = useState<null | "elegir" | "nueva">(null);
  const [sel, setSel] = useState("");
  const [n, setN] = useState({ texto: "", campo: "multiplicador", numero: "3", fecha: sumarDias(hoyISO(), 42) });
  const [pendiente, iniciar] = useTransition();

  function ligar(id: string | null) {
    iniciar(async () => {
      const r = await ligarHipotesis(piezaId, id);
      if (r.ok) { toast.success(r.mensaje); setModo(null); } else toast.error(r.mensaje);
    });
  }
  function crear() {
    iniciar(async () => {
      const r = await crearYLigarHipotesis(piezaId, { texto: n.texto, campo: n.campo, numero: Number(n.numero), fecha: n.fecha });
      if (r.ok) { toast.success(r.mensaje); setModo(null); } else toast.error(r.mensaje);
    });
  }

  return (
    <div className="space-y-2">
      {actual ? (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", hipotesisResoluble(actual) ? "" : "border-ambar/50 bg-ambar/5")}>
          <p className="font-medium">{actual.texto}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hipotesisResoluble(actual) ? `${actual.campo} ≥ ${actual.numero} al ${fechaCorta(actual.fecha)}` : "Sin número ni fecha que la cierren."}
            {" · "}{NOMBRE_ESTADO_HIPOTESIS[actual.estado] ?? actual.estado}
            {" · "}<Link href="/hipotesis" className="underline">ver todas</Link>
          </p>
        </div>
      ) : (
        <p className={cn("rounded-xl border border-dashed px-4 py-3 text-sm", esLegado ? "text-muted-foreground" : "border-rojo/50 text-rojo")}>
          Sin hipótesis todavía.{esLegado ? " Heredada de Notion; puede seguir en producción, pero no se mide." : " Sin ella la pieza no pasa a grabación."}
        </p>
      )}

      {puedeEditar && modo === null && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setModo("elegir")}>{actual ? "Cambiar por una existente" : "Ligar a una existente"}</Button>
          <Button size="sm" variant="outline" onClick={() => setModo("nueva")}>Nueva hipótesis</Button>
          {actual && <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => ligar(null)}>Quitar</Button>}
        </div>
      )}

      {modo === "elegir" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <select className="h-8 min-w-[20rem] flex-1 rounded-md border border-input bg-background px-2 text-xs" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Elige una hipótesis abierta…</option>
            {abiertas.map((h) => <option key={h.id} value={h.id}>{h.texto.slice(0, 90)}{h.campo ? ` · ${h.campo} ≥ ${h.numero}` : ""}</option>)}
          </select>
          <Button size="sm" disabled={pendiente || !sel} onClick={() => ligar(sel)}>Ligar</Button>
          <Button size="sm" variant="ghost" onClick={() => setModo(null)}>Cancelar</Button>
        </div>
      )}

      {modo === "nueva" && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Si [cambio observable], entonces…</Label>
            <Input value={n.texto} onChange={(e) => setN({ ...n, texto: e.target.value })} placeholder="Si abro con la postura completa, el multiplicador llega a 3" />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Campo</Label>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={n.campo} onChange={(e) => setN({ ...n, campo: e.target.value })}>
                {CAMPOS_HIPOTESIS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Llega a</Label><Input type="number" className="h-8 w-24 text-xs" value={n.numero} onChange={(e) => setN({ ...n, numero: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Al</Label><Input type="date" className="h-8 w-auto text-xs" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} /></div>
            <Button size="sm" disabled={pendiente || !n.texto.trim() || n.numero === "" || !n.fecha} onClick={crear}>Crear y ligar</Button>
            <Button size="sm" variant="ghost" onClick={() => setModo(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
