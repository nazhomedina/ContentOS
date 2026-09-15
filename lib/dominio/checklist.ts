/** Checklist de una tarea: en la base es jsonb, a veces lista de textos, a veces objetos {texto, hecho}. */
export type PasoChecklist = { texto: string; hecho: boolean };

export function normalizarChecklist(raw: unknown, porDefecto: string[] = []): PasoChecklist[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) =>
      typeof x === "string"
        ? { texto: x, hecho: false }
        : { texto: String((x as { texto?: unknown })?.texto ?? ""), hecho: Boolean((x as { hecho?: unknown })?.hecho) },
    );
  }
  return porDefecto.map((texto) => ({ texto, hecho: false }));
}

/** Avance y siguiente paso pendiente, para pintarlo en una fila sin abrir la pieza. */
export function progresoChecklist(pasos: PasoChecklist[]): { hechos: number; total: number; siguiente: string | null } {
  const hechos = pasos.filter((p) => p.hecho).length;
  const siguiente = pasos.find((p) => !p.hecho)?.texto ?? null;
  return { hechos, total: pasos.length, siguiente };
}
