"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agregarReferencia, borrarReferencia } from "@/lib/acciones/formatos";

export type ReferenciaFila = { id: string; cuenta: string | null; url: string | null; multiplicador: number | null; views: number | null; duracion_s: number | null; nota: string | null; pieza: { id: string; id_publico: string | null; titulo: string | null } | null };

/** La evidencia del formato: reels de terceros (y propios) con su multiplicador. Desde Cowork entran al analizar una cuenta. */
export function ReferenciasFormato({ formatoId, referencias, puedeEditar }: { formatoId: string; referencias: ReferenciaFila[]; puedeEditar: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [n, setN] = useState({ cuenta: "", url: "", multiplicador: "", views: "", duracion_s: "", nota: "" });
  const [pendiente, iniciar] = useTransition();
  const num = (x: string) => (x.trim() === "" ? null : Number(x.replace(/,/g, "")));
  function agregar() {
    iniciar(async () => {
      const r = await agregarReferencia(formatoId, { cuenta: n.cuenta, url: n.url, multiplicador: num(n.multiplicador), views: num(n.views), duracion_s: num(n.duracion_s), nota: n.nota });
      if (r.ok) { toast.success(r.mensaje); setN({ cuenta: "", url: "", multiplicador: "", views: "", duracion_s: "", nota: "" }); setAbierto(false); } else toast.error(r.mensaje);
    });
  }
  const terceros = referencias.filter((r) => r.cuenta && r.cuenta !== "@nazho" && !r.pieza).length;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referencias · la evidencia</h2>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{referencias.length} · {terceros} de terceros{puedeEditar && !abierto && <Button size="sm" variant="outline" className="h-7" onClick={() => setAbierto(true)}><Plus className="size-3.5" /> Agregar</Button>}</span>
      </div>
      {abierto && (
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-6">
          <Input value={n.cuenta} onChange={(e) => setN({ ...n, cuenta: e.target.value })} placeholder="@cuenta" className="h-8 text-sm sm:col-span-2" autoFocus />
          <Input value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} placeholder="https://www.instagram.com/reel/…" className="h-8 text-sm sm:col-span-4" />
          <Input value={n.multiplicador} onChange={(e) => setN({ ...n, multiplicador: e.target.value })} placeholder="mult. (x)" inputMode="decimal" className="h-8 text-sm" />
          <Input value={n.views} onChange={(e) => setN({ ...n, views: e.target.value })} placeholder="views" inputMode="numeric" className="h-8 text-sm" />
          <Input value={n.duracion_s} onChange={(e) => setN({ ...n, duracion_s: e.target.value })} placeholder="seg" inputMode="numeric" className="h-8 text-sm" />
          <Input value={n.nota} onChange={(e) => setN({ ...n, nota: e.target.value })} placeholder="qué mecánica se copia" className="h-8 text-sm sm:col-span-3" />
          <div className="flex justify-end gap-2 sm:col-span-6"><Button size="sm" variant="outline" disabled={pendiente} onClick={() => setAbierto(false)}>Cancelar</Button><Button size="sm" disabled={pendiente || (!n.url.trim())} onClick={agregar}>Agregar</Button></div>
        </div>
      )}
      {referencias.length === 0 ? <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">Sin referencias. Desde Cowork: «agrega como referencia de {"{código}"} este reel de @cuenta».</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><th className="px-2.5 py-1.5">Cuenta</th><th className="px-2.5 py-1.5">Reel</th><th className="px-2.5 py-1.5 text-right">Mult.</th><th className="px-2.5 py-1.5 text-right">Views</th><th className="px-2.5 py-1.5">Nota</th>{puedeEditar && <th></th>}</tr></thead>
            <tbody>
              {referencias.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-2.5 py-1.5 font-semibold">{r.cuenta ?? "propia"}{r.pieza && <span className="ml-1 font-normal text-muted-foreground">propia</span>}</td>
                  <td className="px-2.5 py-1.5">{r.pieza ? <Link href={`/piezas/${r.pieza.id}`} className="text-primary hover:underline">{r.pieza.id_publico} {r.pieza.titulo}</Link> : r.url ? <a href={r.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">reel <ExternalLink className="size-3" /></a> : "—"}{r.duracion_s ? <span className="text-muted-foreground"> · {r.duracion_s} s</span> : null}</td>
                  <td className="px-2.5 py-1.5 text-right font-bold tabular-nums">{r.multiplicador != null ? `${r.multiplicador}x` : "—"}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">{r.views != null ? r.views.toLocaleString("es-MX") : "—"}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground">{r.nota ?? ""}</td>
                  {puedeEditar && <td className="px-1 py-1.5"><button type="button" onClick={() => iniciar(async () => { const x = await borrarReferencia(formatoId, r.id); if (x.ok) toast.success(x.mensaje); else toast.error(x.mensaje); })} disabled={pendiente} className="rounded p-1 text-muted-foreground hover:text-rojo" aria-label="Quitar referencia"><X className="size-3.5" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
