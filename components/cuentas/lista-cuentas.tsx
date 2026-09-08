"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agregarCuenta, alternarCuenta } from "@/lib/acciones/cuentas";
import { fechaCorta } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type Cuenta = { id: string; handle: string; plataforma: string; nota: string | null; activa: boolean; ultimo_scrape: string | null; created_at: string };
const PLATAFORMAS = ["instagram", "tiktok", "youtube", "x", "linkedin", "newsletter"];
const URL_: Record<string, (h: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}/`, tiktok: (h) => `https://www.tiktok.com/@${h}`, youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`, linkedin: (h) => `https://www.linkedin.com/in/${h}/`, newsletter: (h) => h.startsWith("http") ? h : `https://${h}`,
};

export function ListaCuentas({ cuentas }: { cuentas: Cuenta[] }) {
  const [pendiente, iniciar] = useTransition();
  const [handle, setHandle] = useState("");
  const [plataforma, setPlataforma] = useState("instagram");
  const [nota, setNota] = useState("");

  function agregar() {
    iniciar(async () => {
      const r = await agregarCuenta({ handle, plataforma, nota });
      if (r.ok) { toast.success(r.mensaje); setHandle(""); setNota(""); } else toast.error(r.mensaje);
    });
  }

  const activas = cuentas.filter((c) => c.activa), inactivas = cuentas.filter((c) => !c.activa);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row">
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
          {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Input className="h-10" placeholder="@handle o URL" value={handle} onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Input className="h-10 sm:flex-1" placeholder="Por qué la sigues (formato, ángulo…)" value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Button className="h-10" disabled={pendiente || !handle.trim()} onClick={agregar}><Plus className="size-4" /> Seguir</Button>
      </div>

      <Grupo titulo={`En seguimiento · ${activas.length}`} cuentas={activas} pendiente={pendiente} iniciar={iniciar} />
      {inactivas.length > 0 && <Grupo titulo={`Pausadas · ${inactivas.length}`} cuentas={inactivas} pendiente={pendiente} iniciar={iniciar} tenue />}
    </div>
  );
}

function Grupo({ titulo, cuentas, pendiente, iniciar, tenue }: { titulo: string; cuentas: Cuenta[]; pendiente: boolean; iniciar: (f: () => Promise<void>) => void; tenue?: boolean }) {
  return (
    <section className={cn("space-y-2", tenue && "opacity-70")}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      {cuentas.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ninguna. Agrega las 13 de tu watchlist de format-lab.</p> : (
        <ul className="divide-y rounded-xl border text-sm">
          {cuentas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <a href={URL_[c.plataforma]?.(c.handle) ?? "#"} target="_blank" rel="noreferrer" className="font-semibold hover:underline">@{c.handle}</a>
                <span className="ml-2 text-xs text-muted-foreground">{c.plataforma}</span>
                {c.nota && <p className="text-xs text-muted-foreground">{c.nota}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{c.ultimo_scrape ? `radar ${fechaCorta(c.ultimo_scrape.slice(0, 10))}` : "sin radar todavía"}</span>
                <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => iniciar(async () => { const r = await alternarCuenta(c.id, !c.activa); if (!r.ok) toast.error(r.mensaje); })}>
                  {c.activa ? "Pausar" : "Reactivar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
