"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { guardarPortada } from "@/lib/acciones/formatos";
import { cn } from "@/lib/utils";

/** La portada del formato: un frame de la referencia o de una pieza propia. Se sube a assets/formatos/{id}/. */
export function PortadaFormato({ formatoId, codigo, url, puedeEditar, alta = false }: { formatoId: string; codigo: string; url: string | null; puedeEditar: boolean; alta?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setSubiendo(true);
    const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const ruta = `formatos/${formatoId}/portada-${Date.now()}.${ext}`;
    const supabase = crearClienteNavegador();
    const { error } = await supabase.storage.from("assets").upload(ruta, f, { upsert: true });
    if (error) { toast.error(error.message); setSubiendo(false); return; }
    const r = await guardarPortada(formatoId, ruta);
    if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    setSubiendo(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }
  async function quitar() {
    const r = await guardarPortada(formatoId, null);
    if (r.ok) toast.success(r.mensaje); else toast.error(r.mensaje);
    router.refresh();
  }

  return (
    <div className={cn("group relative flex flex-col justify-end overflow-hidden rounded-xl bg-foreground p-3.5 text-background", alta ? "h-52" : "h-40")}>
      {url && <img src={url} alt="" className="absolute inset-0 size-full object-cover" />}
      <span className="relative font-mono text-xs tracking-widest opacity-80">{codigo}{!url && " · sin portada"}</span>
      {puedeEditar && (
        <span className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files)} />
          <Button size="sm" variant="outline" className="h-7 bg-background/90 text-foreground" disabled={subiendo} onClick={() => input.current?.click()}><ImageUp className="size-3.5" /> {subiendo ? "Subiendo…" : url ? "Cambiar" : "Portada"}</Button>
          {url && <Button size="sm" variant="outline" className="h-7 w-7 bg-background/90 px-0 text-foreground" onClick={quitar} aria-label="Quitar portada"><X className="size-3.5" /></Button>}
        </span>
      )}
    </div>
  );
}
