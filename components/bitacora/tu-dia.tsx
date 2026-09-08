"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { borrarDeclaracion, declarar } from "@/lib/acciones/bitacora";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type Declaracion = { id: string; texto: string; minutos: number | null; evidencia_url: string | null; created_at: string; pieza: { id: string; id_publico: string; titulo: string | null } | null };
type PiezaOpcion = { id: string; id_publico: string; titulo: string | null };

export function TuDia({ userId, hoy, declaraciones, piezas }: { userId: string; hoy: string; declaraciones: Declaracion[]; piezas: PiezaOpcion[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const [pieza, setPieza] = useState("");
  const [minutos, setMinutos] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const vacio = declaraciones.length === 0;

  function enviar() {
    if (!texto.trim()) return;
    iniciar(async () => {
      let evidencia_url: string | null = null;
      if (archivo) {
        const supabase = crearClienteNavegador();
        const nombre = archivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
        const ruta = pieza ? `piezas/${pieza}/final/${nombre}` : `bitacora/${userId}/${hoy}/${nombre}`;
        const { error } = await supabase.storage.from("assets").upload(ruta, archivo, { upsert: true });
        if (error) { toast.error(`No se subió ${archivo.name}: ${error.message}`); return; }
        evidencia_url = ruta;
      }
      const r = await declarar({ texto, pieza_id: pieza || null, minutos: minutos ? Number(minutos) : null, evidencia_url });
      if (!r.ok) { toast.error(r.mensaje); return; }
      setTexto(""); setMinutos(""); setArchivo(null);
      if (input.current) input.current.value = "";
      toast.success(r.mensaje);
      router.refresh();
    });
  }

  function borrar(id: string) {
    iniciar(async () => {
      const r = await borrarDeclaracion(id);
      if (!r.ok) toast.error(r.mensaje);
    });
  }

  return (
    <section className={cn("space-y-3 rounded-xl border p-4", vacio ? "border-ambar/60 bg-ambar/5" : "")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Tu día · {fechaCorta(hoy)}</h2>
        <p className={cn("text-xs", vacio ? "font-semibold text-ambar" : "text-muted-foreground")}>
          {vacio ? "Todavía no declaras en qué trabajaste hoy." : `${declaraciones.length} ${declaraciones.length === 1 ? "entrada" : "entradas"}`}
        </p>
      </div>

      {declaraciones.length > 0 && (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {declaraciones.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap">{d.texto}</p>
                <p className="text-xs text-muted-foreground">
                  {d.pieza && <span className="font-mono">{d.pieza.id_publico}</span>}
                  {d.pieza?.titulo && <span> · {d.pieza.titulo}</span>}
                  {d.minutos ? <span> · {d.minutos} min</span> : null}
                  {d.evidencia_url && <span> · <Paperclip className="inline size-3" /> archivo</span>}
                </p>
              </div>
              <button type="button" onClick={() => borrar(d.id)} disabled={pendiente} className="shrink-0 rounded p-1 text-muted-foreground hover:text-rojo" aria-label="Borrar">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿En qué trabajaste? Ej.: edité el reel DEMO-01, faltó la portada; diseñé 3 slides del carrusel…"
          className="bg-background"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 max-w-[16rem] rounded-md border border-input bg-background px-2 text-sm" value={pieza} onChange={(e) => setPieza(e.target.value)}>
            <option value="">Sin pieza específica</option>
            {piezas.map((p) => <option key={p.id} value={p.id}>{p.id_publico} · {p.titulo ?? ""}</option>)}
          </select>
          <Input type="number" inputMode="numeric" min={0} placeholder="min" className="h-9 w-20" value={minutos} onChange={(e) => setMinutos(e.target.value)} />
          <input ref={input} type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => input.current?.click()}>
            <Paperclip className="size-4" /> {archivo ? archivo.name.slice(0, 24) : "Adjuntar"}
          </Button>
          <Button size="sm" className="h-9 ml-auto" disabled={pendiente || !texto.trim()} onClick={enviar}>
            {pendiente ? "Guardando…" : "Declarar"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Si eliges pieza, el archivo se guarda en sus assets como export final. Lo de hoy se puede corregir; lo de ayer queda como se declaró.</p>
      </div>
    </section>
  );
}
