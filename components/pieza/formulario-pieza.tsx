"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { crearPieza, asignarTarea } from "@/lib/acciones/nodo";
import { FORMATOS, NOMBRE_FORMATO } from "@/lib/dominio/estados";
import { sumarDias } from "@/lib/dominio/tiempo";

type Props = {
  comunidades: { id: string; nombre: string }[];
  cards: { id: string; codigo: string; nombre: string }[];
  perfiles: { user_id: string; nombre: string; rol: string }[];
  inicial: { formato: string; id_publico: string; semana: string; idea?: { id: string; titulo: string; notas: string | null; etapa_embudo: string | null } | null };
};

const CAMPOS = ["multiplicador", "views", "saves", "follows", "suscriptores", "leads", "retencion_3s", "dms"];
const ETAPAS = [
  { v: "atraer", t: "Atraer · alcance en no seguidores" },
  { v: "capturar", t: "Capturar · convertir atención en dato" },
  { v: "convertir", t: "Convertir · vender" },
];

export function FormularioPieza({ comunidades, cards, perfiles, inicial }: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const editor = perfiles.find((p) => p.rol === "editor");
  const [f, setF] = useState({
    id_publico: inicial.id_publico,
    comunidad_id: comunidades[0]?.id ?? "",
    formato: inicial.formato,
    format_card: inicial.formato === "yap" ? cards.find((c) => c.codigo === "FC-08")?.codigo ?? "" : "",
    titulo: inicial.idea?.titulo ?? "", serie: "", etapa_embudo: inicial.idea?.etapa_embudo ?? "atraer", cta: "",
    fecha_objetivo: sumarDias(inicial.semana, 4),
    responsable_id: "", estado: "para_producir", programa_aprobado: false,
    guion: inicial.idea?.notas ? `> ${inicial.idea.notas}\n\n` : "", spec_visual: "",
    h_texto: "", h_campo: "multiplicador", h_numero: "3", h_fecha: sumarDias(inicial.semana, 28),
    tarea_tipo: inicial.formato === "carrusel" ? "diseñar" : "grabar",
    tarea_para: inicial.formato === "carrusel" ? (editor?.user_id ?? "") : (perfiles.find((p) => p.rol === "owner")?.user_id ?? ""),
    tarea_vence: sumarDias(inicial.semana, 2),
    crear_tarea: true,
  });
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  function enviar() {
    iniciar(async () => {
      const r = await crearPieza({
        idea_id: inicial.idea?.id ?? null,
        id_publico: f.id_publico.trim().toUpperCase(),
        comunidad_id: f.comunidad_id, formato: f.formato, etapa_embudo: f.etapa_embudo,
        format_card: f.format_card || null, titulo: f.titulo || null, serie: f.serie || null, cta: f.cta || null,
        guion: f.guion || null, spec_visual: f.spec_visual || null,
        fecha_objetivo: f.fecha_objetivo || null, responsable_id: f.responsable_id || null,
        estado: f.estado, programa_aprobado: f.programa_aprobado,
        hipotesis: { texto: f.h_texto, campo: f.h_campo, numero: Number(f.h_numero), fecha: f.h_fecha },
      });
      if (!r.ok) { toast.error(r.mensaje); return; }
      if (f.crear_tarea && r.id && f.tarea_para) {
        const t = await asignarTarea({ pieza_id: r.id, tipo: f.tarea_tipo, asignado_a: f.tarea_para, vence: f.tarea_vence });
        if (!t.ok) toast.error(`Pieza creada, pero la tarea no: ${t.mensaje}`);
      }
      toast.success(r.mensaje);
      router.push(`/piezas/${r.id}`);
    });
  }

  const hipotesisLinea = `Si ${f.h_texto || "[cambio observable]"}, entonces ${f.h_campo} llegará a ${f.h_numero || "?"} al ${f.h_fecha || "?"}.`;

  return (
    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
      <Grupo titulo="Identidad">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo id="id_publico" label="ID público">
            <Input id="id_publico" value={f.id_publico} onChange={(e) => set("id_publico", e.target.value)} className="font-mono uppercase" required />
          </Campo>
          <Campo id="formato" label="Formato">
            <select id="formato" className={sel} value={f.formato} onChange={(e) => set("formato", e.target.value)}>
              {FORMATOS.map((x) => <option key={x} value={x}>{NOMBRE_FORMATO[x]}</option>)}
            </select>
          </Campo>
          <Campo id="comunidad" label="Comunidad">
            <select id="comunidad" className={sel} value={f.comunidad_id} onChange={(e) => set("comunidad_id", e.target.value)}>
              {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="titulo" label="Título de trabajo"><Input id="titulo" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></Campo>
          <Campo id="serie" label="Serie"><Input id="serie" value={f.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Criterio · Verdades Incómodas · Róbate" /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="fc" label="Format Card">
            <select id="fc" className={sel} value={f.format_card} onChange={(e) => set("format_card", e.target.value)}>
              <option value="">Sin card</option>
              {cards.map((c) => <option key={c.id} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="etapa" label="Etapa del embudo">
            <select id="etapa" className={sel} value={f.etapa_embudo} onChange={(e) => set("etapa_embudo", e.target.value)}>
              {ETAPAS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
            </select>
          </Campo>
        </div>
        <Campo id="cta" label="CTA"><Input id="cta" value={f.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Sin CTA (cierre aforismo) · Guárdalo · Responde RORY" /></Campo>
      </Grupo>

      <Grupo titulo="Hipótesis (obligatoria y resoluble)">
        <Campo id="h_texto" label="Si…"><Input id="h_texto" value={f.h_texto} onChange={(e) => set("h_texto", e.target.value)} placeholder="abro con la postura completa en los primeros 5 s" required /></Campo>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo id="h_campo" label="entonces el campo">
            <select id="h_campo" className={sel} value={f.h_campo} onChange={(e) => set("h_campo", e.target.value)}>
              {CAMPOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo id="h_numero" label="llegará a"><Input id="h_numero" type="number" step="any" value={f.h_numero} onChange={(e) => set("h_numero", e.target.value)} required /></Campo>
          <Campo id="h_fecha" label="al"><Input id="h_fecha" type="date" value={f.h_fecha} onChange={(e) => set("h_fecha", e.target.value)} required /></Campo>
        </div>
        <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">{hipotesisLinea}</p>
      </Grupo>

      <Grupo titulo="Producción">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo id="fecha_objetivo" label="Fecha objetivo"><Input id="fecha_objetivo" type="date" value={f.fecha_objetivo} onChange={(e) => set("fecha_objetivo", e.target.value)} /></Campo>
          <Campo id="responsable" label="Responsable">
            <select id="responsable" className={sel} value={f.responsable_id} onChange={(e) => set("responsable_id", e.target.value)}>
              <option value="">Sin asignar</option>
              {perfiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="estado" label="Estado inicial">
            <select id="estado" className={sel} value={f.estado} onChange={(e) => set("estado", e.target.value)}>
              <option value="para_producir">Para producir</option>
              <option value="para_grabar">Para grabar (guion listo)</option>
              <option value="edicion">Edición (ya grabado)</option>
            </select>
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={f.programa_aprobado} onCheckedChange={(v) => set("programa_aprobado", !!v)} />
          Programa aprobado (no cuenta hacia el tope de 10; por ejemplo el reto CRI)
        </label>
        <Campo id="guion" label="Guion (markdown)"><Textarea id="guion" rows={6} value={f.guion} onChange={(e) => set("guion", e.target.value)} placeholder="## Beats…" /></Campo>
        <Campo id="spec" label="Spec visual (markdown)"><Textarea id="spec" rows={3} value={f.spec_visual} onChange={(e) => set("spec_visual", e.target.value)} placeholder="- Primer cuadro…" /></Campo>
      </Grupo>

      <Grupo titulo="Primera tarea">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={f.crear_tarea} onCheckedChange={(v) => set("crear_tarea", !!v)} />
          Crear la primera tarea al guardar
        </label>
        {f.crear_tarea && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo id="tarea_tipo" label="Tipo">
              <select id="tarea_tipo" className={sel} value={f.tarea_tipo} onChange={(e) => set("tarea_tipo", e.target.value)}>
                {["grabar", "editar", "diseñar", "publicar", "revisar"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo id="tarea_para" label="Para">
              <select id="tarea_para" className={sel} value={f.tarea_para} onChange={(e) => set("tarea_para", e.target.value)}>
                {perfiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.nombre}</option>)}
              </select>
            </Campo>
            <Campo id="tarea_vence" label="Vence"><Input id="tarea_vence" type="date" value={f.tarea_vence} onChange={(e) => set("tarea_vence", e.target.value)} /></Campo>
          </div>
        )}
      </Grupo>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pendiente}>{pendiente ? "Creando…" : "Crear pieza"}</Button>
      </div>
    </form>
  );
}

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Campo({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
