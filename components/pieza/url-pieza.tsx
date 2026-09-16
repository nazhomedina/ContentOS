"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarUrl } from "@/lib/acciones/piezas";

const PLATAFORMAS = ["instagram", "youtube", "tiktok", "x", "kit", "blog", "linkedin"];

/** La URL de la pieza en la ficha: se captura en cuanto existe, antes o después de publicar. */
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

  if (!puedeEditar) {
    return url
      ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-primary underline"><ExternalLink className="size-3.5 shrink-0" />{url}</a>
      : <p className="text-sm text-muted-foreground">Sin URL todavía.</p>;
  }

  return (
    <div className="space-y-2">
      <Input
        inputMode="url"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && cambio) { e.preventDefault(); guardar(); } }}
        placeholder="https://www.instagram.com/reel/…"
        className="h-8 text-xs"
        disabled={pendiente}
      />
      <div className="flex items-center gap-1.5">
        <select className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs" value={plat} onChange={(e) => setPlat(e.target.value)} disabled={pendiente}>
          {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Button size="sm" variant={cambio ? "default" : "outline"} disabled={pendiente || !cambio} onClick={guardar}>Guardar</Button>
        {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex size-7 items-center justify-center rounded-md text-primary hover:bg-muted" aria-label="Abrir"><ExternalLink className="size-3.5" /></a>}
      </div>
      <p className="text-[11px] text-muted-foreground">{url ? "Guardada. Es la que habilita «Publicada»." : "Pégala en cuanto exista. Es la que habilita «Publicada»."}</p>
    </div>
  );
}
