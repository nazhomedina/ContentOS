"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Download, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { descartarHistoria, guardarAssetHistoria, metricasHistoria, programarHistoria, publicarHistoria } from "@/lib/acciones/historias";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { FormaHistoria, type OpcionPieza, type OpcionRecurso } from "./forma-historia";
import { urlFirmada } from "@/lib/acciones/piezas";
import { fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";
import { NOMBRE_REGISTRO, NOMBRE_SERIE_HISTORIA } from "@/lib/dominio/historias";

export type HistoriaCard = {
  id: string; semana: string; dia: number; orden: number; serie: string; registro: string; copy: string | null; asset_url: string | null;
  recurso_id: string | null; pieza_amplificada_id: string | null;
  keyword: string | null; estado: string; programada_para: string | null; publicada_en: string | null;
  views: number | null; replies: number | null; dms: number | null;
  pieza: { id: string; id_publico: string; titulo: string | null } | null;
  recurso: { id: string; nombre: string; slug_go: string | null; keyword: string | null } | null;
};

export function TarjetaHistoria({ historia: h, rol, recursos = [], piezas = [] }: { historia: HistoriaCard; rol: Rol; recursos?: OpcionRecurso[]; piezas?: OpcionPieza[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [hora, setHora] = useState("");
  const [editando, setEditando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [m, setM] = useState({ views: h.views ?? "", replies: h.replies ?? "", dms: h.dms ?? "" });
  const puedeActuar = rol !== "viewer";
  const esOwner = rol === "owner";
  const faltaAsset = h.registro === "producido" && !h.asset_url && h.estado !== "descartada";

  async function subirAsset(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setSubiendo(true);
    const supabase = crearClienteNavegador();
    const nombre = f.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_");
    const ruta = `historias/${h.semana}/${h.id}/${nombre}`;
    const { error } = await supabase.storage.from("assets").upload(ruta, f, { upsert: true });
    if (error) { toast.error(`${f.name}: ${error.message}`); setSubiendo(false); return; }
    const r = await guardarAssetHistoria(h.id, ruta);
    if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    setSubiendo(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }
  function descartar() {
    if (!confirm("¿Descartar esta historia? Se borra su tarea si seguía abierta.")) return;
    iniciar(async () => {
      const r = await descartarHistoria(h.id);
      if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    });
  }

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

  if (editando) return <FormaHistoria semana={h.semana} historia={h} recursos={recursos} piezas={piezas} onListo={() => setEditando(false)} />;

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">{NOMBRE_SERIE_HISTORIA[h.serie] ?? h.serie}</span>
        <Badge variant="outline" title={NOMBRE_REGISTRO[h.registro]}>{h.registro}</Badge>
        <Badge variant={h.estado === "publicada" ? "default" : "secondary"}>{h.estado}</Badge>
        {esOwner && h.estado !== "publicada" && (
          <span className="ml-auto flex gap-0.5">
            <button type="button" onClick={() => setEditando(true)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Editar historia"><Pencil className="size-3.5" /></button>
            <button type="button" onClick={descartar} disabled={pendiente} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rojo" aria-label="Descartar historia"><X className="size-3.5" /></button>
          </span>
        )}
      </div>
      {h.copy && <p className="whitespace-pre-wrap rounded bg-muted/60 p-2 text-xs">{h.copy}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {h.keyword && <span>keyword <span className="font-mono font-semibold text-foreground">{h.keyword}</span></span>}
        {h.recurso && <Link href={`/recursos#${h.recurso.id}`} className="text-primary underline">recurso {h.recurso.keyword ?? h.recurso.nombre}</Link>}
        {h.pieza && <Link href={`/piezas/${h.pieza.id}`} className="text-primary underline">amplifica {h.pieza.id_publico}</Link>}
        {h.programada_para && <span>programada {fechaHora(h.programada_para)}</span>}
        {h.publicada_en && <span>publicada {fechaHora(h.publicada_en)}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {h.copy && <Button size="sm" variant="outline" onClick={copiar}><Copy className="size-3.5" /> Copy</Button>}
        {h.asset_url && <Button size="sm" variant="outline" disabled={pendiente} onClick={descargar}><Download className="size-3.5" /> Asset</Button>}
        {faltaAsset && puedeActuar && h.estado !== "propuesta" && (
          <>
            <input ref={input} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => subirAsset(e.target.files)} />
            <Button size="sm" variant="outline" disabled={subiendo} onClick={() => input.current?.click()}><Upload className="size-3.5" /> {subiendo ? "Subiendo…" : "Subir asset"}</Button>
            <span className="text-xs text-ambar">falta el asset producido</span>
          </>
        )}
        {faltaAsset && h.estado === "propuesta" && <span className="text-xs text-muted-foreground">Mariela sube el asset cuando se apruebe</span>}
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
