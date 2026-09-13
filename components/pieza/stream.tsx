"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CornerDownRight, Link2, MessageCircleQuestion, Mic, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { agregarAlStream } from "@/lib/acciones/redaccion";
import { cn } from "@/lib/utils";

export type Pensamiento = {
  id: string;
  tipo: string;
  texto: string | null;
  transcript: string | null;
  transcript_pulido: string | null;
  audio_url: string | null;
  duracion_s: number | null;
  ronda: number | null;
  responde_a: string | null;
  cuando: string;
};

/**
 * El stream de redacción de una pieza (docs/redaccion.md §4): lo que Nazho dijo, lo que Claude
 * preguntó y lo que Nazho respondió, en orden. Las preguntas sin respuesta traen su caja para
 * contestar ahí mismo, desde el teléfono. Abajo, texto o link nuevos.
 */
export function Stream({ piezaId, idPublico, items, puedeEscribir }: { piezaId: string; idPublico: string; items: Pensamiento[]; puedeEscribir: boolean }) {
  const respondidas = new Set(items.filter((x) => x.tipo === "respuesta" && x.responde_a).map((x) => x.responde_a as string));
  const porId = new Map(items.map((x) => [x.id, x]));
  const sinResponder = items.filter((x) => x.tipo === "pregunta" && !respondidas.has(x.id)).length;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          El stream está vacío. Escribe aquí lo que traes en la cabeza o pega un link. Para que Claude te haga preguntas, dile «entrevístame sobre {idPublico}».
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((x) => (
            <li key={x.id}>
              <Entrada item={x} pregunta={x.responde_a ? porId.get(x.responde_a) : undefined} />
              {x.tipo === "pregunta" && !respondidas.has(x.id) && puedeEscribir && <Responder piezaId={piezaId} preguntaId={x.id} />}
            </li>
          ))}
        </ol>
      )}
      {sinResponder > 0 && (
        <p className="text-xs font-semibold text-ambar">
          {sinResponder === 1 ? "Una pregunta espera tu respuesta." : `${sinResponder} preguntas esperan tu respuesta.`} Con eso Claude redacta.
        </p>
      )}
      {puedeEscribir && <Agregar piezaId={piezaId} />}
    </div>
  );
}

function Entrada({ item, pregunta }: { item: Pensamiento; pregunta?: Pensamiento }) {
  const cuerpo = item.tipo === "voz" ? (item.transcript_pulido ?? item.transcript ?? item.texto) : item.texto;
  const esClaude = item.tipo === "pregunta";
  const esRespuesta = item.tipo === "respuesta";
  const Icono = item.tipo === "voz" ? Mic : item.tipo === "link" ? Link2 : esClaude ? MessageCircleQuestion : esRespuesta ? CornerDownRight : Type;
  const etiqueta =
    item.tipo === "voz" ? `Nota de voz${item.duracion_s ? ` · ${duracion(item.duracion_s)}` : ""}${item.transcript || item.transcript_pulido ? "" : " · sin transcribir"}`
    : item.tipo === "link" ? "Link"
    : esClaude ? `Claude pregunta${item.ronda ? ` · ronda ${item.ronda} de 2` : ""}`
    : esRespuesta ? "Tu respuesta"
    : "Texto";

  return (
    <div className={cn("rounded-lg px-3 py-2 text-sm", esClaude ? "border border-primary/40 bg-primary/5" : esRespuesta ? "ml-4 bg-muted/60" : "bg-muted/60")}>
      <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Icono className="size-3.5" /> {etiqueta}</span>
        <span>· {item.cuando}</span>
      </p>
      {esRespuesta && pregunta?.texto && <p className="mb-1 truncate text-xs italic text-muted-foreground">«{pregunta.texto}»</p>}
      {item.tipo === "link" && cuerpo ? <Link texto={cuerpo} /> : <p className="whitespace-pre-wrap">{cuerpo ?? <span className="text-muted-foreground">(vacío)</span>}</p>}
      {item.tipo === "voz" && item.audio_url && (
        <audio controls preload="none" src={item.audio_url} className="mt-2 h-8 w-full max-w-md" />
      )}
    </div>
  );
}

function Link({ texto }: { texto: string }) {
  const [url, ...resto] = texto.split(/\s+/);
  return (
    <p className="break-words">
      <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">{url}</a>
      {resto.length > 0 && <span className="text-muted-foreground"> · {resto.join(" ")}</span>}
    </p>
  );
}

function Responder({ piezaId, preguntaId }: { piezaId: string; preguntaId: string }) {
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();
  function enviar() {
    iniciar(async () => {
      const r = await agregarAlStream(piezaId, { tipo: "respuesta", texto, responde_a: preguntaId });
      if (r.ok) setTexto(""); else toast.error(r.mensaje);
    });
  }
  return (
    <div className="ml-4 mt-1.5 flex flex-col gap-2 sm:flex-row">
      <Textarea
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(); } }}
        placeholder="Contesta como lo dirías en voz alta. Con caso, número y costo si los hay."
        disabled={pendiente}
      />
      <Button size="sm" className="sm:self-end" disabled={pendiente || !texto.trim()} onClick={enviar}>Responder</Button>
    </div>
  );
}

function Agregar({ piezaId }: { piezaId: string }) {
  const [tipo, setTipo] = useState<"texto" | "link">("texto");
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();
  function enviar() {
    iniciar(async () => {
      const r = await agregarAlStream(piezaId, { tipo, texto });
      if (r.ok) { setTexto(""); toast.success("En el stream."); } else toast.error(r.mensaje);
    });
  }
  const tab = (t: "texto" | "link", Icono: typeof Type, nombre: string) => (
    <button
      type="button"
      onClick={() => setTipo(t)}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition", tipo === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
    >
      <Icono className="size-3.5" /> {nombre}
    </button>
  );
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center gap-1">
        {tab("texto", Type, "Texto")}
        {tab("link", Link2, "Link")}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Mic className="size-3" /> voz: por Claude, por ahora</span>
      </div>
      <Textarea
        rows={tipo === "link" ? 2 : 4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(); } }}
        placeholder={tipo === "link" ? "https://… y una línea de por qué" : "Lo que traes en la cabeza, tal cual. Sin pulir."}
        disabled={pendiente}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">⌘Enter para guardar</span>
        <Button size="sm" disabled={pendiente || !texto.trim()} onClick={enviar}>Agregar al stream</Button>
      </div>
    </div>
  );
}

function duracion(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
