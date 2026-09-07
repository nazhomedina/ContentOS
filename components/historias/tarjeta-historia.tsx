"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { metricasHistoria, programarHistoria, publicarHistoria } from "@/lib/acciones/historias";
import { urlFirmada } from "@/lib/acciones/piezas";
import { fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";

export type HistoriaCard = {
  id: string; dia: number; orden: number; serie: string; registro: string; copy: string | null; asset_url: string | null;
  keyword: string | null; estado: string; programada_para: string | null; publicada_en: string | null;
  views: number | null; replies: number | null; dms: number | null;
  pieza: { id: string; id_publico: string; titulo: string | null } | null;
  recurso: { nombre: string; slug_go: string | null } | null;
};

const SERIE: Record<string, string> = {
  te_lo_resumo: "📚 Te lo resumo", archivo_folklore: "🗄️ Archivo Folklore", criterio_viernes: "🧭 Criterio del viernes",
  amplificacion: "Amplificación", espontanea: "Espontánea",
};

export function TarjetaHistoria({ historia: h, rol }: { historia: HistoriaCard; rol: Rol }) {
  const [pendiente, iniciar] = useTransition();
  const [hora, setHora] = useState("");
  const [m, setM] = useState({ views: h.views ?? "", replies: h.replies ?? "", dms: h.dms ?? "" });
  const puedeActuar = rol !== "viewer";

  function copiar() {
    navigator.clipboard.writeText(h.copy ?? "").then(() => toast.success("Copy copiado."));
  }
  function descargar() {
    if (!h.asset_url) return;
    if (/^https?:\/\//.test(h.asset_url)) { window.open(h.asset_url, "_blank", "noopener"); return; }
    iniciar(async () => {
      const u = await urlFirmada(h.asset_url!);
      if (u) window.open(u, "_blank", "noopener"); else toast.error("No se pudo generar el enlace.");
    });
  }
  function programar() {
    iniciar(async () => {
      const r = await programarHistoria(h.id, hora);
      if (r.ok) toast.success("Programada."); else toast.error(r.mensaje);
    });
  }
  function publicar() {
    iniciar(async () => {
      const r = await publicarHistoria(h.id);
      if (r.ok) toast.success("Publicada. Mañana anota views, replies y DMs."); else toast.error(r.mensaje);
    });
  }
  function guardarMetricas() {
    iniciar(async () => {
      const num = (x: string | number) => (x === "" ? null : Number(x));
      const r = await metricasHistoria(h.id, { views: num(m.views), replies: num(m.replies), dms: num(m.dms) });
      if (r.ok) toast.success(r.mensaje ?? "Guardado."); else toast.error(r.mensaje);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">{SERIE[h.serie] ?? h.serie}</span>
        <Badge variant="outline">{h.registro}</Badge>
        <Badge variant={h.estado === "publicada" ? "default" : "secondary"}>{h.estado}</Badge>
      </div>
      {h.copy && <p className="whitespace-pre-wrap rounded bg-muted/60 p-2 text-xs">{h.copy}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {h.keyword && <span>keyword <span className="font-mono font-semibold text-foreground">{h.keyword}</span></span>}
        {h.recurso && <span>recurso {h.recurso.nombre}</span>}
        {h.pieza && <Link href={`/piezas/${h.pieza.id}`} className="text-primary underline">amplifica {h.pieza.id_publico}</Link>}
        {h.programada_para && <span>programada {fechaHora(h.programada_para)}</span>}
        {h.publicada_en && <span>publicada {fechaHora(h.publicada_en)}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {h.copy && <Button size="sm" variant="outline" onClick={copiar}><Copy className="size-3.5" /> Copy</Button>}
        {h.asset_url && <Button size="sm" variant="outline" disabled={pendiente} onClick={descargar}><Download className="size-3.5" /> Asset</Button>}
      </div>

      {puedeActuar && h.estado === "aprobada" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
          <Input type="datetime-local" className="h-8 w-auto text-xs" value={hora} onChange={(e) => setHora(e.target.value)} />
          <Button size="sm" variant="outline" disabled={pendiente || !hora} onClick={programar}>Programada</Button>
          <Button size="sm" disabled={pendiente} onClick={publicar}>Publicada</Button>
        </div>
      )}
      {puedeActuar && h.estado === "programada" && (
        <div className="border-t pt-2"><Button size="sm" disabled={pendiente} onClick={publicar}>Publicada</Button></div>
      )}
      {puedeActuar && h.estado === "publicada" && (
        <div className="space-y-1.5 border-t pt-2">
          <p className="text-xs text-muted-foreground">Al día siguiente, de insights nativos (captura manual con tu nombre):</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(["views", "replies", "dms"] as const).map((k) => (
              <label key={k} className="space-y-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {k}
                <Input type="number" inputMode="numeric" min={0} className="h-8 text-xs" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <Button size="sm" variant="outline" disabled={pendiente} onClick={guardarMetricas}>Guardar</Button>
        </div>
      )}
    </div>
  );
}
