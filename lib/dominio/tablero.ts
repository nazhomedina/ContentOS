/** El tablero de Mariela: objetivos de la semana y una tabla con tres bolsas (docs/decisiones.md 2026-09-25). */

export const BOLSAS = ["listo", "trabajar", "manos"] as const;
export type Bolsa = (typeof BOLSAS)[number];
export const NOMBRE_BOLSA: Record<Bolsa, string> = { listo: "Listo para publicar", trabajar: "Para trabajar", manos: "En mis manos" };

/** Filtro por tipo: agrupa como las pestañas del menú. */
export const FILTROS_TIPO = [
  { clave: "todo", etiqueta: "Todo", tipos: null },
  { clave: "reel", etiqueta: "Reels", tipos: ["reel", "yap", "youtube"] },
  { clave: "carrusel", etiqueta: "Carruseles", tipos: ["carrusel"] },
  { clave: "historia", etiqueta: "Historias", tipos: ["historia"] },
  { clave: "newsletter", etiqueta: "Newsletter", tipos: ["newsletter"] },
] as const;
export type FiltroTipo = (typeof FILTROS_TIPO)[number]["clave"];

export function pasaFiltro(filtro: string, tipo: string | null): boolean {
  const f = FILTROS_TIPO.find((x) => x.clave === filtro) ?? FILTROS_TIPO[0];
  return f.tipos === null || (f.tipos as readonly string[]).includes(tipo ?? "");
}

/** Encabezados de la tabla según la bolsa. */
export const COLUMNAS: Record<Bolsa, { detalle: string; fecha: string }> = {
  listo: { detalle: "Estado", fecha: "Sale" },
  trabajar: { detalle: "Qué hay", fecha: "Prioridad" },
  manos: { detalle: "Tarea", fecha: "La tomaste" },
};

export const PIE_BOLSA: Record<Bolsa, string> = {
  listo: "De aquí sale la meta. Programar pone fecha; Publicada pide la URL si es reel o carrusel y solo marca si es historia. Cada acción queda anotada en Mi día.",
  trabajar: "Lo grabado por Nazho y lo escrito con texto final. En ámbar, lo que destraba una meta de esta semana. Tomar te lo asigna y pasa a «En mis manos».",
  manos: "Lo que ya tomaste. Lista lo pasa al buffer. Si algo te detiene, abre la pieza y márcala bloqueada: Nazho la ve en rojo.",
};

/** Una meta de la semana, ya calculada para el tile. */
export type Objetivo = {
  tipo: string;
  nombre: string;
  meta: number;
  publicadas: number;
  enCamino: number;
  faltan: number;
  contexto: string;
  tono: "ok" | "normal" | "rojo";
};

export const NOMBRE_OBJETIVO: Record<string, string> = { reel: "Reels", carrusel: "Carruseles", historia_dia: "Historias", newsletter: "Newsletter" };
export const ORDEN_OBJETIVOS = ["reel", "carrusel", "historia_dia", "newsletter"];

/** Plataforma por defecto al publicar, según el tipo de pieza. */
export function plataformaPorDefecto(tipo: string | null): string {
  switch (tipo) {
    case "youtube": return "youtube";
    case "newsletter": return "kit";
    case "x": return "x";
    case "articulo": return "web";
    default: return "instagram";
  }
}

export const PLATAFORMAS = ["instagram", "youtube", "kit", "x", "linkedin", "web"] as const;

/** Texto corto de «faltan» para el encabezado. */
export function resumenFaltan(objetivos: Objetivo[]): string {
  const partes = objetivos.filter((o) => o.faltan > 0).map((o) => {
    if (o.tipo === "historia_dia") return `${o.faltan} ${o.faltan === 1 ? "día" : "días"} de historias`;
    if (o.tipo === "newsletter") return "el newsletter";
    return `${o.faltan} ${o.faltan === 1 ? o.nombre.toLowerCase().replace(/s$/, "") : o.nombre.toLowerCase()}`;
  });
  if (partes.length === 0) return "la semana está cumplida";
  if (partes.length === 1) return `falta ${partes[0]}`;
  return `faltan ${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
