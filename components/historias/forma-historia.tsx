"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { crearHistoria, editarHistoria, type CamposHistoria } from "@/lib/acciones/historias";
import { NOMBRE_REGISTRO, NOMBRE_SERIE_HISTORIA, REGISTROS_HISTORIA, SERIES_HISTORIA } from "@/lib/dominio/historias";
import { DIAS_SEMANA } from "@/lib/dominio/tiempo";

export type OpcionRecurso = { id: string; nombre: string; keyword: string | null };
export type OpcionPieza = { id: string; id_publico: string | null; titulo: string | null };
export type HistoriaEditable = { id: string; dia: number; serie: string; registro: string; copy: string | null; keyword: string | null; recurso_id?: string | null; pieza_amplificada_id?: string | null };

/** Alta o edición de una historia por el owner: día, serie, registro, copy, keyword, recurso y pieza amplificada. */
export function FormaHistoria({ semana, historia, recursos, piezas, onListo }: { semana: string; historia?: HistoriaEditable; recursos: OpcionRecurso[]; piezas: OpcionPieza[]; onListo: () => void }) {
  const [c, setC] = useState({
    dia: historia?.dia ?? 1, serie: historia?.serie ?? "te_lo_resumo", registro: historia?.registro ?? "producido",
    copy: historia?.copy ?? "", keyword: historia?.keyword ?? "", recurso_id: historia?.recurso_id ?? "", pieza_amplificada_id: historia?.pieza_amplificada_id ?? "",
  });
  const [pendiente, iniciar] = useTransition();
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setC({ ...c, [k]: k === "dia" ? Number(e.target.value) : e.target.value });
  function guardar() {
    iniciar(async () => {
      const campos: CamposHistoria = { semana, ...c };
      const r = historia ? await editarHistoria(historia.id, campos) : await crearHistoria(campos);
      if (r.ok) { toast.success(r.mensaje); onListo(); } else toast.error(r.mensaje);
    });
  }
  const campo = "flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
  const select = "h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground";
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={campo}>Día<select value={c.dia} onChange={set("dia")} className={select}>{DIAS_SEMANA.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label>
        <label className={campo}>Serie<select value={c.serie} onChange={set("serie")} className={select}>{SERIES_HISTORIA.map((s) => <option key={s} value={s}>{NOMBRE_SERIE_HISTORIA[s]}</option>)}</select></label>
        <label className={campo}>Registro<select value={c.registro} onChange={set("registro")} className={select}>{REGISTROS_HISTORIA.map((r) => <option key={r} value={r}>{NOMBRE_REGISTRO[r]}</option>)}</select></label>
      </div>
      <Textarea value={c.copy} onChange={set("copy")} rows={3} placeholder="El copy de la historia, tal como va en pantalla." autoFocus />
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={campo}>Keyword del DM<Input value={c.keyword} onChange={set("keyword")} placeholder="RORY" className="h-8 font-mono text-sm uppercase" /></label>
        <label className={campo}>Recurso<select value={c.recurso_id} onChange={set("recurso_id")} className={select}><option value="">Sin recurso</option>{recursos.map((r) => <option key={r.id} value={r.id}>{r.keyword ? `${r.keyword} · ` : ""}{r.nombre}</option>)}</select></label>
        <label className={campo}>Amplifica<select value={c.pieza_amplificada_id} onChange={set("pieza_amplificada_id")} className={select}><option value="">Ninguna pieza</option>{piezas.map((p) => <option key={p.id} value={p.id}>{p.id_publico} · {p.titulo ?? "(sin título)"}</option>)}</select></label>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pendiente} onClick={onListo}>Cancelar</Button>
        <Button size="sm" disabled={pendiente} onClick={guardar}>{historia ? "Guardar" : "Proponer"}</Button>
      </div>
    </div>
  );
}
