"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { agendarHistoria } from "@/lib/acciones/historias";
import { NOMBRE_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { fechaCorta, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";

/** Manda una historia del buffer a un día de la semana que se ve. Owner. */
export function AgendarHistoria({ id, semana }: { id: string; semana: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <select
      value=""
      disabled={pendiente}
      onChange={(e) => { const dia = Number(e.target.value); if (dia) iniciar(async () => { const r = await agendarHistoria(id, semana, dia); if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje); }); }}
      className="h-7 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
      aria-label="Agendar en un día"
    >
      <option value="">Agendar en…</option>
      {DIAS_SEMANA.map((n, i) => <option key={n} value={i + 1}>{n} {fechaCorta(sumarDias(semana, i)).replace(/^\w+ /, "")}</option>)}
    </select>
  );
}

/** En un día vacío: elige una historia del buffer y la agenda ahí. Owner. */
export function TomarDelBuffer({ semana, dia, buffer }: { semana: string; dia: number; buffer: { id: string; tipo: string; copy: string | null }[] }) {
  const [pendiente, iniciar] = useTransition();
  if (buffer.length === 0) return null;
  return (
    <select
      value=""
      disabled={pendiente}
      onChange={(e) => { const id = e.target.value; if (id) iniciar(async () => { const r = await agendarHistoria(id, semana, dia); if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje); }); }}
      className="h-7 max-w-64 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
      aria-label="Tomar una historia del buffer"
    >
      <option value="">Tomar del buffer…</option>
      {buffer.map((h) => <option key={h.id} value={h.id}>{NOMBRE_TIPO_HISTORIA[h.tipo] ?? h.tipo} · {(h.copy ?? "(sin copy)").slice(0, 60)}</option>)}
    </select>
  );
}
