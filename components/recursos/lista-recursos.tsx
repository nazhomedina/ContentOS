"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { anotarLeads, guardarRecurso } from "@/lib/acciones/recursos";
import { NOMBRE_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { DOMINIO_GO, ESTADOS_RECURSO, NOMBRE_ESTADO_RECURSO, NOMBRE_TIPO_RECURSO, TIPOS_RECURSO, urlGo, type EstadoRecurso, type TipoRecurso } from "@/lib/dominio/recursos";
import { fechaCorta, hoyISO } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type HistoriaLigada = { id: string; semana: string | null; dia: number | null; tipo: string; estado: string; views: number | null; replies: number | null; dms: number | null };
export type RecursoFila = {
  id: string; nombre: string; slug_go: string | null; keyword: string | null; kit_tag_id: string | null; estado: string; tipo: string | null; descripcion: string | null;
  leads: number | null; leads_actualizado_en: string | null; leads_fuente: string | null; leads_por_nombre: string | null;
  resumen: { historias: number; publicadas: number; views: number; replies: number; dms: number; ultima_semana: string | null };
  historias: HistoriaLigada[];
};

const TONO_ESTADO: Record<string, string> = {
  publicado: "border-ok/40 text-ok", contado: "border-primary/40 text-primary", produccion: "border-ambar/50 text-ambar", idea: "text-muted-foreground", retirado: "text-muted-foreground",
};

/** Los lead magnets, uno por tarjeta: ficha, leads con fecha de corte y las historias que lo han empujado. */
export function ListaRecursos({ recursos, puedeEditar }: { recursos: RecursoFila[]; puedeEditar: boolean }) {
  const [nuevo, setNuevo] = useState(false);
  return (
    <div className="space-y-4">
      {puedeEditar && (nuevo ? <FormaRecurso onListo={() => setNuevo(false)} /> : <Button size="sm" variant="outline" onClick={() => setNuevo(true)}><Plus className="size-3.5" /> Nuevo lead magnet</Button>)}
      {recursos.length === 0
        ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin lead magnets todavía.</p>
        : <ul className="grid gap-3 xl:grid-cols-2">{recursos.map((r) => <Tarjeta key={r.id} r={r} puedeEditar={puedeEditar} />)}</ul>}
    </div>
  );
}

function Tarjeta({ r, puedeEditar }: { r: RecursoFila; puedeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [anotando, setAnotando] = useState(false);
  const apagado = r.estado === "retirado";
  const url = urlGo(r.slug_go);
  return (
    <li id={r.id} className={cn("scroll-mt-20 rounded-xl border p-4", apagado && "bg-muted/40")}>
      {editando ? <FormaRecurso recurso={r} onListo={() => setEditando(false)} /> : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h2 className={cn("font-semibold leading-snug", apagado && "text-muted-foreground line-through decoration-muted-foreground/50")}>{r.nombre}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {r.keyword && <span>keyword <span className="font-mono font-semibold text-foreground">{r.keyword}</span></span>}
                {url ? <a href={url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">{DOMINIO_GO}/{r.slug_go} <ExternalLink className="size-3" /></a> : <span>sin liga en Go</span>}
                {r.kit_tag_id && <span>tag Kit <span className="font-mono">{r.kit_tag_id}</span></span>}
                {r.tipo && <span>{NOMBRE_TIPO_RECURSO[r.tipo as TipoRecurso] ?? r.tipo}</span>}
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", TONO_ESTADO[r.estado])}>{NOMBRE_ESTADO_RECURSO[r.estado as EstadoRecurso] ?? r.estado}</span>
          </div>
          {r.descripcion && <p className="text-sm text-muted-foreground">{r.descripcion}</p>}

          <dl className="grid grid-cols-3 gap-3 border-t pt-3 text-xs">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Leads</dt>
              <dd className="text-lg font-bold tabular-nums">{r.leads ?? <span className="text-sm font-medium text-muted-foreground">sin dato</span>}</dd>
              <dd className="text-muted-foreground">
                {r.leads_actualizado_en ? <>corte {fechaCorta(r.leads_actualizado_en.slice(0, 10))}{r.leads_fuente === "manual" && <> · a mano{r.leads_por_nombre && <> por {r.leads_por_nombre}</>}</>}{r.leads_fuente === "job" && <> · go_leads</>}</> : "nunca contados"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historias</dt>
              <dd className="text-lg font-bold tabular-nums">{r.resumen.historias}</dd>
              <dd className="text-muted-foreground">{r.resumen.publicadas} publicadas{r.resumen.ultima_semana && <> · última {fechaCorta(r.resumen.ultima_semana)}</>}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Views · replies · DMs</dt>
              <dd className="text-lg font-bold tabular-nums">{r.resumen.views.toLocaleString("es-MX")} <span className="text-sm font-medium text-muted-foreground">· {r.resumen.replies} · {r.resumen.dms}</span></dd>
              <dd className="text-muted-foreground">sumados de las publicadas</dd>
            </div>
          </dl>

          {r.historias.length > 0 && (
            <ul className="divide-y rounded-lg border text-xs">
              {r.historias.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <Link href={h.semana ? `/historias?semana=${h.semana}` : "/historias"} className="min-w-0 truncate hover:underline">{h.semana ? fechaCorta(h.semana) : "en el buffer"} · {NOMBRE_TIPO_HISTORIA[h.tipo] ?? h.tipo}</Link>
                  <span className="shrink-0 text-muted-foreground">{h.estado}{h.estado === "publicada" && h.views != null && <> · {h.views} views · {h.replies ?? 0} replies · {h.dms ?? 0} DMs</>}</span>
                </li>
              ))}
              {r.historias.length > 5 && <li className="px-2.5 py-1.5 text-muted-foreground">y {r.historias.length - 5} más</li>}
            </ul>
          )}

          {puedeEditar && (
            anotando ? <FormaLeads recurso={r} onListo={() => setAnotando(false)} /> : (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setAnotando(true)}>Anotar leads</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditando(true)}><Pencil className="size-3.5" /> Editar</Button>
              </div>
            )
          )}
        </div>
      )}
    </li>
  );
}

