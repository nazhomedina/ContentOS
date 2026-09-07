import type { Rol } from "./roles";

export const ESTADOS_PIEZA = [
  "para_producir", "para_grabar", "edicion", "buffer", "programada", "publicada", "archivada", "en_trial",
] as const;
export type EstadoPieza = (typeof ESTADOS_PIEZA)[number];

export const NOMBRE_ESTADO: Record<EstadoPieza, string> = {
  para_producir: "Para producir",
  para_grabar: "Para grabar",
  edicion: "Edición",
  buffer: "Buffer",
  programada: "Programada",
  publicada: "Publicada",
  archivada: "Archivada",
  en_trial: "En trial",
};

export const FORMATOS = ["reel", "yap", "carrusel", "historia", "x", "canal_ig", "newsletter", "articulo", "youtube"] as const;
export type Formato = (typeof FORMATOS)[number];
export const NOMBRE_FORMATO: Record<Formato, string> = {
  reel: "Reel", yap: "Yap", carrusel: "Carrusel", historia: "Historia", x: "X",
  canal_ig: "Canal IG", newsletter: "Newsletter", articulo: "Artículo", youtube: "YouTube",
};

export const TIPOS_TAREA = ["grabar", "editar", "diseñar", "publicar", "capturar_metricas", "revisar"] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];
export const NOMBRE_TAREA: Record<TipoTarea, string> = {
  grabar: "Grabar", editar: "Editar", "diseñar": "Diseñar", publicar: "Publicar",
  capturar_metricas: "Capturar métricas", revisar: "Revisar",
};

/** Espejo de transicion_permitida() en SQL. La base manda; esto solo decide qué botones mostrar. */
export function transicionPermitida(rol: Rol, de: string, a: string): boolean {
  if (a === "publicada") return false; // solo marcar_publicada
  if (rol === "owner") return true;
  if (rol === "editor") {
    return (
      (de === "para_grabar" && a === "edicion") ||
      (de === "edicion" && a === "buffer") ||
      (de === "buffer" && a === "programada") ||
      (de === "programada" && a === "buffer")
    );
  }
  return false;
}

/** Siguiente paso natural del editor para el botón principal del detalle. */
export function siguienteEstadoEditor(estado: string): EstadoPieza | null {
  switch (estado) {
    case "para_grabar": return "edicion";
    case "edicion": return "buffer";
    case "buffer": return "programada";
    default: return null;
  }
}

/** Por qué no se puede publicar todavía, en palabras de la pantalla. Null si sí se puede. */
export function motivoNoPublicable(estado: string): string | null {
  switch (estado) {
    case "buffer":
    case "programada":
      return null;
    case "publicada":
      return "Ya está publicada.";
    case "edicion":
      return "Falta pasar por buffer.";
    case "para_grabar":
      return "Falta grabar y editar.";
    case "para_producir":
      return "Todavía no tiene guion final.";
    case "archivada":
      return "Está archivada.";
    case "en_trial":
      return "Es un trial: se gradúa como reel nuevo, no se publica desde aquí.";
    default:
      return "No se puede publicar desde este estado.";
  }
}

/** Checklist por tipo de tarea y formato (diseño §6, detalle de pieza). */
export function checklistPorDefecto(tipo: string, formato: string): string[] {
  if (formato === "carrusel") return ["Slides", "Portada", "Caption"];
  if (tipo === "editar") return ["Edición", "Portada", "Caption"];
  if (tipo === "publicar") return ["Programada", "URL capturada"];
  if (tipo === "grabar") return ["Grabado", "RAW subido"];
  return [];
}
