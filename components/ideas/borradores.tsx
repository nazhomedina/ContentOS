"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { archivarPieza, pasarARedaccion } from "@/lib/acciones/borradores";
import { FORMATOS, NOMBRE_FORMATO, type Formato } from "@/lib/dominio/estados";
import { cn } from "@/lib/utils";

export type Borrador = {
  id: string; id_publico: string; titulo: string | null; notas: string | null; origen: string | null;
  formato_sugerido: string[]; notion_url: string | null; created_at: string;
};

const ORIGEN: Record<string, string> = { radar: "radar", voz: "voz", destilado: "destilado", markie: "Markie", coyuntura: "coyuntura", audiencia: "audiencia", claude: "Claude", legado: "banco Notion", nazho: "Nazho" };
const PRODUCIBLES: Formato[] = ["reel", "yap", "carrusel", "articulo", "newsletter", "historia", "youtube", "x", "canal_ig"];

export function Borradores({ borradores }: { borradores: Borrador[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [sel, setSel] = useState<string | null>(null);
  const [formato, setFormato] = useState<Record<string, string>>({});

  function producir(b: Borrador) {
    const f = formato[b.id] ?? (b.formato_sugerido?.[0]?.toLowerCase() ?? "");
    iniciar(async () => {
      const r = await pasarARedaccion(b.id, f);
      if (r.ok) { toast.success(r.mensaje); if (r.ruta) router.push(r.ruta); } else toast.error(r.mensaje);
    });
  }
  function archivar(id: string) {
    iniciar(async () => {
      const r = await archivarPieza(id);
      if (r.ok) toast.success("Archivada."); else toast.error(r.mensaje);
    });
  }

  if (borradores.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Sin borradores. Captura una línea arriba o pídele a Claude que proponga ideas.</p>;
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {borradores.map((b) => {
        const f = formato[b.id] ?? (b.formato_sugerido?.[0]?.toLowerCase() && FORMATOS.includes(b.formato_sugerido[0].toLowerCase() as Formato) ? b.formato_sugerido[0].toLowerCase() : "");
        return (
          <li
            key={b.id}
            onClick={() => setSel(b.id)}
            className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm transition", sel === b.id ? "border-primary ring-1 ring-primary" : "hover:bg-muted/30")}
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/piezas/${b.id}`} className="font-semibold leading-snug hover:underline">{b.titulo ?? "(sin título)"}</Link>
              <span className="font-mono text-[10px] text-muted-foreground">{b.id_publico}</span>
            </div>
            {b.notas && <p className="line-clamp-4 text-xs text-muted-foreground">{b.notas}</p>}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {b.origen && <Badge variant="outline" className="text-[10px]">{ORIGEN[b.origen] ?? b.origen}</Badge>}
              {b.formato_sugerido?.map((x) => <Badge key={x} variant="secondary" className="text-[10px]">{x}</Badge>)}
              {b.notion_url && <a href={b.notion_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground" onClick={(e) => e.stopPropagation()}><ExternalLink className="size-3" /> Notion</a>}
            </div>
            <div className="mt-auto flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
              <select
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                value={f}
                onChange={(e) => setFormato({ ...formato, [b.id]: e.target.value })}
              >
                <option value="">Formato…</option>
                {PRODUCIBLES.map((x) => <option key={x} value={x}>{NOMBRE_FORMATO[x]}</option>)}
              </select>
              <Button size="sm" className="h-8" disabled={pendiente || !f} onClick={() => producir(b)}>Producir</Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" disabled={pendiente} onClick={() => archivar(b.id)} aria-label="Archivar"><Archive className="size-4" /></Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
