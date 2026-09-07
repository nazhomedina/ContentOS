"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { IdPublico, InsigniaFormato, InsigniaTarea } from "@/components/app/insignias";
import { cambiarEstadoTarea } from "@/lib/acciones/tareas";
import { bucketVencimiento, fechaCorta, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type TareaEnCola = {
  id: string;
  tipo: string;
  estado: string;
  vence: string | null;
  hecha_en: string | null;
  nota_bloqueo: string | null;
  asignado_a: string | null;
  pieza: { id: string; id_publico: string; titulo: string | null; formato: string; estado: string } | null;
  historia: { id: string; serie: string; dia: number; semana: string; copy: string | null } | null;
  asignado: { nombre: string } | null;
};

const SERIE: Record<string, string> = {
  te_lo_resumo: "Te lo resumo", archivo_folklore: "Archivo Folklore", criterio_viernes: "Criterio del viernes",
  amplificacion: "Amplificación", espontanea: "Espontánea",
};

export function FilaTarea({ tarea, mostrarAsignado }: { tarea: TareaEnCola; mostrarAsignado: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const b = bucketVencimiento(tarea.vence);
  const vencida = b === "vencida" && tarea.estado !== "hecha";

  const href = tarea.pieza ? `/piezas/${tarea.pieza.id}` : tarea.historia ? `/historias?semana=${tarea.historia.semana}` : "#";
  const titulo = tarea.pieza
    ? (tarea.pieza.titulo ?? tarea.pieza.id_publico)
    : tarea.historia
      ? `${SERIE[tarea.historia.serie] ?? tarea.historia.serie} · ${DIAS_SEMANA[tarea.historia.dia - 1]}`
      : "Tarea";

  function mover(estado: string, notaBloqueo?: string) {
    iniciar(async () => {
      const r = await cambiarEstadoTarea(tarea.id, estado, notaBloqueo);
      if (r.ok) { setAbierto(false); setNota(""); toast.success(estado === "bloqueada" ? "Bloqueada. Nazho la ve en rojo." : "Listo."); }
      else toast.error(r.mensaje);
    });
  }

  return (
    <li className={cn("flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between", tarea.estado === "hecha" && "opacity-60")}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {tarea.pieza && <IdPublico id={tarea.pieza.id_publico} />}
          <Link href={href} className="truncate font-semibold hover:underline">{titulo}</Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {tarea.pieza && <InsigniaFormato formato={tarea.pieza.formato} />}
          {tarea.historia && <InsigniaFormato formato="historia" />}
          <InsigniaTarea tipo={tarea.tipo} />
          <span className={cn("font-medium", vencida ? "text-rojo" : "text-muted-foreground")}>
            {vencida ? "venció " : "vence "}{fechaCorta(tarea.vence)}
          </span>
          {mostrarAsignado && <span className="text-muted-foreground">· {tarea.asignado?.nombre ?? "sin asignar"}</span>}
          {tarea.estado === "en_curso" && <span className="text-primary">· en curso</span>}
        </div>
        {tarea.estado === "bloqueada" && tarea.nota_bloqueo && (
          <p className="text-xs text-rojo">Bloqueada: {tarea.nota_bloqueo}</p>
        )}
      </div>

      {tarea.estado !== "hecha" && (
        <div className="flex shrink-0 gap-1.5">
          {tarea.estado === "bloqueada" ? (
            <Button size="sm" variant="outline" disabled={pendiente} onClick={() => mover("en_curso")}>Desbloquear</Button>
          ) : (
            <>
              {tarea.estado === "pendiente" && (
                <Button size="sm" variant="outline" disabled={pendiente} onClick={() => mover("en_curso")}>Empezar</Button>
              )}
              <Button size="sm" variant="outline" disabled={pendiente} onClick={() => mover("hecha")}>Hecha</Button>
              <Dialog open={abierto} onOpenChange={setAbierto}>
                <DialogTrigger render={<Button size="sm" variant="ghost" className="text-rojo hover:text-rojo" />}>Bloqueada</DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>¿Qué te detiene?</DialogTitle></DialogHeader>
                  <Textarea autoFocus value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Falta el RAW, el guion no cuadra, no tengo el logo…" rows={3} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
                    <Button variant="destructive" disabled={pendiente || !nota.trim()} onClick={() => mover("bloqueada", nota)}>Marcar bloqueada</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}
    </li>
  );
}
