"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleSlash, HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IdPublico, InsigniaEstado } from "@/components/app/insignias";
import { completarHipotesis, resolverHipotesis } from "@/lib/acciones/hipotesis";
import { CAMPOS_HIPOTESIS, NOMBRE_ESTADO_HIPOTESIS } from "@/lib/dominio/hipotesis";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type HipotesisFila = {
  id: string; texto: string; campo: string | null; numero: number | null; fecha: string | null; estado: string;
  veredicto: string | null; resuelta_en: string | null; vencida: boolean;
  piezas: { id: string; id_publico: string | null; titulo: string | null; estado: string; valor: number | null; fecha: string | null }[];
};

/** Una hipótesis por fila: qué afirma, con qué número se cierra, qué piezas la responden y qué valor alcanzaron. */
export function ListaHipotesis({ filas, puedeEditar }: { filas: HipotesisFila[]; puedeEditar: boolean }) {
  if (filas.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nada aquí.</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {filas.map((h) => <Fila key={h.id} h={h} puedeEditar={puedeEditar} />)}
    </ul>
  );
}

function Fila({ h, puedeEditar }: { h: HipotesisFila; puedeEditar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [dialogo, setDialogo] = useState<null | "verdadera" | "falsa" | "sin_datos">(null);
  const [veredicto, setVeredicto] = useState("");
  const [completando, setCompletando] = useState(false);
  const [c, setC] = useState({ campo: h.campo ?? "multiplicador", numero: h.numero?.toString() ?? "", fecha: h.fecha ?? "" });
  const resoluble = Boolean(h.campo && h.numero != null && h.fecha);
  const conValor = h.piezas.filter((p) => p.valor != null);
  const alcanzadas = conValor.filter((p) => h.numero != null && (p.valor ?? 0) >= h.numero).length;
  const abierta = h.estado === "abierta";

  function resolver(estado: "abierta" | "verdadera" | "falsa" | "sin_datos") {
    iniciar(async () => {
      const r = await resolverHipotesis(h.id, estado, veredicto);
      if (r.ok) { toast.success(r.mensaje); setDialogo(null); setVeredicto(""); } else toast.error(r.mensaje);
    });
  }
  function completar() {
    iniciar(async () => {
      const r = await completarHipotesis(h.id, { campo: c.campo, numero: c.numero === "" ? null : Number(c.numero), fecha: c.fecha });
      if (r.ok) { toast.success(r.mensaje); setCompletando(false); } else toast.error(r.mensaje);
    });
  }

  return (
    <li className={cn("space-y-2 px-4 py-3", h.vencida && abierta && "bg-ambar/5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">{h.texto}</p>
          <p className="text-xs text-muted-foreground">
            {resoluble
              ? <>{h.campo} ≥ {h.numero} al {fechaCorta(h.fecha)}{h.vencida && abierta && <span className="font-semibold text-ambar"> · venció, toca resolver</span>}</>
              : <span className="text-ambar">sin número ni fecha que la cierren</span>}
            {" · "}<span className={cn("font-semibold", h.estado === "verdadera" ? "text-ok" : h.estado === "falsa" ? "text-rojo" : "")}>{NOMBRE_ESTADO_HIPOTESIS[h.estado] ?? h.estado}</span>
            {h.resuelta_en && <> · {fechaCorta(h.resuelta_en.slice(0, 10))}</>}
          </p>
          {h.veredicto && <p className="text-sm"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Veredicto · </span>{h.veredicto}</p>}
        </div>
        {puedeEditar && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {!resoluble && <Button size="sm" variant="outline" disabled={pendiente} onClick={() => setCompletando((v) => !v)}>Completar</Button>}
            {abierta ? (
              <>
                <Button size="sm" variant="outline" disabled={pendiente} onClick={() => setDialogo("verdadera")}><CheckCircle2 className="size-3.5 text-ok" /> Verdadera</Button>
                <Button size="sm" variant="outline" disabled={pendiente} onClick={() => setDialogo("falsa")}><CircleSlash className="size-3.5 text-rojo" /> Falsa</Button>
                <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => setDialogo("sin_datos")}><HelpCircle className="size-3.5" /> Sin datos</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => resolver("abierta")}><RotateCcw className="size-3.5" /> Reabrir</Button>
            )}
          </div>
        )}
      </div>

      {completando && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Campo</Label>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={c.campo} onChange={(e) => setC({ ...c, campo: e.target.value })}>
              {CAMPOS_HIPOTESIS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Número</Label><Input type="number" className="h-8 w-24 text-xs" value={c.numero} onChange={(e) => setC({ ...c, numero: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha</Label><Input type="date" className="h-8 w-auto text-xs" value={c.fecha} onChange={(e) => setC({ ...c, fecha: e.target.value })} /></div>
          <Button size="sm" disabled={pendiente || !c.campo || c.numero === "" || !c.fecha} onClick={completar}>Guardar</Button>
        </div>
      )}

      {h.piezas.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">
            {h.piezas.length} {h.piezas.length === 1 ? "pieza" : "piezas"}
            {resoluble && <> · {conValor.length} con valor · <span className={cn(alcanzadas > 0 && "font-semibold text-ok")}>{alcanzadas} alcanzan {h.numero}</span></>}
          </span>
          {h.piezas.slice(0, 8).map((p) => (
            <Link key={p.id} href={`/piezas/${p.id}`} className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 hover:bg-muted">
              <IdPublico id={p.id_publico} />
              {p.valor != null && <span className={cn("font-semibold tabular-nums", h.numero != null && p.valor >= h.numero ? "text-ok" : "")}>{p.valor}</span>}
              <InsigniaEstado estado={p.estado} />
            </Link>
          ))}
          {h.piezas.length > 8 && <span className="text-muted-foreground">y {h.piezas.length - 8} más</span>}
        </div>
      )}

      <Dialog open={dialogo !== null} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogo === "verdadera" ? "Cerrar como verdadera" : dialogo === "falsa" ? "Cerrar como falsa" : "Cerrar sin datos"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{h.texto}</p>
          <Textarea autoFocus rows={3} value={veredicto} onChange={(e) => setVeredicto(e.target.value)} placeholder={dialogo === "sin_datos" ? "Opcional: por qué no hubo datos." : "Qué se aprendió. Esto es lo que queda para la siguiente pieza."} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button disabled={pendiente || (dialogo !== "sin_datos" && !veredicto.trim())} onClick={() => dialogo && resolver(dialogo)}>Cerrar hipótesis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
