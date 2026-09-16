"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { darAcceso, generarCodigo } from "@/lib/acciones/accesos";
import { NOMBRE_ROL, type Rol } from "@/lib/dominio/roles";
import { fechaHora } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type Acceso = { email: string; nombre: string; rol: string; tiene_usuario: boolean; ultimo_acceso: string | null };

/** La lista blanca con el estado de cada persona y el botón que genera su código (se muestra una sola vez). */
export function ListaAccesos({ accesos, yo }: { accesos: Acceso[]; yo: string }) {
  const [nuevo, setNuevo] = useState(false);
  return (
    <div className="space-y-4">
      {nuevo ? <FormaAcceso onListo={() => setNuevo(false)} /> : <Button size="sm" variant="outline" onClick={() => setNuevo(true)}><Plus className="size-3.5" /> Dar acceso a alguien</Button>}
      <ul className="divide-y rounded-xl border">
        {accesos.map((a) => <Fila key={a.email} a={a} esYo={a.email === yo} />)}
      </ul>
    </div>
  );
}

function Fila({ a, esYo }: { a: Acceso; esYo: boolean }) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  function generar() {
    if (a.tiene_usuario && !confirm(`¿Generar un código nuevo para ${a.nombre}? El anterior deja de servir.`)) return;
    iniciar(async () => {
      const r = await generarCodigo(a.email);
      if (r.ok && r.codigo) { setCodigo(r.codigo); toast.success(r.mensaje); } else toast.error(r.mensaje);
    });
  }
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{a.nombre}{esYo && <span className="ml-2 text-xs font-medium text-muted-foreground">tú</span>}</p>
          <p className="text-xs text-muted-foreground">{a.email} · {NOMBRE_ROL[a.rol as Rol] ?? a.rol} · {a.tiene_usuario ? (a.ultimo_acceso ? `entró ${fechaHora(a.ultimo_acceso)}` : "con código, no ha entrado") : "sin código todavía"}</p>
        </div>
        <Button size="sm" variant={a.tiene_usuario ? "outline" : "default"} disabled={pendiente} onClick={generar}><KeyRound className="size-3.5" /> {a.tiene_usuario ? "Código nuevo" : "Generar código"}</Button>
      </div>
      {codigo && (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3")}>
          <div>
            <p className="font-mono text-2xl font-bold tracking-[0.2em]">{codigo}</p>
            <p className="text-xs text-muted-foreground">Pásaselo en persona. No se vuelve a mostrar; si se pierde, genera otro.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(codigo).then(() => toast.success("Código copiado."))}><Copy className="size-3.5" /> Copiar</Button>
        </div>
      )}
    </li>
  );
}

function FormaAcceso({ onListo }: { onListo: () => void }) {
  const [c, setC] = useState({ email: "", nombre: "", rol: "editor" });
  const [pendiente, iniciar] = useTransition();
  const campo = "flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={campo}>Nombre<Input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} className="h-8 text-sm" autoFocus /></label>
        <label className={campo}>Correo<Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className="h-8 text-sm" /></label>
        <label className={campo}>Rol<select value={c.rol} onChange={(e) => setC({ ...c, rol: e.target.value })} className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"><option value="editor">Editora</option><option value="viewer">Lectura</option><option value="owner">Dueño</option></select></label>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pendiente} onClick={onListo}>Cancelar</Button>
        <Button size="sm" disabled={pendiente || !c.email || !c.nombre} onClick={() => iniciar(async () => { const r = await darAcceso(c); if (r.ok) { toast.success(r.mensaje); onListo(); } else toast.error(r.mensaje); })}>Dar acceso</Button>
      </div>
    </div>
  );
}
