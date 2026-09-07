"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { urlFirmada } from "@/lib/acciones/piezas";

type Asset = { ruta: string; nombre: string; carpeta: string };
const CARPETAS = [
  { clave: "raw", etiqueta: "RAW" },
  { clave: "portada", etiqueta: "Portada" },
  { clave: "final", etiqueta: "Export final" },
];

export function Assets({ piezaId, assets, puedeSubir }: { piezaId: string; assets: Asset[]; puedeSubir: boolean }) {
  const router = useRouter();
  const [carpeta, setCarpeta] = useState("final");
  const [subiendo, setSubiendo] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true);
    const supabase = crearClienteNavegador();
    for (const f of Array.from(files)) {
      const nombre = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const { error } = await supabase.storage.from("assets").upload(`piezas/${piezaId}/${carpeta}/${nombre}`, f, { upsert: true });
      if (error) toast.error(`${f.name}: ${error.message}`);
      else toast.success(`${f.name} subido.`);
    }
    setSubiendo(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  function abrir(ruta: string) {
    iniciar(async () => {
      const u = await urlFirmada(ruta);
      if (u) window.open(u, "_blank", "noopener");
      else toast.error("No se pudo generar el enlace.");
    });
  }

  return (
    <div className="space-y-3">
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin archivos todavía.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {assets.map((a) => (
            <li key={a.ruta} className="flex items-center justify-between gap-2 p-2 text-sm">
              <span className="min-w-0 truncate">
                {a.carpeta && <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">{a.carpeta}</span>}
                {a.nombre}
              </span>
              <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => abrir(a.ruta)} aria-label="Descargar">
                <Download className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {puedeSubir && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {CARPETAS.map((c) => (
              <button
                key={c.clave}
                type="button"
                onClick={() => setCarpeta(c.clave)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${carpeta === c.clave ? "border-secondary bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
          <Button size="sm" variant="outline" disabled={subiendo} onClick={() => input.current?.click()}>
            <Upload className="size-4" /> {subiendo ? "Subiendo…" : "Subir"}
          </Button>
        </div>
      )}
    </div>
  );
}
