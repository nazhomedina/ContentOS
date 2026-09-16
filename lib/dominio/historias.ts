/** Las series de historias del paquete semanal (tabla `historias.serie`) y el registro con que se producen. */
export const SERIES_HISTORIA = ["te_lo_resumo", "archivo_folklore", "criterio_viernes", "amplificacion", "espontanea"] as const;
export type SerieHistoria = (typeof SERIES_HISTORIA)[number];
export const NOMBRE_SERIE_HISTORIA: Record<string, string> = {
  te_lo_resumo: "📚 Te lo resumo", archivo_folklore: "🗄️ Archivo Folklore", criterio_viernes: "🧭 Criterio del viernes",
  amplificacion: "Amplificación", espontanea: "Espontánea",
};
export const REGISTROS_HISTORIA = ["organico", "producido"] as const;
export const NOMBRE_REGISTRO: Record<string, string> = { organico: "Orgánico (cámara, sin diseño)", producido: "Producido (Mariela diseña el asset)" };
