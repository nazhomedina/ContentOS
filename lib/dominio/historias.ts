/** Historias: lo que busca cada una (tipo) y cómo se produce (registro). Tabla `historias`. */
export const TIPOS_HISTORIA = ["lead_magnet", "amplificacion", "frase", "pregunta", "archivo"] as const;
export type TipoHistoria = (typeof TIPOS_HISTORIA)[number];
export const NOMBRE_TIPO_HISTORIA: Record<string, string> = {
  lead_magnet: "Lead magnet · DM", amplificacion: "Amplificación", frase: "Frase o reflexión", pregunta: "Pregunta o encuesta", archivo: "Archivo",
};
/** El cuadrito de color del tipo (clases Tailwind de fondo). */
export const TONO_TIPO_HISTORIA: Record<string, string> = {
  lead_magnet: "bg-primary", amplificacion: "bg-foreground", frase: "bg-ok", pregunta: "bg-ambar", archivo: "bg-muted-foreground",
};
export const REGISTROS_HISTORIA = ["organico", "producido"] as const;
export const NOMBRE_REGISTRO: Record<string, string> = { organico: "Orgánico (cámara, sin diseño)", producido: "Producido (Mariela diseña el asset)" };
