/** Semáforo del buffer (regla de marzo que sobrevivió): ≥5 verde · 2–4 ámbar · <2 rojo. */
export type Semaforo = "ok" | "ambar" | "rojo";

export function semaforoBuffer(n: number): Semaforo {
  if (n >= 5) return "ok";
  if (n >= 2) return "ambar";
  return "rojo";
}

export const CLASE_SEMAFORO: Record<Semaforo, string> = {
  ok: "bg-ok text-white",
  ambar: "bg-ambar text-white",
  rojo: "bg-rojo text-white",
};

export const TOPE_PRODUCCION = 10;
