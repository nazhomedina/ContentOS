"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bot, User, Cog, Globe, ArrowRight, CornerDownLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { declararHueco } from "@/lib/acciones/nodo";
import { CLASE_ESTADO_NODO, NOMBRE_ESTADO_NODO, NOMBRE_TIPO, type AristaDef, type EstadoNodo, type NodoEstado, type TipoNodo } from "@/lib/dominio/nodo";
import { fechaHora } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

const ICONO: Record<TipoNodo, React.ComponentType<{ className?: string }>> = { ia: Bot, humano: User, automatizacion: Cog, plataforma: Globe };

export function Grafo({ sistema, semana, nodos, aristas, puedeDeclarar }: { sistema: string; semana: string; nodos: NodoEstado[]; aristas: AristaDef[]; puedeDeclarar: boolean }) {
  const [sel, setSel] = useState<NodoEstado | null>(null);
  const [nota, setNota] = useState("");
  const [pendiente, iniciar] = useTransition();

  // Orden de dibujo: el de definición. Aristas que no son "siguiente" se muestran como etiquetas.
  const idx = Object.fromEntries(nodos.map((n, i) => [n.nodo_clave, i]));
  const saltos = aristas.filter((a) => idx[a.a] !== idx[a.de] + 1);

  function declarar() {
    if (!sel) return;
    iniciar(async () => {
      const r = await declararHueco(semana, sistema, sel.nodo_clave, nota);
      if (r.ok) { toast.success(r.mensaje); setSel(null); setNota(""); } else toast.error(r.mensaje);
    });
  }

  return (
    <>
      <ol className="flex flex-wrap items-stretch gap-y-4">
        {nodos.map((n, i) => {
          const est = (n.estado as EstadoNodo) ?? "agendado";
          const c = CLASE_ESTADO_NODO[est];
          const Icono = ICONO[(n.tipo as TipoNodo) ?? "humano"] ?? User;
          const vuelta = saltos.filter((a) => a.de === n.nodo_clave);
          return (
            <li key={n.nodo_clave} className="flex items-center">
              <button
                type="button"
                onClick={() => setSel(n)}
                className={cn("group relative w-44 rounded-xl border-2 bg-card p-3 text-left transition hover:bg-muted/40", c.borde)}
              >
                <span className={cn("absolute right-2 top-2 size-2.5 rounded-full", c.punto)} />
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icono className="size-3.5" /> {NOMBRE_TIPO[n.tipo as TipoNodo] ?? n.tipo}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-tight">{n.nombre}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{n.dueno ?? "—"}</span>
                <span className={cn("mt-2 block text-[11px] font-medium", c.texto)}>
                  {est === "corrio" ? n.detalle : NOMBRE_ESTADO_NODO[est]}
                </span>
                {vuelta.length > 0 && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CornerDownLeft className="size-3" /> {vuelta.map((a) => a.etiqueta ?? `→ ${a.a}`).join(" · ")}
                  </span>
                )}
              </button>
              {i < nodos.length - 1 && <ArrowRight className="mx-1 size-4 shrink-0 text-muted-foreground/60" />}
            </li>
          );
        })}
      </ol>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="overflow-y-auto">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle>{sel.nombre}</SheetTitle>
                <SheetDescription>{NOMBRE_TIPO[sel.tipo as TipoNodo] ?? sel.tipo} · {sel.dueno ?? "sin dueño"}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6 text-sm">
                <Fila k="Estado esta semana" v={<span className={CLASE_ESTADO_NODO[(sel.estado as EstadoNodo) ?? "agendado"].texto}>{NOMBRE_ESTADO_NODO[(sel.estado as EstadoNodo) ?? "agendado"]}</span>} />
                <Fila k="Evidencia" v={<>{sel.detalle ?? "—"}{sel.cuando && <span className="text-muted-foreground"> · última {fechaHora(sel.cuando)}</span>}</>} />
                <Fila k="Disparador" v={sel.disparador ?? "—"} />
                {sel.nota && <Fila k="Nota" v={sel.nota} />}
                {sel.hueco_nota && <Fila k="Hueco declarado" v={sel.hueco_nota} />}

                {puedeDeclarar && sel.estado !== "corrio" && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="font-semibold">Declarar hueco</p>
                    <p className="text-xs text-muted-foreground">Lo que no ocurrió se escribe con su razón. Nunca se estima.</p>
                    <Textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué no corrió esta semana…" />
                    <Button size="sm" variant="outline" disabled={pendiente || !nota.trim()} onClick={declarar}>Declarar</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Fila({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
      <p>{v}</p>
    </div>
  );
}
