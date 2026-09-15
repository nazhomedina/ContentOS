"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarUrl } from "@/lib/acciones/piezas";

const PLATAFORMAS = ["instagram", "youtube", "tiktok", "x", "kit", "blog", "linkedin"];

/** La URL de la pieza, siempre a la vista: todo lo que Mariela sube lo captura aquí, antes o después de publicar. */
export function UrlPieza({ piezaId, url, plataforma, puedeEditar }: { piezaId: string; url: string | null; plataforma: string | null; puedeEditar: boolean }) {
  const [valor, setValor] = useState(url ?? "");
  const [plat, setPlat] = useState(plataforma ?? "instagram");
  const [pendiente, iniciar] = useTransition();
  const cambio = valor.trim() !== (url ?? "") || (valor.trim() && plat !== (plataforma ?? "instagram"));

  function guardar() {
    iniciar(async () => {
      const r = await guardarUrl(piezaId, valor, plat);
      if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
      <Link2 className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</span>
      {puedeEditar ? (
        <>
          <Input
            inputMode="url"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && cambio) { e.preventDefault(); guardar(); } }}
            placeholder="https://www.instagram.com/reel/…  (pégala en cuanto exista)"
            className="h-8 min-w-[16rem] flex-1 text-xs"
            disabled={pendiente}
          />
          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={plat} onChange={(e) => setPlat(e.target.value)} disabled={pendiente}>
            {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button size="sm" disabled={pendiente || !cambio} onClick={guardar}>Guardar</Button>
        </>
      ) : (
        <span className="text-sm">{url ?? <span className="text-muted-foreground">sin URL todavía</span>}</span>
      )}
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink className="size-3.5" /> abrir</a>}
    </div>
  );
}
