"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { comentar } from "@/lib/acciones/piezas";

type C = { id: string; texto: string; cuando: string; autor: string };

export function Comentarios({ piezaId, comentarios }: { piezaId: string; comentarios: C[] }) {
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();

  function enviar() {
    iniciar(async () => {
      const r = await comentar(piezaId, texto);
      if (r.ok) setTexto(""); else toast.error(r.mensaje);
    });
  }

  return (
    <div className="space-y-3">
      {comentarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nadie ha comentado. Si tienes una duda, escríbela aquí: Nazho la ve desde Claude.</p>
      ) : (
        <ul className="space-y-2">
          {comentarios.map((c) => (
            <li key={c.id} className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{c.autor}</span> · {c.cuando}</p>
              <p className="whitespace-pre-wrap">{c.texto}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pregunta o nota…" />
        <Button variant="outline" disabled={pendiente || !texto.trim()} onClick={enviar}>Enviar</Button>
      </div>
    </div>
  );
}
