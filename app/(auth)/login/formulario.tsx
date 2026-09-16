"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrarConCodigo, enviarMagicLink, type EstadoLogin } from "./acciones";

export function FormularioLogin({ volver }: { volver: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(entrarConCodigo, null);
  const [porCorreo, setPorCorreo] = useState(false);

  if (porCorreo) return <FormularioEnlace volver={volver} onVolver={() => setPorCorreo(false)} />;

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="volver" value={volver} />
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="username" required autoFocus placeholder="tu@correo.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="codigo">Código</Label>
        <Input id="codigo" name="codigo" type="password" autoComplete="current-password" required placeholder="XXXX-XXXX" className="font-mono uppercase tracking-widest" />
      </div>
      {estado && !estado.ok && <p className="text-sm text-rojo">{estado.mensaje}</p>}
      <Button type="submit" className="w-full" disabled={pendiente}>{pendiente ? "Entrando…" : "Entrar"}</Button>
      <button type="button" onClick={() => setPorCorreo(true)} className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline">¿Sin código? Recibir un enlace por correo</button>
    </form>
  );
}

function FormularioEnlace({ volver, onVolver }: { volver: string; onVolver: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(enviarMagicLink, null);
  if (estado?.ok) {
    return (
      <div className="rounded-md border border-ok/40 bg-ok/5 px-4 py-3 text-sm">
        <p className="font-semibold">Revisa tu correo.</p>
        <p className="text-muted-foreground">{estado.mensaje}</p>
      </div>
    );
  }
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="volver" value={volver} />
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required autoFocus placeholder="tu@correo.com" />
      </div>
      {estado && !estado.ok && <p className="text-sm text-rojo">{estado.mensaje}</p>}
      <Button type="submit" variant="outline" className="w-full" disabled={pendiente}>{pendiente ? "Enviando…" : "Mandarme el enlace"}</Button>
      <button type="button" onClick={onVolver} className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline">Volver a entrar con código</button>
    </form>
  );
}