function FormaLeads({ recurso, onListo }: { recurso: RecursoFila; onListo: () => void }) {
  const [leads, setLeads] = useState(recurso.leads != null ? String(recurso.leads) : "");
  const [fecha, setFecha] = useState(hoyISO());
  const [pendiente, iniciar] = useTransition();
  function guardar() {
    iniciar(async () => {
      const r = await anotarLeads(recurso.id, Number(leads), fecha);
      if (r.ok) { toast.success(r.mensaje); onListo(); } else toast.error(r.mensaje);
    });
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
      <label className="space-y-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Leads en Go
        <Input type="number" inputMode="numeric" min={0} value={leads} onChange={(e) => setLeads(e.target.value)} className="h-8 w-28 text-sm" autoFocus />
      </label>
      <label className="space-y-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Fecha de corte
        <Input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="h-8 w-40 text-sm" />
      </label>
      <Button size="sm" variant="outline" disabled={pendiente} onClick={onListo}>Cancelar</Button>
      <Button size="sm" disabled={pendiente || leads === ""} onClick={guardar}>Guardar</Button>
    </div>
  );
}

function FormaRecurso({ recurso, onListo }: { recurso?: RecursoFila; onListo: () => void }) {
  const [c, setC] = useState({
    nombre: recurso?.nombre ?? "", slug_go: recurso?.slug_go ?? "", keyword: recurso?.keyword ?? "", kit_tag_id: recurso?.kit_tag_id ?? "",
    estado: recurso?.estado ?? "idea", tipo: recurso?.tipo ?? "", descripcion: recurso?.descripcion ?? "",
  });
  const [pendiente, iniciar] = useTransition();
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });
  function guardar() {
    iniciar(async () => {
      const r = await guardarRecurso(recurso?.id ?? null, c);
      if (r.ok) { toast.success(r.mensaje); onListo(); } else toast.error(r.mensaje);
    });
  }
  const campo = "space-y-0.5 text-[10px] font-semibold uppercase text-muted-foreground";
  const select = "h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case text-foreground";
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Input value={c.nombre} onChange={set("nombre")} placeholder="Nombre del recurso" className="h-8 text-sm font-semibold" autoFocus />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className={campo}>Keyword del DM<Input value={c.keyword} onChange={set("keyword")} placeholder="RORY" className="h-8 font-mono text-sm uppercase" /></label>
        <label className={campo}>Slug en {DOMINIO_GO}<Input value={c.slug_go} onChange={set("slug_go")} placeholder="rory-sutherland" className="h-8 font-mono text-sm" /></label>
        <label className={campo}>Tag de Kit<Input value={c.kit_tag_id} onChange={set("kit_tag_id")} placeholder="22364040" className="h-8 font-mono text-sm" /></label>
        <label className={campo}>Estado
          <select value={c.estado} onChange={set("estado")} className={select}>{ESTADOS_RECURSO.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO_RECURSO[e]}</option>)}</select>
        </label>
        <label className={campo}>Tipo
          <select value={c.tipo} onChange={set("tipo")} className={select}><option value="">Sin tipo</option>{TIPOS_RECURSO.map((t) => <option key={t} value={t}>{NOMBRE_TIPO_RECURSO[t]}</option>)}</select>
        </label>
      </div>
      <Textarea value={c.descripcion} onChange={set("descripcion")} rows={2} placeholder="De qué va, la fuente y el mockup de historia." />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pendiente} onClick={onListo}>Cancelar</Button>
        <Button size="sm" disabled={pendiente || !c.nombre.trim()} onClick={guardar}>{recurso ? "Guardar" : "Crear"}</Button>
      </div>
    </div>
  );
}
