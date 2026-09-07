export type Resultado = { ok: true; mensaje?: string } | { ok: false; mensaje: string };

/** Los mensajes de las funciones SQL ya vienen en español; se muestran tal cual. */
export function fallo(error: { message: string } | string): Resultado {
  const m = typeof error === "string" ? error : error.message;
  return { ok: false, mensaje: m.replace(/^.*?:\s*(?=[A-ZÁÉÍÓÚ¿«])/, "") };
}
