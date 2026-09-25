"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { borrarDeclaracion, declarar } from "@/lib/acciones/bitacora";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type EntradaDia = { id: string; texto: string; minutos: number | null; origen: string; created_at: string; pieza: { id_publico: string | null } | null };

/**
 * Mi día: lo que el tablero anotó solo (Tomar, Lista, Programar, Publicada) más lo que la persona declara a mano.
 * En ámbar mientras no haya ninguna entrada manual: el input diario que Nazho necesita.
 */
export function MiDia({ hoy, entradas }: { hoy: string; entradas: EntradaDia[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const [minutos, setMinutos] = useState("");
  const [abierto, setAbierto] = useState(false);
  const autos = entradas.filter((e) => e.origen === "auto").length;
  const manuales = entradas.length - autos;
  const sinManual = manuales === 0;
  const hora = (ts: string) => new Date(ts).toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" });

  function enviar() {
    if (!texto.trim()) return;
    iniciar(async () => {
      const r = await declarar({ texto, minutos: minutos ? Number(minutos) : null });
      if (!r.ok) { toast.error(r.mensaje); return; }
      setTexto(""); setMinutos("");
      toast.success(r.mensaje);
      router.refresh();
    });
  }

  return (
    <section className={cn("rounded-xl border p-4", sinManual ? "border-ambar/70 bg-ambar/5" : "")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full flex-col items-start gap-0.5 text-left md:w-56" aria-expanded={abierto}>
          <span className="text-sm font-bold">Mi día · {fechaCorta(hoy)}</span>
          <span className={cn("text-xs", sinManual ? "font-semibold text-ambar" : "text-muted-foreground")}>
            {autos} {autos === 1 ? "automático" : "automáticos"} · {manuales} {manuales === 1 ? "tuyo" : "tuyos"}{entradas.length > 0 && <> · {abierto ? "ocultar" : "ver"}</>}
          </span>
        </button>
        <label htmlFor="mi-dia-texto" className="sr-only">Algo más de hoy</label>
        <Input id="mi-dia-texto" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} placeholder="Lo que hiciste fuera del tablero. Lo demás ya quedó anotado con hora." className="h-10 flex-1 bg-background" />
        <div className="flex gap-2">
          <label htmlFor="mi-dia-min" className="sr-only">Minutos</label>
          <Input id="mi-dia-min" type="number" inputMode="numeric" min={0} placeholder="min" value={minutos} onChange={(e) => setMinutos(e.target.value)} className="h-10 w-20 bg-background" />
          <Button variant="secondary" className="h-10" disabled={pendiente || !texto.trim()} onClick={enviar}>{pendiente ? "Guardando…" : "Declarar"}</Button>
        </div>
      </div>
      {abierto && entradas.length > 0 && (
        <ul className="mt-3 divide-y rounded-lg border bg-background text-sm">
          {entradas.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-1.5">
              <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{hora(e.created_at)}</span>
              <span className="min-w-0 flex-1 truncate">{e.texto}{e.minutos ? <span className="text-muted-foreground"> · {e.minutos} min</span> : null}</span>
              {e.origen === "auto"
                ? <span className="text-[11px] text-muted-foreground">auto</span>
                : <button type="button" onClick={() => iniciar(async () => { const r = await borrarDeclaracion(e.id); if (!r.ok) toast.error(r.mensaje); else router.refresh(); })} disabled={pendiente} className="rounded p-1 text-muted-foreground hover:text-rojo" aria-label="Borrar"><Trash2 className="size-3.5" /></button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
