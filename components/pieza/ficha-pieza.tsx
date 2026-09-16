"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { moverEstado, actualizarPieza } from "@/lib/acciones/nodo";
import { ESTADOS_PIEZA, TIPOS, NOMBRE_ESTADO, NOMBRE_TIPO } from "@/lib/dominio/estados";

type Perfil = { user_id: string; nombre: string; rol: string };
type FormatoOpcion = { id: string; codigo: string; nombre: string };

/** La ficha de la pieza en la columna derecha: cada campo se cambia en su renglón. Solo owner. */
export function FichaPieza({ piezaId, estado, tipo, fechaObjetivo, responsableId, formatoId, etapa, perfiles, formatos }: {
  piezaId: string; estado: string; tipo: string | null; fechaObjetivo: string | null; responsableId: string | null;
  formatoId: string | null; etapa: string | null; perfiles: Perfil[]; formatos: FormatoOpcion[];
}) {
  const [pendiente, iniciar] = useTransition();

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

  const sel = "h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs";
  return (
    <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
      <Renglon k="Estado">
        <select className={sel} value={estado} disabled={pendiente || estado === "publicada"} onChange={(e) => mover(e.target.value)}>
          {ESTADOS_PIEZA.filter((e) => e !== "publicada").map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
          {estado === "publicada" && <option value="publicada">Publicada</option>}
        </select>
      </Renglon>
      <Renglon k="Tipo">
        <select className={sel} value={tipo ?? ""} disabled={pendiente} onChange={(e) => guardar({ tipo: e.target.value || null })}>
          <option value="">Sin tipo</option>
          {TIPOS.map((f) => <option key={f} value={f}>{NOMBRE_TIPO[f]}</option>)}
        </select>
      </Renglon>
      <Renglon k="Formato">
        <select className={sel} value={formatoId ?? ""} disabled={pendiente} onChange={(e) => guardar({ formato_id: e.target.value || null })}>
          <option value="">Sin formato</option>
          {formatos.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
        </select>
      </Renglon>
      <Renglon k="Etapa">
        <select className={sel} value={etapa ?? ""} disabled={pendiente} onChange={(e) => guardar({ etapa_embudo: e.target.value || null })}>
          <option value="">Sin etapa</option>
          <option value="atraer">Atraer</option>
          <option value="capturar">Capturar</option>
          <option value="convertir">Convertir</option>
        </select>
      </Renglon>
      <Renglon k="Fecha objetivo">
        <Input type="date" className="h-8 text-xs" defaultValue={fechaObjetivo ?? ""} onBlur={(e) => e.target.value !== (fechaObjetivo ?? "") && guardar({ fecha_objetivo: e.target.value || null })} />
      </Renglon>
      <Renglon k="Responsable">
        <select className={sel} value={responsableId ?? ""} disabled={pendiente} onChange={(e) => guardar({ responsable_id: e.target.value || null })}>
          <option value="">Sin asignar</option>
          {perfiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
        </select>
      </Renglon>
    </dl>
  );
}

function Renglon({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
