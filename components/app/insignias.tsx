import { Badge } from "@/components/ui/badge";
import { NOMBRE_ESTADO, NOMBRE_FORMATO, NOMBRE_TAREA, type EstadoPieza, type Formato, type TipoTarea } from "@/lib/dominio/estados";
import { CLASE_SEMAFORO, semaforoBuffer } from "@/lib/dominio/buffer";
import { cn } from "@/lib/utils";

export function InsigniaEstado({ estado }: { estado: string }) {
  const nombre = NOMBRE_ESTADO[estado as EstadoPieza] ?? estado;
  const clase =
    estado === "publicada" ? "bg-ok/10 text-ok border-ok/30"
    : estado === "buffer" || estado === "programada" ? "bg-primary/10 text-primary border-primary/30"
    : estado === "archivada" ? "bg-muted text-muted-foreground"
    : "";
  return <Badge variant="outline" className={cn("font-medium", clase)}>{nombre}</Badge>;
}

export function InsigniaFormato({ formato }: { formato: string }) {
  return <Badge variant="secondary" className="font-medium">{NOMBRE_FORMATO[formato as Formato] ?? formato}</Badge>;
}

export function InsigniaTarea({ tipo }: { tipo: string }) {
  return <Badge variant="outline">{NOMBRE_TAREA[tipo as TipoTarea] ?? tipo}</Badge>;
}

export function ChipBuffer({ n }: { n: number }) {
  const s = semaforoBuffer(n);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", CLASE_SEMAFORO[s])}>
      buffer {n}
    </span>
  );
}

export function IdPublico({ id }: { id: string }) {
  return <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground">{id}</span>;
}
