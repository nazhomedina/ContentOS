import { MARCA } from "@/lib/dominio/marca";

// Placeholder del sprint 0. El middleware de auth (sprint 1, paso 1.6)
// enruta por rol: editor → /cola · owner → /piezas · viewer → /tablero.
export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{MARCA.nombre}</h1>
      <p className="text-muted-foreground">{MARCA.descripcion}</p>
      <p className="text-sm text-muted-foreground">
        Sprint 0 · cimientos. El login por magic link llega en el sprint 1.
      </p>
    </main>
  );
}
