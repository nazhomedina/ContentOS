import type { Rol } from "./roles";

/** Estados de pieza (docs/estructura.md). Tres etapas visibles: Borrador · Producción · Publicado. */
export const ESTADOS_PIEZA = [
  "borrador", "redaccion", "grabacion", "diseno", "listo", "programada", "publicada", "archivada", "en_trial",
] as const;
export type EstadoPieza = (typeof ESTADOS_PIEZA)[number];

export const NOMBRE_ESTADO: Record<EstadoPieza, string> = {
  borrador: "Borrador",
  redaccion: "Redacción",
  grabacion: "Grabación",
  diseno: "Diseño y producción",
  listo: "Listo",
  programada: "Programada",
  publicada: "Publicada",
  archivada: "Archivada",
  en_trial: "En trial",
};

export type Etapa = "borrador" | "produccion" | "publicado" | "archivado";
export const NOMBRE_ETAPA: Record<Etapa, string> = { borrador: "Borrador", produccion: "Producción", publicado: "Publicado", archivado: "Archivado" };

export function etapaDe(estado: string): Etapa {
  if (estado === "borrador") return "borrador";
  if (estado === "publicada" || estado === "en_trial") return "publicado";
  if (estado === "archivada") return "archivado";
  return "produccion";
}

/** Columnas de producción; `listo` agrupa listo + programada (el buffer). */
export const PRODUCCION: EstadoPieza[] = ["redaccion", "grabacion", "diseno", "listo"];
export const EN_BUFFER: EstadoPieza[] = ["listo", "programada"];

export const FORMATOS = ["reel", "yap", "carrusel", "historia", "x", "canal_ig", "newsletter", "articulo", "youtube"] as const;
export type Formato = (typeof FORMATOS)[number];
export const NOMBRE_FORMATO: Record<Formato, string> = {
  reel: "Reel", yap: "Yap", carrusel: "Carrusel", historia: "Historia", x: "X",
  canal_ig: "Canal IG", newsletter: "Newsletter", articulo: "Artículo", youtube: "YouTube",
};

/** Qué sub-etapas de producción aplican a cada formato. Los demás pasan directo. */
export function subetapas(formato: string | null): EstadoPieza[] {
  switch (formato) {
    case "reel":
    case "yap":
    case "youtube":
    case "historia":
      return ["redaccion", "grabacion", "diseno", "listo"];
    default:
      return ["redaccion", "diseno", "listo"];
  }
}

/** Pestañas por formato del menú: ruta → formatos que agrupa. */
export const PESTANAS_FORMATO: { ruta: string; etiqueta: string; formatos: Formato[]; meta?: string }[] = [
  { ruta: "/reels", etiqueta: "Reels", formatos: ["reel", "yap", "youtube"], meta: "reel" },
  { ruta: "/carruseles", etiqueta: "Carruseles", formatos: ["carrusel"], meta: "carrusel" },
  { ruta: "/articulos", etiqueta: "Artículos", formatos: ["articulo", "x", "canal_ig"], meta: "articulo" },
  { ruta: "/newsletter", etiqueta: "Newsletter", formatos: ["newsletter"], meta: "newsletter" },
];

export function pestanaDeFormato(formato: string | null): string | null {
  return PESTANAS_FORMATO.find((p) => (p.formatos as string[]).includes(formato ?? ""))?.ruta ?? null;
}

export const TIPOS_TAREA = ["grabar", "editar", "diseñar", "publicar", "capturar_metricas", "revisar"] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];
export const NOMBRE_TAREA: Record<TipoTarea, string> = {
  grabar: "Grabar", editar: "Editar", "diseñar": "Diseñar", publicar: "Publicar",
  capturar_metricas: "Capturar métricas", revisar: "Revisar",
};

/** Espejo de transicion_permitida() en SQL. La base manda; esto solo decide qué botones mostrar. */
export function transicionPermitida(rol: Rol, de: string, a: string): boolean {
  if (a === "publicada") return false;
  if (rol === "owner") return true;
  if (rol === "editor") {
    return (
      (de === "grabacion" && a === "diseno") ||
      (de === "redaccion" && a === "diseno") ||
      (de === "diseno" && a === "listo") ||
      (de === "listo" && a === "programada") ||
      (de === "programada" && a === "listo")
    );
  }
  return false;
}

/** Siguiente paso natural del editor. */
export function siguienteEstadoEditor(estado: string): EstadoPieza | null {
  switch (estado) {
    case "grabacion": return "diseno";
    case "diseno": return "listo";
    case "listo": return "programada";
    default: return null;
  }
}

/** Por qué no se puede publicar todavía. Null si sí se puede. */
export function motivoNoPublicable(estado: string): string | null {
  switch (estado) {
    case "listo":
    case "programada":
      return null;
    case "publicada":
      return "Ya está publicada.";
    case "diseno":
      return "Falta terminarla y marcarla como lista.";
    case "grabacion":
      return "Falta grabar y producir.";
    case "redaccion":
      return "Está en redacción: todavía no tiene guion final.";
    case "borrador":
      return "Es un borrador. Pídele a Claude que lo desarrolle.";
    case "archivada":
      return "Está archivada.";
    case "en_trial":
      return "Es un trial: se gradúa como reel nuevo, no se publica desde aquí.";
    default:
      return "No se puede publicar desde este estado.";
  }
}

/** Checklist por tipo de tarea y formato. */
export function checklistPorDefecto(tipo: string, formato: string): string[] {
  if (formato === "carrusel") return ["Slides", "Portada", "Caption"];
  if (tipo === "editar") return ["Edición", "Portada", "Caption"];
  if (tipo === "publicar") return ["Programada", "URL capturada"];
  if (tipo === "grabar") return ["Grabado", "RAW subido"];
  return [];
}
