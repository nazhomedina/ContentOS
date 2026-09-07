"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarMagicLink, type EstadoLogin } from "./acciones";

export function FormularioLogin({ volver }: { volver: string }) {
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
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? "Enviando…" : "Mandarme el enlace"}
      </Button>
    </form>
  );
}
