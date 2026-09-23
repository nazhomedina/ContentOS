"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crearFormato } from "@/lib/acciones/formatos";
import { FACETAS } from "@/lib/dominio/formatos";

/** Un formato nuevo desde la galería: nombre, etiquetas y lo que se sepa; abre su ficha para seguir. */
export function NuevoFormato({ variante = "boton" }: { variante?: "boton" | "tarjeta" }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [c, setC] = useState({ nombre: "", etiquetas: [] as string[], serie_propia: "", duracion: "", origen: "" });
  const [pendiente, iniciar] = useTransition();
  const toggle = (e: string) => setC({ ...c, etiquetas: c.etiquetas.includes(e) ? c.etiquetas.filter((x) => x !== e) : [...c.etiquetas, e] });
  function crear() {
    iniciar(async () => {
      const r = await crearFormato(c);
      if (r.ok) { toast.success(r.mensaje); setAbierto(false); if (r.id) router.push(`/formatos/${r.id}`); } else toast.error(r.mensaje);
    });
  }
  if (!abierto) {
    return variante === "tarjeta"
      ? <button type="button" onClick={() => setAbierto(true)} className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground hover:bg-muted/40"><span className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground"><Plus className="size-3.5" /> Nuevo formato</span><span>Desde aquí o desde Cowork al analizar una cuenta: nombre, etiquetas, la primera referencia y su hipótesis.</span></button>
      : <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Plus className="size-3.5" /> Nuevo formato</Button>;
  }
  return (
    <div className={variante === "tarjeta" ? "col-span-full space-y-3 rounded-xl border bg-muted/30 p-4 text-sm" : "w-full space-y-3 rounded-xl border bg-muted/30 p-4 text-sm"}>
      <Input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} placeholder="Nombre del formato" className="h-8 text-sm font-semibold" autoFocus />
      <div className="space-y-1.5">
        {FACETAS.map((f) => (
          <div key={f.clave} className="flex flex-wrap items-center gap-1.5 text-xs"><span className="w-20 font-bold uppercase tracking-wider text-muted-foreground">{f.nombre}</span>{f.etiquetas.map((e) => <button key={e} type="button" onClick={() => toggle(e)} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${c.etiquetas.includes(e) ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>{e}</button>)}</div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={c.serie_propia} onChange={(e) => setC({ ...c, serie_propia: e.target.value })} placeholder="Serie propia (opcional)" className="h-8 text-sm" />
        <Input value={c.duracion} onChange={(e) => setC({ ...c, duracion: e.target.value })} placeholder="Duración · 30-45 s" className="h-8 text-sm" />
        <Input value={c.origen} onChange={(e) => setC({ ...c, origen: e.target.value })} placeholder="Origen · @cuenta" className="h-8 text-sm" />
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={pendiente} onClick={() => setAbierto(false)}>Cancelar</Button><Button size="sm" disabled={pendiente || !c.nombre.trim()} onClick={crear}>Crear</Button></div>
    </div>
  );
}
