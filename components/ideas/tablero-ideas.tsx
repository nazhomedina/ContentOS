"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { crearIdea, moverIdea } from "@/lib/acciones/ideas";
import { TOPE_SHORTLIST } from "@/lib/dominio/buffer";
import { cn } from "@/lib/utils";

export type IdeaCard = {
  id: string; titulo: string; origen: string | null; estado: string; etapa_embudo: string | null; notas: string | null;
  comunidad_id: string; formato_sugerido: string[]; notion_url: string | null; created_at: string;
  pensamientos: { count: number }[] | null;
};

const COLUMNAS = [
  { clave: "nueva", nombre: "Nuevas" },
  { clave: "shortlist", nombre: `Shortlist · tope ${TOPE_SHORTLIST}` },
  { clave: "convertida", nombre: "Convertidas" },
  { clave: "descartada", nombre: "Descartadas" },
];

const ORIGEN: Record<string, string> = {
  radar: "radar", voz: "voz", destilado: "destilado", markie: "Markie", coyuntura: "coyuntura", audiencia: "audiencia",
  claude: "Claude", legado: "banco Notion", nazho: "Nazho",
};

export function TableroIdeas({ ideas, comunidades, comunidadActiva }: { ideas: IdeaCard[]; comunidades: { id: string; nombre: string }[]; comunidadActiva: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [sel, setSel] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");
  const [notas, setNotas] = useState("");
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false);

  const porEstado = useMemo(() => {
    const m: Record<string, IdeaCard[]> = { nueva: [], shortlist: [], convertida: [], descartada: [] };
    for (const i of ideas) (m[i.estado] ??= []).push(i);
    return m;
  }, [ideas]);

  function mover(id: string, estado: string) {
    iniciar(async () => {
      const r = await moverIdea(id, estado);
      if (!r.ok) toast.error(r.mensaje);
    });
  }
  function capturar() {
    if (!nueva.trim()) return;
    iniciar(async () => {
      const r = await crearIdea({ titulo: nueva, comunidad_id: comunidadActiva, notas });
      if (r.ok) { setNueva(""); setNotas(""); toast.success(r.mensaje); } else toast.error(r.mensaje);
    });
  }

  // Atajos: S shortlist · D descartar · C convertir · N nueva idea. Con una tarjeta seleccionada.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key.toLowerCase() === "n") { e.preventDefault(); document.getElementById("nueva-idea")?.focus(); return; }
      if (!sel) return;
      const idea = ideas.find((i) => i.id === sel);
      if (!idea) return;
      if (e.key.toLowerCase() === "s") mover(sel, "shortlist");
      if (e.key.toLowerCase() === "d") mover(sel, "descartada");
      if (e.key.toLowerCase() === "c") router.push(`/piezas/nueva?idea=${sel}&formato=${primerFormato(idea)}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, ideas]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            {porEstado.nueva.length} nuevas · <span className={cn(porEstado.shortlist.length >= TOPE_SHORTLIST && "text-rojo")}>{porEstado.shortlist.length}/{TOPE_SHORTLIST} en shortlist</span> · atajos: <kbd>S</kbd> shortlist · <kbd>D</kbd> descartar · <kbd>C</kbd> convertir · <kbd>N</kbd> nueva
          </p>
        </div>
        {comunidades.length > 1 && (
          <div className="flex gap-1">
            {comunidades.map((c) => (
              <Link key={c.id} href={`/ideas?comunidad=${c.id}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", c.id === comunidadActiva && "border-foreground bg-foreground text-background")}>{c.nombre}</Link>
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Input id="nueva-idea" placeholder="Nueva idea… (N)" value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && capturar()} />
          {nueva && <Textarea rows={2} placeholder="Tensión o ángulo (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />}
        </div>
        <Button disabled={pendiente || !nueva.trim()} onClick={capturar}><Plus className="size-4" /> Capturar</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNAS.filter((c) => c.clave !== "descartada").map((c) => (
          <section key={c.clave} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.nombre} · {porEstado[c.clave].length}</h2>
            <ul className="space-y-2">
              {porEstado[c.clave].map((i) => (
                <Tarjeta key={i.id} idea={i} seleccionada={sel === i.id} onSelect={() => setSel(i.id)} onMover={mover} pendiente={pendiente} />
              ))}
              {porEstado[c.clave].length === 0 && <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Vacío.</li>}
            </ul>
          </section>
        ))}
      </div>

      <section className="space-y-2">
        <button type="button" className="text-xs font-bold uppercase tracking-wider text-muted-foreground underline-offset-2 hover:underline" onClick={() => setMostrarDescartadas((v) => !v)}>
          Descartadas · {porEstado.descartada.length} {mostrarDescartadas ? "▲" : "▼"}
        </button>
        {mostrarDescartadas && (
          <ul className="grid gap-2 lg:grid-cols-3">
            {porEstado.descartada.map((i) => <Tarjeta key={i.id} idea={i} seleccionada={sel === i.id} onSelect={() => setSel(i.id)} onMover={mover} pendiente={pendiente} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function primerFormato(i: IdeaCard) {
  const f = (i.formato_sugerido?.[0] ?? "reel").toLowerCase();
  return ["reel", "carrusel", "historia", "newsletter", "youtube"].includes(f) ? f : "reel";
}

function Tarjeta({ idea: i, seleccionada, onSelect, onMover, pendiente }: { idea: IdeaCard; seleccionada: boolean; onSelect: () => void; onMover: (id: string, e: string) => void; pendiente: boolean }) {
  const n = i.pensamientos?.[0]?.count ?? 0;
  return (
    <li
      onClick={onSelect}
      className={cn("space-y-2 rounded-lg border bg-card p-3 text-sm transition", seleccionada ? "border-primary ring-1 ring-primary" : "hover:bg-muted/40")}
    >
      <p className="font-semibold leading-snug">{i.titulo}</p>
      {i.notas && <p className="line-clamp-3 text-xs text-muted-foreground">{i.notas}</p>}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {i.origen && <Badge variant="outline" className="text-[10px]">{ORIGEN[i.origen] ?? i.origen}</Badge>}
        {i.formato_sugerido?.map((f) => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
        {i.etapa_embudo && <span>· {i.etapa_embudo}</span>}
        {n > 0 && <span>· {n} pensamientos</span>}
        {i.notion_url && <a href={i.notion_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground" onClick={(e) => e.stopPropagation()}><ExternalLink className="size-3" /> Notion</a>}
      </div>
      {i.estado !== "convertida" && (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          {i.estado !== "shortlist" && <Button size="sm" variant="outline" disabled={pendiente} onClick={() => onMover(i.id, "shortlist")}>Shortlist</Button>}
          {i.estado === "shortlist" && <Button size="sm" variant="outline" disabled={pendiente} onClick={() => onMover(i.id, "nueva")}>Regresar</Button>}
          <Link href={`/piezas/nueva?idea=${i.id}&formato=${primerFormato(i)}`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">Convertir</Link>
          {i.estado !== "descartada" && <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => onMover(i.id, "descartada")}>Descartar</Button>}
        </div>
      )}
    </li>
  );
}
