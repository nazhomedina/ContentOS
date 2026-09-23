"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { guardarHipotesisFormato } from "@/lib/acciones/formatos";
import { resolverHipotesis } from "@/lib/acciones/hipotesis";
import { CAMPOS_HIPOTESIS, NOMBRE_ESTADO_HIPOTESIS } from "@/lib/dominio/hipotesis";
import { señalFormato, type HipotesisFormato as H } from "@/lib/dominio/formatos";
import { fechaCorta, hoyISO, sumarDias } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

type ResumenEp = { verdaderas: number; falsas: number; sin_datos: number; abiertas: number; vencidas: number } | null;

/** La hipótesis del formato (una fila real de Hipótesis) y lo que dicen las de sus episodios. */
export function HipotesisFormato({ formatoId, hipotesis, episodios, puedeEditar }: { formatoId: string; hipotesis: H; episodios: ResumenEp; puedeEditar: boolean }) {
  const hoy = hoyISO();
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ texto: hipotesis?.texto ?? "", campo: hipotesis?.campo ?? "multiplicador", numero: hipotesis?.numero != null ? String(hipotesis.numero) : "3", fecha: hipotesis?.fecha ?? sumarDias(hoy, 56), resoluble: Boolean(hipotesis?.campo) });
  const [veredicto, setVeredicto] = useState("");
  const [pendiente, iniciar] = useTransition();
  const s = señalFormato(hipotesis, hoy);
  const vencida = Boolean(hipotesis && hipotesis.estado === "abierta" && hipotesis.campo && hipotesis.fecha && hipotesis.fecha <= hoy);

  function guardar() {
    iniciar(async () => {
      const r = await guardarHipotesisFormato(formatoId, { texto: f.texto, campo: f.resoluble ? f.campo : null, numero: f.resoluble ? Number(f.numero) : null, fecha: f.resoluble ? f.fecha : null });
      if (r.ok) { toast.success(r.mensaje); setEditando(false); } else toast.error(r.mensaje);
    });
  }
  function resolver(estado: "verdadera" | "falsa" | "sin_datos") {
    if (!hipotesis) return;
    iniciar(async () => { const r = await resolverHipotesis(hipotesis.id, estado, veredicto); if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje); });
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hipótesis</h2>
      <div className={cn("space-y-2 rounded-lg border p-3", s.tono === "rojo" && "border-rojo/40", s.tono === "ambar" && "border-ambar/50")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Del formato</span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", s.tono === "ok" && "border-ok/40 text-ok", s.tono === "ambar" && "border-ambar/50 text-ambar", s.tono === "rojo" && "border-rojo/40 text-rojo")}>{hipotesis ? NOMBRE_ESTADO_HIPOTESIS[hipotesis.estado] ?? hipotesis.estado : "sin hipótesis"}{hipotesis?.estado === "abierta" && ` · ${s.texto}`}</span>
        </div>
        {editando ? (
          <div className="space-y-2 text-sm">
            <Textarea value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} rows={3} placeholder="Qué prueba este formato como conjunto, no cada pieza." autoFocus />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.resoluble} onChange={(e) => setF({ ...f, resoluble: e.target.checked })} /> Se resuelve con número y fecha</label>
            {f.resoluble && (
              <div className="grid grid-cols-3 gap-2">
                <select value={f.campo} onChange={(e) => setF({ ...f, campo: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm">{CAMPOS_HIPOTESIS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                <Input type="number" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="≥" className="h-8 text-sm" />
                <Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="h-8 text-sm" />
              </div>
            )}
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={pendiente} onClick={() => setEditando(false)}>Cancelar</Button><Button size="sm" disabled={pendiente || !f.texto.trim()} onClick={guardar}>Guardar</Button></div>
          </div>
        ) : (
          <>
            <p className={cn("text-sm", hipotesis ? "font-medium" : "text-muted-foreground")}>{hipotesis?.texto ?? "Este formato todavía no dice qué prueba."}</p>
            {hipotesis?.campo && <p className="text-xs text-muted-foreground">Se resuelve con <span className="font-mono font-semibold text-foreground">{hipotesis.campo} ≥ {hipotesis.numero}</span> al {fechaCorta(hipotesis.fecha)}{hipotesis.estado !== "abierta" && ` · ${NOMBRE_ESTADO_HIPOTESIS[hipotesis.estado]}`}</p>}
            {puedeEditar && hipotesis?.estado !== "verdadera" && hipotesis?.estado !== "falsa" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setEditando(true)}>{hipotesis ? (hipotesis.campo ? "Editar" : "Completar") : "Escribir hipótesis"}</Button>
                {vencida && <><Input value={veredicto} onChange={(e) => setVeredicto(e.target.value)} placeholder="veredicto en una línea" className="h-7 w-52 text-xs" /><Button size="sm" className="h-7 bg-ok hover:bg-ok/90" disabled={pendiente} onClick={() => resolver("verdadera")}>Verdadera</Button><Button size="sm" variant="outline" className="h-7 text-rojo" disabled={pendiente} onClick={() => resolver("falsa")}>Falsa</Button><Button size="sm" variant="ghost" className="h-7" disabled={pendiente} onClick={() => resolver("sin_datos")}>Sin datos</Button></>}
              </div>
            )}
          </>
        )}
      </div>
      <div className="space-y-1 rounded-lg border p-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">De sus episodios</span>
        {episodios ? (
          <p className="flex flex-wrap gap-x-3 text-sm"><span><b>{episodios.verdaderas}</b> <span className="text-muted-foreground">verdaderas</span></span><span><b>{episodios.falsas}</b> <span className="text-muted-foreground">falsas</span></span><span><b>{episodios.abiertas}</b> <span className="text-muted-foreground">abiertas</span></span>{episodios.vencidas > 0 && <span><b className="text-ambar">{episodios.vencidas}</b> <span className="text-muted-foreground">vencidas por resolver</span></span>}</p>
        ) : <p className="text-sm text-muted-foreground">Sin episodios con hipótesis.</p>}
        <Link href="/hipotesis" className="text-xs text-primary hover:underline">ver en Hipótesis</Link>
      </div>
    </div>
  );
}
