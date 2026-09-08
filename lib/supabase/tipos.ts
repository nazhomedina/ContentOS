// Generado con el conector de Supabase el 2026-09-07 (proyecto gnzsaafoxphmkwvvfmoy).
// Regenerar tras cada migración: ver docs/decisiones.md.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comentarios: {
        Row: { autor: string; created_at: string; id: string; pieza_id: string; texto: string }
        Insert: { autor: string; created_at?: string; id?: string; pieza_id: string; texto: string }
        Update: { autor?: string; created_at?: string; id?: string; pieza_id?: string; texto?: string }
        Relationships: [
          { foreignKeyName: "comentarios_autor_fkey"; columns: ["autor"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "comentarios_pieza_id_fkey"; columns: ["pieza_id"]; isOneToOne: false; referencedRelation: "piezas"; referencedColumns: ["id"] },
        ]
      }
      comunidades: {
        Row: { activa: boolean; canales: string[]; created_at: string; dolor: string | null; icp: string | null; id: string; nombre: string; promesa: string | null; tono_default: string | null }
        Insert: { activa?: boolean; canales?: string[]; created_at?: string; dolor?: string | null; icp?: string | null; id?: string; nombre: string; promesa?: string | null; tono_default?: string | null }
        Update: { activa?: boolean; canales?: string[]; created_at?: string; dolor?: string | null; icp?: string | null; id?: string; nombre?: string; promesa?: string | null; tono_default?: string | null }
        Relationships: []
      }
      corridas: {
        Row: { estado: string | null; fin: string | null; id: number; inicio: string; payload: Json | null; resumen: string | null; sistema: string }
        Insert: { estado?: string | null; fin?: string | null; id?: never; inicio?: string; payload?: Json | null; resumen?: string | null; sistema: string }
        Update: { estado?: string | null; fin?: string | null; id?: never; inicio?: string; payload?: Json | null; resumen?: string | null; sistema?: string }
        Relationships: []
      }
      format_cards: {
        Row: { codigo: string; created_at: string; estado: string; id: string; molde: string | null; nombre: string; notas: string | null; origen: string | null }
        Insert: { codigo: string; created_at?: string; estado: string; id?: string; molde?: string | null; nombre: string; notas?: string | null; origen?: string | null }
        Update: { codigo?: string; created_at?: string; estado?: string; id?: string; molde?: string | null; nombre?: string; notas?: string | null; origen?: string | null }
        Relationships: []
      }
      historias: {
        Row: { asset_url: string | null; comunidad_id: string | null; copy: string | null; created_at: string; dia: number; dms: number | null; estado: string; id: string; keyword: string | null; metricas_en: string | null; metricas_por: string | null; orden: number; pieza_amplificada_id: string | null; programada_para: string | null; publicada_en: string | null; recurso_id: string | null; registro: string; replies: number | null; semana: string; serie: string; views: number | null }
        Insert: { asset_url?: string | null; comunidad_id?: string | null; copy?: string | null; created_at?: string; dia: number; dms?: number | null; estado?: string; id?: string; keyword?: string | null; metricas_en?: string | null; metricas_por?: string | null; orden?: number; pieza_amplificada_id?: string | null; programada_para?: string | null; publicada_en?: string | null; recurso_id?: string | null; registro: string; replies?: number | null; semana: string; serie: string; views?: number | null }
        Update: { asset_url?: string | null; comunidad_id?: string | null; copy?: string | null; created_at?: string; dia?: number; dms?: number | null; estado?: string; id?: string; keyword?: string | null; metricas_en?: string | null; metricas_por?: string | null; orden?: number; pieza_amplificada_id?: string | null; programada_para?: string | null; publicada_en?: string | null; recurso_id?: string | null; registro?: string; replies?: number | null; semana?: string; serie?: string; views?: number | null }
        Relationships: [
          { foreignKeyName: "historias_comunidad_id_fkey"; columns: ["comunidad_id"]; isOneToOne: false; referencedRelation: "comunidades"; referencedColumns: ["id"] },
          { foreignKeyName: "historias_metricas_por_fkey"; columns: ["metricas_por"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "historias_pieza_amplificada_id_fkey"; columns: ["pieza_amplificada_id"]; isOneToOne: false; referencedRelation: "piezas"; referencedColumns: ["id"] },
          { foreignKeyName: "historias_recurso_id_fkey"; columns: ["recurso_id"]; isOneToOne: false; referencedRelation: "recursos"; referencedColumns: ["id"] },
        ]
      }
      ideas: {
        Row: { comunidad_id: string; creado_por: string | null; created_at: string; estado: string; etapa_embudo: string | null; id: string; notas: string | null; origen: string | null; titulo: string; updated_at: string; video_origen_id: string | null; notion_url: string | null; formato_sugerido: string[] }
        Insert: { comunidad_id: string; creado_por?: string | null; created_at?: string; estado?: string; etapa_embudo?: string | null; id?: string; notas?: string | null; origen?: string | null; titulo: string; updated_at?: string; video_origen_id?: string | null; notion_url?: string | null; formato_sugerido?: string[] }
        Update: { comunidad_id?: string; creado_por?: string | null; created_at?: string; estado?: string; etapa_embudo?: string | null; id?: string; notas?: string | null; origen?: string | null; titulo?: string; updated_at?: string; video_origen_id?: string | null; notion_url?: string | null; formato_sugerido?: string[] }
        Relationships: [
          { foreignKeyName: "ideas_comunidad_id_fkey"; columns: ["comunidad_id"]; isOneToOne: false; referencedRelation: "comunidades"; referencedColumns: ["id"] },
          { foreignKeyName: "ideas_creado_por_fkey"; columns: ["creado_por"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
        ]
      }
      indicadores_semana: {
        Row: { actualizado_en: string; buffer: number | null; horas_largo: number | null; huecos: Json; leads: number | null; leads_corte: string | null; piezas_publicadas: number | null; seguidores: number | null; seguidores_corte: string | null; semana: string; suscriptores: number | null; suscriptores_corte: string | null }
        Insert: { actualizado_en?: string; buffer?: number | null; horas_largo?: number | null; huecos?: Json; leads?: number | null; leads_corte?: string | null; piezas_publicadas?: number | null; seguidores?: number | null; seguidores_corte?: string | null; semana: string; suscriptores?: number | null; suscriptores_corte?: string | null }
        Update: { actualizado_en?: string; buffer?: number | null; horas_largo?: number | null; huecos?: Json; leads?: number | null; leads_corte?: string | null; piezas_publicadas?: number | null; seguidores?: number | null; seguidores_corte?: string | null; semana?: string; suscriptores?: number | null; suscriptores_corte?: string | null }
        Relationships: []
      }
      metricas: {
        Row: { capturado_por: string | null; comentarios: number | null; created_at: string; fecha: string; follows: number | null; fuente: string; id: number; likes: number | null; multiplicador: number | null; n_mediana: number | null; pieza_id: string; saves: number | null; views: number | null }
        Insert: { capturado_por?: string | null; comentarios?: number | null; created_at?: string; fecha: string; follows?: number | null; fuente: string; id?: never; likes?: number | null; multiplicador?: number | null; n_mediana?: number | null; pieza_id: string; saves?: number | null; views?: number | null }
        Update: { capturado_por?: string | null; comentarios?: number | null; created_at?: string; fecha?: string; follows?: number | null; fuente?: string; id?: never; likes?: number | null; multiplicador?: number | null; n_mediana?: number | null; pieza_id?: string; saves?: number | null; views?: number | null }
        Relationships: [
          { foreignKeyName: "metricas_capturado_por_fkey"; columns: ["capturado_por"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "metricas_pieza_id_fkey"; columns: ["pieza_id"]; isOneToOne: false; referencedRelation: "piezas"; referencedColumns: ["id"] },
        ]
      }
      pensamientos: {
        Row: { audio_url: string | null; autor: string | null; created_at: string; id: string; idea_id: string; responde_a: string | null; texto: string | null; tipo: string; transcript_crudo: string | null; transcript_pulido: string | null }
        Insert: { audio_url?: string | null; autor?: string | null; created_at?: string; id?: string; idea_id: string; responde_a?: string | null; texto?: string | null; tipo: string; transcript_crudo?: string | null; transcript_pulido?: string | null }
        Update: { audio_url?: string | null; autor?: string | null; created_at?: string; id?: string; idea_id?: string; responde_a?: string | null; texto?: string | null; tipo?: string; transcript_crudo?: string | null; transcript_pulido?: string | null }
        Relationships: [
          { foreignKeyName: "pensamientos_autor_fkey"; columns: ["autor"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "pensamientos_idea_id_fkey"; columns: ["idea_id"]; isOneToOne: false; referencedRelation: "ideas"; referencedColumns: ["id"] },
          { foreignKeyName: "pensamientos_responde_a_fkey"; columns: ["responde_a"]; isOneToOne: false; referencedRelation: "pensamientos"; referencedColumns: ["id"] },
        ]
      }
      perfiles: {
        Row: { api_key_hash: string | null; comunidades: string[]; created_at: string; email: string | null; nombre: string; rol: string; user_id: string }
        Insert: { api_key_hash?: string | null; comunidades?: string[]; created_at?: string; email?: string | null; nombre: string; rol: string; user_id: string }
        Update: { api_key_hash?: string | null; comunidades?: string[]; created_at?: string; email?: string | null; nombre?: string; rol?: string; user_id?: string }
        Relationships: []
      }
      perfiles_permitidos: {
        Row: { comunidades: string[]; email: string; nombre: string; rol: string }
        Insert: { comunidades?: string[]; email: string; nombre: string; rol: string }
        Update: { comunidades?: string[]; email?: string; nombre?: string; rol?: string }
        Relationships: []
      }
      piezas: {
        Row: { comunidad_id: string; created_at: string; cta: string | null; estado: string; etapa_embudo: string | null; etapa_legado: boolean; fecha_objetivo: string | null; fidelidad: string; format_card_id: string | null; formato: string | null; guion: string | null; hipotesis: Json | null; id: string; id_publico: string; idea_id: string | null; plataforma: string | null; programa_aprobado: boolean; publicada_en: string | null; requiere_hipotesis: boolean; responsable_id: string | null; serie: string | null; spec_visual: string | null; titulo: string | null; updated_at: string; url: string | null; origen: string | null; notas: string | null; notion_url: string | null; formato_sugerido: string[] }
        Insert: { comunidad_id?: string; created_at?: string; cta?: string | null; estado?: string; etapa_embudo?: string | null; etapa_legado?: boolean; fecha_objetivo?: string | null; fidelidad?: string; format_card_id?: string | null; formato?: string | null; guion?: string | null; hipotesis?: Json | null; id?: string; id_publico?: string; idea_id?: string | null; plataforma?: string | null; programa_aprobado?: boolean; publicada_en?: string | null; requiere_hipotesis?: boolean; responsable_id?: string | null; serie?: string | null; spec_visual?: string | null; titulo?: string | null; updated_at?: string; url?: string | null; origen?: string | null; notas?: string | null; notion_url?: string | null; formato_sugerido?: string[] }
        Update: { comunidad_id?: string; created_at?: string; cta?: string | null; estado?: string; etapa_embudo?: string | null; etapa_legado?: boolean; fecha_objetivo?: string | null; fidelidad?: string; format_card_id?: string | null; formato?: string | null; guion?: string | null; hipotesis?: Json | null; id?: string; id_publico?: string; idea_id?: string | null; plataforma?: string | null; programa_aprobado?: boolean; publicada_en?: string | null; requiere_hipotesis?: boolean; responsable_id?: string | null; serie?: string | null; spec_visual?: string | null; titulo?: string | null; updated_at?: string; url?: string | null; origen?: string | null; notas?: string | null; notion_url?: string | null; formato_sugerido?: string[] }
        Relationships: [
          { foreignKeyName: "piezas_comunidad_id_fkey"; columns: ["comunidad_id"]; isOneToOne: false; referencedRelation: "comunidades"; referencedColumns: ["id"] },
          { foreignKeyName: "piezas_format_card_id_fkey"; columns: ["format_card_id"]; isOneToOne: false; referencedRelation: "format_cards"; referencedColumns: ["id"] },
          { foreignKeyName: "piezas_idea_id_fkey"; columns: ["idea_id"]; isOneToOne: false; referencedRelation: "ideas"; referencedColumns: ["id"] },
          { foreignKeyName: "piezas_responsable_id_fkey"; columns: ["responsable_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
        ]
      }
      recursos: {
        Row: { comunidad_id: string | null; created_at: string; estado: string; id: string; keyword: string | null; kit_tag_id: string | null; leads: number | null; leads_actualizado_en: string | null; nombre: string; slug_go: string | null }
        Insert: { comunidad_id?: string | null; created_at?: string; estado?: string; id?: string; keyword?: string | null; kit_tag_id?: string | null; leads?: number | null; leads_actualizado_en?: string | null; nombre: string; slug_go?: string | null }
        Update: { comunidad_id?: string | null; created_at?: string; estado?: string; id?: string; keyword?: string | null; kit_tag_id?: string | null; leads?: number | null; leads_actualizado_en?: string | null; nombre?: string; slug_go?: string | null }
        Relationships: [
          { foreignKeyName: "recursos_comunidad_id_fkey"; columns: ["comunidad_id"]; isOneToOne: false; referencedRelation: "comunidades"; referencedColumns: ["id"] },
        ]
      }
      sistemas_registrados: {
        Row: { activo: boolean; descripcion: string | null; esperado_cada: string; nombre: string }
        Insert: { activo?: boolean; descripcion?: string | null; esperado_cada: string; nombre: string }
        Update: { activo?: boolean; descripcion?: string | null; esperado_cada?: string; nombre?: string }
        Relationships: []
      }
      sistemas: {
        Row: { activo: boolean; aristas: Json; cadencia: string; clave: string; id: string; nodos: Json; nombre: string; orden: number; proposito: string | null; updated_at: string; version: number }
        Insert: { activo?: boolean; aristas?: Json; cadencia?: string; clave: string; id?: string; nodos?: Json; nombre: string; orden?: number; proposito?: string | null; updated_at?: string; version?: number }
        Update: { activo?: boolean; aristas?: Json; cadencia?: string; clave?: string; id?: string; nodos?: Json; nombre?: string; orden?: number; proposito?: string | null; updated_at?: string; version?: number }
        Relationships: []
      }
      metas_semana: {
        Row: { cantidad: number; desde: string; formato: string }
        Insert: { cantidad: number; desde?: string; formato: string }
        Update: { cantidad?: number; desde?: string; formato?: string }
        Relationships: []
      }
      campanas: {
        Row: { activa: boolean; created_at: string; fin: string | null; id: string; inicio: string | null; meta_campaign_id: string | null; nombre: string; objetivo: string; pieza_id: string | null; presupuesto_semanal: number | null; recurso_id: string | null }
        Insert: { activa?: boolean; created_at?: string; fin?: string | null; id?: string; inicio?: string | null; meta_campaign_id?: string | null; nombre: string; objetivo: string; pieza_id?: string | null; presupuesto_semanal?: number | null; recurso_id?: string | null }
        Update: { activa?: boolean; created_at?: string; fin?: string | null; id?: string; inicio?: string | null; meta_campaign_id?: string | null; nombre?: string; objetivo?: string; pieza_id?: string | null; presupuesto_semanal?: number | null; recurso_id?: string | null }
        Relationships: []
      }
      bitacora: {
        Row: { created_at: string; evidencia_url: string | null; fecha: string; id: string; minutos: number | null; perfil_id: string; pieza_id: string | null; tarea_id: string | null; texto: string }
        Insert: { created_at?: string; evidencia_url?: string | null; fecha?: string; id?: string; minutos?: number | null; perfil_id: string; pieza_id?: string | null; tarea_id?: string | null; texto: string }
        Update: { created_at?: string; evidencia_url?: string | null; fecha?: string; id?: string; minutos?: number | null; perfil_id?: string; pieza_id?: string | null; tarea_id?: string | null; texto?: string }
        Relationships: [
          { foreignKeyName: "bitacora_perfil_id_fkey"; columns: ["perfil_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "bitacora_pieza_id_fkey"; columns: ["pieza_id"]; isOneToOne: false; referencedRelation: "piezas"; referencedColumns: ["id"] },
          { foreignKeyName: "bitacora_tarea_id_fkey"; columns: ["tarea_id"]; isOneToOne: false; referencedRelation: "tareas"; referencedColumns: ["id"] },
        ]
      }
      cuentas_referencia: {
        Row: { activa: boolean; comunidad_id: string | null; created_at: string; format_card_sugerida: string | null; handle: string; id: string; nota: string | null; plataforma: string; ultimo_scrape: string | null }
        Insert: { activa?: boolean; comunidad_id?: string | null; created_at?: string; format_card_sugerida?: string | null; handle: string; id?: string; nota?: string | null; plataforma?: string; ultimo_scrape?: string | null }
        Update: { activa?: boolean; comunidad_id?: string | null; created_at?: string; format_card_sugerida?: string | null; handle?: string; id?: string; nota?: string | null; plataforma?: string; ultimo_scrape?: string | null }
        Relationships: []
      }
      hooks: {
        Row: { categoria: string | null; created_at: string; favorito: boolean; formato: string | null; id: string; pieza_id: string | null; texto: string }
        Insert: { categoria?: string | null; created_at?: string; favorito?: boolean; formato?: string | null; id?: string; pieza_id?: string | null; texto: string }
        Update: { categoria?: string | null; created_at?: string; favorito?: boolean; formato?: string | null; id?: string; pieza_id?: string | null; texto?: string }
        Relationships: []
      }
      huecos: {
        Row: { created_at: string; declarado_por: string | null; id: string; nodo_clave: string; nota: string; semana: string; sistema_clave: string }
        Insert: { created_at?: string; declarado_por?: string | null; id?: string; nodo_clave: string; nota: string; semana: string; sistema_clave: string }
        Update: { created_at?: string; declarado_por?: string | null; id?: string; nodo_clave?: string; nota?: string; semana?: string; sistema_clave?: string }
        Relationships: []
      }
      tareas: {
        Row: { asignado_a: string | null; checklist: Json; created_at: string; estado: string; hecha_en: string | null; historia_id: string | null; id: string; nota_bloqueo: string | null; pieza_id: string | null; tipo: string; vence: string | null }
        Insert: { asignado_a?: string | null; checklist?: Json; created_at?: string; estado?: string; hecha_en?: string | null; historia_id?: string | null; id?: string; nota_bloqueo?: string | null; pieza_id?: string | null; tipo: string; vence?: string | null }
        Update: { asignado_a?: string | null; checklist?: Json; created_at?: string; estado?: string; hecha_en?: string | null; historia_id?: string | null; id?: string; nota_bloqueo?: string | null; pieza_id?: string | null; tipo?: string; vence?: string | null }
        Relationships: [
          { foreignKeyName: "tareas_asignado_a_fkey"; columns: ["asignado_a"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["user_id"] },
          { foreignKeyName: "tareas_historia_id_fkey"; columns: ["historia_id"]; isOneToOne: false; referencedRelation: "historias"; referencedColumns: ["id"] },
          { foreignKeyName: "tareas_pieza_id_fkey"; columns: ["pieza_id"]; isOneToOne: false; referencedRelation: "piezas"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      aprobar_historias: { Args: { p_editor?: string; p_semana: string }; Returns: number }
      asignar_tarea: {
        Args: { p_asignado_a: string; p_checklist?: Json; p_historia_id?: string; p_pieza_id?: string; p_tipo: string; p_vence: string }
        Returns: Database["public"]["Tables"]["tareas"]["Row"]
        SetofOptions: { from: "*"; to: "tareas"; isOneToOne: true; isSetofReturn: false }
      }
      cambiar_estado_pieza: {
        Args: { p_nuevo_estado: string; p_pieza_id: string }
        Returns: Database["public"]["Tables"]["piezas"]["Row"]
        SetofOptions: { from: "*"; to: "piezas"; isOneToOne: true; isSetofReturn: false }
      }
      crear_pieza_validada: {
        Args: { payload: Json }
        Returns: Database["public"]["Tables"]["piezas"]["Row"]
        SetofOptions: { from: "*"; to: "piezas"; isOneToOne: true; isSetofReturn: false }
      }
      evidencia_dia: { Args: { p_perfil: string; p_fecha: string }; Returns: Json }
      resumen_semana_persona: {
        Args: { p_perfil: string; p_semana: string }
        Returns: { fecha: string; declaraciones: number; tareas_hechas: number; archivos: number; estados: number }[]
      }
      estado_nodos: {
        Args: { p_clave: string; p_semana: string }
        Returns: { nodo_clave: string; nombre: string; tipo: string; dueno: string | null; disparador: string | null; nota: string | null; estado: string; n: number; cuando: string | null; detalle: string | null; hueco_nota: string | null }[]
      }
      cuota_semana: {
        Args: { p_semana: string }
        Returns: { formato: string; meta: number; publicadas: number; en_camino: number; piezas: Json }[]
      }
      declarar_hueco: {
        Args: { p_semana: string; p_sistema: string; p_nodo: string; p_nota: string }
        Returns: Database["public"]["Tables"]["huecos"]["Row"]
        SetofOptions: { from: "*"; to: "huecos"; isOneToOne: true; isSetofReturn: false }
      }
      definir_sistema: {
        Args: { payload: Json }
        Returns: Database["public"]["Tables"]["sistemas"]["Row"]
        SetofOptions: { from: "*"; to: "sistemas"; isOneToOne: true; isSetofReturn: false }
      }
      exigir_rol: { Args: { roles: string[] }; Returns: undefined }
      hipotesis_valida: { Args: { h: Json }; Returns: boolean }
      latidos: {
        Args: never
        Returns: { atrasado: boolean; esperado_cada: string; sistema: string; ultima_corrida: string; ultimo_estado: string; ultimo_resumen: string }[]
      }
      marcar_publicada: {
        Args: { p_pieza_id: string; p_plataforma: string; p_url: string }
        Returns: Database["public"]["Tables"]["piezas"]["Row"]
        SetofOptions: { from: "*"; to: "piezas"; isOneToOne: true; isSetofReturn: false }
      }
      multiplicador: {
        Args: { p_min_n?: number; p_pieza_id: string }
        Returns: { mediana: number; multiplicador: number; n: number; views: number }[]
      }
      perfil_por_api_key: {
        Args: { p_hash: string }
        Returns: Database["public"]["Tables"]["perfiles"]["Row"]
        SetofOptions: { from: "*"; to: "perfiles"; isOneToOne: true; isSetofReturn: false }
      }
      recalcular_multiplicadores: { Args: never; Returns: number }
      registrar_corrida: { Args: { p_estado: string; p_payload?: Json; p_resumen?: string; p_sistema: string }; Returns: number }
      rol_actual: { Args: never; Returns: string }
      transicion_permitida: { Args: { p_a: string; p_de: string; p_rol: string }; Returns: boolean }
      views_recientes: { Args: { p_pieza_id: string }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]

export type Pieza = Tables<"piezas">
export type Tarea = Tables<"tareas">
export type Historia = Tables<"historias">
export type Perfil = Tables<"perfiles">
export type FormatCard = Tables<"format_cards">
export type Comentario = Tables<"comentarios">
export type Recurso = Tables<"recursos">
export type Sistema = Tables<"sistemas">
export type Hueco = Tables<"huecos">
