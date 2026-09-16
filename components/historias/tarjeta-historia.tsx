"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Download, Inbox, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { desagendarHistoria, descartarHistoria, guardarAssetHistoria, metricasHistoria, programarHistoria, publicarHistoria } from "@/lib/acciones/historias";
import { urlFirmada } from "@/lib/acciones/piezas";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { NOMBRE_REGISTRO, NOMBRE_TIPO_HISTORIA, TONO_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";
import { AgendarHistoria } from "./agendar";
import { FormaHistoria, type OpcionPieza, type OpcionRecurso } from "./forma-historia";

export type HistoriaCard = {
  id: string; semana: string | null; dia: number | null; orden: number; tipo: string; registro: string; copy: string | null; asset_url: string | null;
  recurso_id: string | null; pieza_amplificada_id: string | null;
  keyword: string | null; estado: string; programada_para: string | null; publicada_en: string | null;
  views: number | null; replies: number | null; dms: number | null;
  pieza: { id: string; id_publico: string; titulo: string | null } | null;
  recurso: { id: string; nombre: string; slug_go: string | null; keyword: string | null } | null;
};
type Props = { historia: HistoriaCard; rol: Rol; recursos?: OpcionRecurso[]; piezas?: OpcionPieza[]; semanaVista: string };

export function TipoHistoria({ tipo }: { tipo: string }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold"><i className={cn("size-2 rounded-[2px]", TONO_TIPO_HISTORIA[tipo] ?? "bg-foreground")} />{NOMBRE_TIPO_HISTORIA[tipo] ?? tipo}</span>;
}
function Estado({ estado }: { estado: string }) {
  return <span className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-medium", estado === "publicada" ? "border-foreground bg-foreground text-background" : estado === "propuesta" ? "border-dashed text-muted-foreground" : "")}>{estado}</span>;
}

/** Lo que se puede hacer con una historia, compartido por la tarjeta y la fila. */
function useHistoria(h: HistoriaCard, rol: Rol) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const puedeActuar = rol !== "viewer";
  const esOwner = rol === "owner";
  const faltaAsset = h.registro === "producido" && !h.asset_url;
  const aviso = (r: { ok: boolean; mensaje?: string }, okMsg?: string) => { if (r.ok) toast.success(r.mensaje ?? okMsg ?? "Listo."); else toast.error(r.mensaje); };
  return {
    pendiente, subiendo, input, puedeActuar, esOwner, faltaAsset,
    copiar: () => navigator.clipboard.writeText(h.copy ?? "").then(() => toast.success("Copy copiado.")),
    descargar: () => {
      if (!h.asset_url) return;
      if (/^https?:\/\//.test(h.asset_url)) { window.open(h.asset_url, "_blank", "noopener"); return; }
      iniciar(async () => { const u = await urlFirmada(h.asset_url!); if (u) window.open(u, "_blank", "noopener"); else toast.error("No se pudo generar el enlace."); });
    },
    programar: (hora: string) => iniciar(async () => { aviso(await programarHistoria(h.id, hora), "Programada."); }),
    publicar: () => iniciar(async () => { aviso(await publicarHistoria(h.id), "Publicada. Mañana anota views, replies y DMs."); }),
    guardarMetricas: (m: { views: string | number; replies: string | number; dms: string | number }) => iniciar(async () => {
      const num = (x: string | number) => (x === "" ? null : Number(x));
      aviso(await metricasHistoria(h.id, { views: num(m.views), replies: num(m.replies), dms: num(m.dms) }));
    }),
    subirAsset: async (files: FileList | null) => {
      const f = files?.[0];
      if (!f) return;
      setSubiendo(true);
      const supabase = crearClienteNavegador();
      const nombre = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const ruta = `historias/${h.semana ?? "buffer"}/${h.id}/${nombre}`;
      const { error } = await supabase.storage.from("assets").upload(ruta, f, { upsert: true });
      if (error) toast.error(`${f.name}: ${error.message}`); else aviso(await guardarAssetHistoria(h.id, ruta));
      setSubiendo(false);
      if (input.current) input.current.value = "";
      router.refresh();
    },
    descartar: () => { if (confirm("¿Descartar esta historia? Se borra su tarea si seguía abierta.")) iniciar(async () => { aviso(await descartarHistoria(h.id)); }); },
    alBuffer: () => iniciar(async () => { aviso(await desagendarHistoria(h.id)); }),
  };
}

function IconosOwner({ h, a, onEditar }: { h: HistoriaCard; a: ReturnType<typeof useHistoria>; onEditar: () => void }) {
  if (!a.esOwner || h.estado === "publicada") return null;
  return (
    <span className="flex shrink-0 gap-0.5">
      <button type="button" onClick={onEditar} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Editar historia" title="Editar"><Pencil className="size-3.5" /></button>
      {h.semana && <button type="button" onClick={a.alBuffer} disabled={a.pendiente} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Devolver al buffer" title="Al buffer"><Inbox className="size-3.5" /></button>}
      <button type="button" onClick={a.descartar} disabled={a.pendiente} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rojo" aria-label="Descartar historia" title="Descartar"><X className="size-3.5" /></button>
    </span>
  );
}

function Meta({ h }: { h: HistoriaCard }) {
  return (
    <>
      {h.keyword && <span>keyword <span className="font-mono font-semibold text-foreground">{h.keyword}</span></span>}
      {h.recurso && <Link href={`/recursos#${h.recurso.id}`} className="text-primary hover:underline">recurso {h.recurso.keyword ?? h.recurso.nombre}</Link>}
      {h.pieza && <Link href={`/piezas/${h.pieza.id}`} className="text-primary hover:underline">amplifica {h.pieza.id_publico}</Link>}
      {h.programada_para && <span>programada {fechaHora(h.programada_para)}</span>}
      {h.publicada_en && <span>publicada {fechaHora(h.publicada_en)}</span>}
    </>
  );
}

/** La tarjeta completa: copy entero, asset y botones grandes. Es lo que ve Mariela para el día de hoy. */
export function TarjetaHistoria({ historia: h, rol, recursos = [], piezas = [], semanaVista }: Props) {
  const a = useHistoria(h, rol);
  const [editando, setEditando] = useState(false);
  const [hora, setHora] = useState("");
  const [m, setM] = useState({ views: h.views ?? "", replies: h.replies ?? "", dms: h.dms ?? "" });
  if (editando) return <div className="p-3"><FormaHistoria semana={semanaVista} historia={h} recursos={recursos} piezas={piezas} onListo={() => setEditando(false)} /></div>;
  const puedePublicar = a.puedeActuar && (h.estado === "aprobada" || h.estado === "programada");
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TipoHistoria tipo={h.tipo} />
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 items-center rounded-full border px-2 text-[11px] text-muted-foreground" title={NOMBRE_REGISTRO[h.registro]}>{h.registro}</span>
            <Estado estado={h.estado} />
            <IconosOwner h={h} a={a} onEditar={() => setEditando(true)} />
          </span>
        </div>
        {h.copy ? <p className="whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2.5 text-sm leading-relaxed">{h.copy}</p> : <p className="text-sm text-muted-foreground">Sin copy.</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><Meta h={h} /></div>
        <div className="flex flex-wrap items-center gap-1.5">
          {h.copy && <Button size="sm" variant="outline" onClick={a.copiar}><Copy className="size-3.5" /> Copiar copy</Button>}
          {h.asset_url && <Button size="sm" variant="outline" disabled={a.pendiente} onClick={a.descargar}><Download className="size-3.5" /> Asset</Button>}
          {puedePublicar && h.estado === "aprobada" && <><Input type="datetime-local" className="h-8 w-auto text-xs" value={hora} onChange={(e) => setHora(e.target.value)} /><Button size="sm" variant="outline" disabled={a.pendiente || !hora} onClick={() => a.programar(hora)}>Programada</Button></>}
          {puedePublicar && <Button size="sm" disabled={a.pendiente} onClick={a.publicar}>Publicada</Button>}
          {h.estado === "publicada" && h.views == null && <span className="text-xs text-muted-foreground">mañana: views · replies · DMs</span>}
        </div>
        {a.puedeActuar && h.estado === "publicada" && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-2.5">
            {(["views", "replies", "dms"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{k}<Input type="number" inputMode="numeric" min={0} className="h-8 w-24 text-xs" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></label>
            ))}
            <Button size="sm" variant="outline" disabled={a.pendiente} onClick={() => a.guardarMetricas(m)}>Guardar</Button>
            <span className="text-[11px] text-muted-foreground">de los insights nativos, con tu nombre</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {h.registro === "organico"
          ? <div className="flex h-28 items-center justify-center rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Orgánico · sin asset que producir</div>
          : h.asset_url
            ? <button type="button" onClick={a.descargar} className="flex h-28 items-center justify-center rounded-lg bg-foreground p-3 text-center text-xs font-medium text-background hover:bg-foreground/90">{h.asset_url.split("/").pop()}</button>
            : (
              <div className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                Falta el asset producido
                {a.puedeActuar && h.estado !== "propuesta" && <><input ref={a.input} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => a.subirAsset(e.target.files)} /><Button size="sm" variant="outline" disabled={a.subiendo} onClick={() => a.input.current?.click()}><Upload className="size-3.5" /> {a.subiendo ? "Subiendo…" : "Subir asset"}</Button></>}
                {h.estado === "propuesta" && <span>Mariela lo sube al aprobarse</span>}
              </div>
            )}
      </div>
    </div>
  );
}

/** Una fila por historia: tipo · copy · qué le falta · estado · acciones. Para los días que no son hoy y para el buffer. */
export function FilaHistoria({ historia: h, rol, recursos = [], piezas = [], semanaVista }: Props) {
  const a = useHistoria(h, rol);
  const [editando, setEditando] = useState(false);
  if (editando) return <div className="p-3"><FormaHistoria semana={semanaVista} historia={h} recursos={recursos} piezas={piezas} onListo={() => setEditando(false)} /></div>;
  const enBuffer = !h.semana;
  const puedePublicar = a.puedeActuar && !enBuffer && (h.estado === "aprobada" || h.estado === "programada");
  return (
    <div className="grid items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-[13px] md:grid-cols-[150px_minmax(0,1fr)_200px_100px_auto]">
      <TipoHistoria tipo={h.tipo} />
      <span className="min-w-0 truncate" title={h.copy ?? ""}>{h.copy || <span className="text-muted-foreground">Sin copy</span>}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 truncate text-xs text-muted-foreground">
        <span>{h.registro}</span>
        {h.registro === "producido" && (h.asset_url ? <span>asset listo</span> : <span className="font-semibold text-ambar">falta el asset</span>)}
        {h.keyword && <span className="font-mono font-semibold text-foreground">{h.keyword}</span>}
        {h.pieza && <span>amplifica {h.pieza.id_publico}</span>}
      </span>
      <Estado estado={h.estado} />
      <span className="flex items-center justify-end gap-1.5">
        {enBuffer && a.esOwner && <AgendarHistoria id={h.id} semana={semanaVista} />}
        {h.copy && !enBuffer && <Button size="sm" variant="outline" className="h-7" onClick={a.copiar}><Copy className="size-3.5" /> Copiar copy</Button>}
        {h.asset_url && !enBuffer && <Button size="sm" variant="ghost" className="h-7" disabled={a.pendiente} onClick={a.descargar} aria-label="Descargar asset"><Download className="size-3.5" /></Button>}
        {puedePublicar && <Button size="sm" variant="outline" className="h-7" disabled={a.pendiente} onClick={a.publicar}>Publicada</Button>}
        <IconosOwner h={h} a={a} onEditar={() => setEditando(true)} />
      </span>
    </div>
  );
}
