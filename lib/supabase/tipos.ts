// Generado con el conector de Supabase el 2026-09-16 (proyecto gnzsaafoxphmkwvvfmoy), tras la migración 013.
// Regenerar tras cada migración: ver docs/decisiones.md.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          carpeta: string
          created_at: string
          id: string
          nombre: string
          pieza_id: string
          ruta: string
          subido_por: string | null
        }
        Insert: {
          carpeta: string
          created_at?: string
          id?: string
          nombre: string
          pieza_id: string
          ruta: string
          subido_por?: string | null
        }
        Update: {
          carpeta?: string
          created_at?: string
          id?: string
          nombre?: string
          pieza_id?: string
          ruta?: string
          subido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bitacora: {
        Row: {
          created_at: string
          evidencia_url: string | null
          fecha: string
          id: string
          minutos: number | null
          perfil_id: string
          pieza_id: string | null
          tarea_id: string | null
          texto: string
        }
        Insert: {
          created_at?: string
          evidencia_url?: string | null
          fecha?: string
          id?: string
          minutos?: number | null
          perfil_id: string
          pieza_id?: string | null
          tarea_id?: string | null
          texto: string
        }
        Update: {
          created_at?: string
          evidencia_url?: string | null
          fecha?: string
          id?: string
          minutos?: number | null
          perfil_id?: string
          pieza_id?: string | null
          tarea_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bitacora_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitacora_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanas: {
        Row: {
          activa: boolean
          created_at: string
          fin: string | null
          id: string
          inicio: string | null
          meta_campaign_id: string | null
          nombre: string
          objetivo: string
          pieza_id: string | null
          presupuesto_semanal: number | null
          recurso_id: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string | null
          meta_campaign_id?: string | null
          nombre: string
          objetivo: string
          pieza_id?: string | null
          presupuesto_semanal?: number | null
          recurso_id?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string | null
          meta_campaign_id?: string | null
          nombre?: string
          objetivo?: string
          pieza_id?: string | null
          presupuesto_semanal?: number | null
          recurso_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanas_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanas_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          autor: string
          created_at: string
          id: string
          pieza_id: string
          texto: string
        }
        Insert: {
          autor: string
          created_at?: string
          id?: string
          pieza_id: string
          texto: string
        }
        Update: {
          autor?: string
          created_at?: string
          id?: string
          pieza_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comentarios_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunidades: {
        Row: {
          activa: boolean
          canales: string[]
          created_at: string
          dolor: string | null
          icp: string | null
          id: string
          nombre: string
          promesa: string | null
          tono_default: string | null
        }
        Insert: {
          activa?: boolean
          canales?: string[]
          created_at?: string
          dolor?: string | null
          icp?: string | null
          id?: string
          nombre: string
          promesa?: string | null
          tono_default?: string | null
        }
        Update: {
          activa?: boolean
          canales?: string[]
          created_at?: string
          dolor?: string | null
          icp?: string | null
          id?: string
          nombre?: string
          promesa?: string | null
          tono_default?: string | null
        }
        Relationships: []
      }
      contenido_versiones: {
        Row: {
          autor: string | null
          contenido: string
          created_at: string
          id: string
          instruccion: string | null
          pieza_id: string
          version: number
        }
        Insert: {
          autor?: string | null
          contenido: string
          created_at?: string
          id?: string
          instruccion?: string | null
          pieza_id: string
          version: number
        }
        Update: {
          autor?: string | null
          contenido?: string
          created_at?: string
          id?: string
          instruccion?: string | null
          pieza_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guion_versiones_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          estado: string | null
          fin: string | null
          id: number
          inicio: string
          payload: Json | null
          resumen: string | null
          sistema: string
        }
        Insert: {
          estado?: string | null
          fin?: string | null
          id?: never
          inicio?: string
          payload?: Json | null
          resumen?: string | null
          sistema: string
        }
        Update: {
          estado?: string | null
          fin?: string | null
          id?: never
          inicio?: string
          payload?: Json | null
          resumen?: string | null
          sistema?: string
        }
        Relationships: []
      }
      cuentas_referencia: {
        Row: {
          activa: boolean
          comunidad_id: string | null
          created_at: string
          format_card_sugerida: string | null
          handle: string
          id: string
          nota: string | null
          plataforma: string
          ultimo_scrape: string | null
        }
        Insert: {
          activa?: boolean
          comunidad_id?: string | null
          created_at?: string
          format_card_sugerida?: string | null
          handle: string
          id?: string
          nota?: string | null
          plataforma?: string
          ultimo_scrape?: string | null
        }
        Update: {
          activa?: boolean
          comunidad_id?: string | null
          created_at?: string
          format_card_sugerida?: string | null
          handle?: string
          id?: string
          nota?: string | null
          plataforma?: string
          ultimo_scrape?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_referencia_comunidad_id_fkey"
            columns: ["comunidad_id"]
            isOneToOne: false
            referencedRelation: "comunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_referencia_format_card_sugerida_fkey"
            columns: ["format_card_sugerida"]
            isOneToOne: false
            referencedRelation: "formatos"
            referencedColumns: ["id"]
          },
        ]
      }
      formatos: {
        Row: {
          cadencia: string | null
          codigo: string
          created_at: string
          duracion: string | null
          estado: string
          hipotesis_formato: string | null
          id: string
          molde: string | null
          nombre: string
          notas: string | null
          origen: string | null
          recompensa: string | null
          serie_propia: string | null
        }
        Insert: {
          cadencia?: string | null
          codigo: string
          created_at?: string
          duracion?: string | null
          estado: string
          hipotesis_formato?: string | null
          id?: string
          molde?: string | null
          nombre: string
          notas?: string | null
          origen?: string | null
          recompensa?: string | null
          serie_propia?: string | null
        }
        Update: {
          cadencia?: string | null
          codigo?: string
          created_at?: string
          duracion?: string | null
          estado?: string
          hipotesis_formato?: string | null
          id?: string
          molde?: string | null
          nombre?: string
          notas?: string | null
          origen?: string | null
          recompensa?: string | null
          serie_propia?: string | null
        }
        Relationships: []
      }
      hipotesis: {
        Row: {
          campo: string | null
          created_at: string
          estado: string
          fecha: string | null
          id: string
          numero: number | null
          resuelta_en: string | null
          texto: string
          updated_at: string
          veredicto: string | null
        }
        Insert: {
          campo?: string | null
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          numero?: number | null
          resuelta_en?: string | null
          texto: string
          updated_at?: string
          veredicto?: string | null
        }
        Update: {
          campo?: string | null
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          numero?: number | null
          resuelta_en?: string | null
          texto?: string
          updated_at?: string
          veredicto?: string | null
        }
        Relationships: []
      }
      historias: {
        Row: {
          asset_url: string | null
          comunidad_id: string | null
          copy: string | null
          created_at: string
          dia: number
          dms: number | null
          estado: string
          id: string
          keyword: string | null
          metricas_en: string | null
          metricas_por: string | null
          orden: number
          pieza_amplificada_id: string | null
          programada_para: string | null
          publicada_en: string | null
          recurso_id: string | null
          registro: string
          replies: number | null
          semana: string
          serie: string
          views: number | null
        }
        Insert: {
          asset_url?: string | null
          comunidad_id?: string | null
          copy?: string | null
          created_at?: string
          dia: number
          dms?: number | null
          estado?: string
          id?: string
          keyword?: string | null
          metricas_en?: string | null
          metricas_por?: string | null
          orden?: number
          pieza_amplificada_id?: string | null
          programada_para?: string | null
          publicada_en?: string | null
          recurso_id?: string | null
          registro: string
          replies?: number | null
          semana: string
          serie: string
          views?: number | null
        }
        Update: {
          asset_url?: string | null
          comunidad_id?: string | null
          copy?: string | null
          created_at?: string
          dia?: number
          dms?: number | null
          estado?: string
          id?: string
          keyword?: string | null
          metricas_en?: string | null
          metricas_por?: string | null
          orden?: number
          pieza_amplificada_id?: string | null
          programada_para?: string | null
          publicada_en?: string | null
          recurso_id?: string | null
          registro?: string
          replies?: number | null
          semana?: string
          serie?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historias_comunidad_id_fkey"
            columns: ["comunidad_id"]
            isOneToOne: false
            referencedRelation: "comunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historias_metricas_por_fkey"
            columns: ["metricas_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "historias_pieza_amplificada_id_fkey"
            columns: ["pieza_amplificada_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historias_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      hooks: {
        Row: {
          categoria: string | null
          created_at: string
          favorito: boolean
          formato: string | null
          id: string
          pieza_id: string | null
          texto: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          favorito?: boolean
          formato?: string | null
          id?: string
          pieza_id?: string | null
          texto: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          favorito?: boolean
          formato?: string | null
          id?: string
          pieza_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "hooks_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
        ]
      }
      huecos: {
        Row: {
          created_at: string
          declarado_por: string | null
          id: string
          nodo_clave: string
          nota: string
          semana: string
          sistema_clave: string
        }
        Insert: {
          created_at?: string
          declarado_por?: string | null
          id?: string
          nodo_clave: string
          nota: string
          semana: string
          sistema_clave: string
        }
        Update: {
          created_at?: string
          declarado_por?: string | null
          id?: string
          nodo_clave?: string
          nota?: string
          semana?: string
          sistema_clave?: string
        }
        Relationships: [
          {
            foreignKeyName: "huecos_declarado_por_fkey"
            columns: ["declarado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "huecos_sistema_clave_fkey"
            columns: ["sistema_clave"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["clave"]
          },
        ]
      }
      indicadores_semana: {
        Row: {
          actualizado_en: string
          buffer: number | null
          horas_largo: number | null
          huecos: Json
          leads: number | null
          leads_corte: string | null
          piezas_publicadas: number | null
          seguidores: number | null
          seguidores_corte: string | null
          semana: string
          suscriptores: number | null
          suscriptores_corte: string | null
        }
        Insert: {
          actualizado_en?: string
          buffer?: number | null
          horas_largo?: number | null
          huecos?: Json
          leads?: number | null
          leads_corte?: string | null
          piezas_publicadas?: number | null
          seguidores?: number | null
          seguidores_corte?: string | null
          semana: string
          suscriptores?: number | null
          suscriptores_corte?: string | null
        }
        Update: {
          actualizado_en?: string
          buffer?: number | null
          horas_largo?: number | null
          huecos?: Json
          leads?: number | null
          leads_corte?: string | null
          piezas_publicadas?: number | null
          seguidores?: number | null
          seguidores_corte?: string | null
          semana?: string
          suscriptores?: number | null
          suscriptores_corte?: string | null
        }
        Relationships: []
      }
      metas_semana: {
        Row: {
          cantidad: number
          desde: string
          tipo: string
        }
        Insert: {
          cantidad: number
          desde?: string
          tipo: string
        }
        Update: {
          cantidad?: number
          desde?: string
          tipo?: string
        }
        Relationships: []
      }
      metricas: {
        Row: {
          capturado_por: string | null
          comentarios: number | null
          created_at: string
          fecha: string
          follows: number | null
          fuente: string
          id: number
          likes: number | null
          multiplicador: number | null
          n_mediana: number | null
          pieza_id: string
          saves: number | null
          views: number | null
        }
        Insert: {
          capturado_por?: string | null
          comentarios?: number | null
          created_at?: string
          fecha: string
          follows?: number | null
          fuente: string
          id?: never
          likes?: number | null
          multiplicador?: number | null
          n_mediana?: number | null
          pieza_id: string
          saves?: number | null
          views?: number | null
        }
        Update: {
          capturado_por?: string | null
          comentarios?: number | null
          created_at?: string
          fecha?: string
          follows?: number | null
          fuente?: string
          id?: never
          likes?: number | null
          multiplicador?: number | null
          n_mediana?: number | null
          pieza_id?: string
          saves?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_capturado_por_fkey"
            columns: ["capturado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "metricas_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
        ]
      }
      pensamientos: {
        Row: {
          audio_url: string | null
          autor: string | null
          created_at: string
          duracion_s: number | null
          id: string
          pieza_id: string
          responde_a: string | null
          ronda: number | null
          texto: string | null
          tipo: string
          transcript_crudo: string | null
          transcript_pulido: string | null
        }
        Insert: {
          audio_url?: string | null
          autor?: string | null
          created_at?: string
          duracion_s?: number | null
          id?: string
          pieza_id: string
          responde_a?: string | null
          ronda?: number | null
          texto?: string | null
          tipo: string
          transcript_crudo?: string | null
          transcript_pulido?: string | null
        }
        Update: {
          audio_url?: string | null
          autor?: string | null
          created_at?: string
          duracion_s?: number | null
          id?: string
          pieza_id?: string
          responde_a?: string | null
          ronda?: number | null
          texto?: string | null
          tipo?: string
          transcript_crudo?: string | null
          transcript_pulido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pensamientos_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pensamientos_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pensamientos_responde_a_fkey"
            columns: ["responde_a"]
            isOneToOne: false
            referencedRelation: "pensamientos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          api_key_hash: string | null
          comunidades: string[]
          created_at: string
          email: string | null
          nombre: string
          rol: string
          user_id: string
        }
        Insert: {
          api_key_hash?: string | null
          comunidades?: string[]
          created_at?: string
          email?: string | null
          nombre: string
          rol: string
          user_id: string
        }
        Update: {
          api_key_hash?: string | null
          comunidades?: string[]
          created_at?: string
          email?: string | null
          nombre?: string
          rol?: string
          user_id?: string
        }
        Relationships: []
      }
      perfiles_permitidos: {
        Row: {
          comunidades: string[]
          email: string
          nombre: string
          rol: string
        }
        Insert: {
          comunidades?: string[]
          email: string
          nombre: string
          rol: string
        }
        Update: {
          comunidades?: string[]
          email?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      piezas: {
        Row: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          comunidad_id?: string
          contenido?: string | null
          created_at?: string
          estado?: string
          etapa_embudo?: string | null
          etiquetas?: string[]
          fecha_objetivo?: string | null
          formato_id?: string | null
          hipotesis_id?: string | null
          id?: string
          id_publico?: string | null
          notas?: string | null
          notion_url?: string | null
          plataforma?: string | null
          programa_aprobado?: boolean
          publicada_en?: string | null
          responsable_id?: string | null
          series?: string[]
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          comunidad_id?: string
          contenido?: string | null
          created_at?: string
          estado?: string
          etapa_embudo?: string | null
          etiquetas?: string[]
          fecha_objetivo?: string | null
          formato_id?: string | null
          hipotesis_id?: string | null
          id?: string
          id_publico?: string | null
          notas?: string | null
          notion_url?: string | null
          plataforma?: string | null
          programa_aprobado?: boolean
          publicada_en?: string | null
          responsable_id?: string | null
          series?: string[]
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "piezas_comunidad_id_fkey"
            columns: ["comunidad_id"]
            isOneToOne: false
            referencedRelation: "comunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_format_card_id_fkey"
            columns: ["formato_id"]
            isOneToOne: false
            referencedRelation: "formatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_hipotesis_id_fkey"
            columns: ["hipotesis_id"]
            isOneToOne: false
            referencedRelation: "hipotesis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recursos: {
        Row: {
          comunidad_id: string | null
          created_at: string
          estado: string
          id: string
          keyword: string | null
          kit_tag_id: string | null
          leads: number | null
          leads_actualizado_en: string | null
          nombre: string
          slug_go: string | null
        }
        Insert: {
          comunidad_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          keyword?: string | null
          kit_tag_id?: string | null
          leads?: number | null
          leads_actualizado_en?: string | null
          nombre: string
          slug_go?: string | null
        }
        Update: {
          comunidad_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          keyword?: string | null
          kit_tag_id?: string | null
          leads?: number | null
          leads_actualizado_en?: string | null
          nombre?: string
          slug_go?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recursos_comunidad_id_fkey"
            columns: ["comunidad_id"]
            isOneToOne: false
            referencedRelation: "comunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      respaldo_20260915_guion_versiones: {
        Row: {
          autor: string | null
          created_at: string | null
          fidelidad: string | null
          guion: string | null
          hipotesis: Json | null
          id: string | null
          instruccion: string | null
          pieza_id: string | null
          spec_visual: string | null
          version: number | null
        }
        Insert: {
          autor?: string | null
          created_at?: string | null
          fidelidad?: string | null
          guion?: string | null
          hipotesis?: Json | null
          id?: string | null
          instruccion?: string | null
          pieza_id?: string | null
          spec_visual?: string | null
          version?: number | null
        }
        Update: {
          autor?: string | null
          created_at?: string | null
          fidelidad?: string | null
          guion?: string | null
          hipotesis?: Json | null
          id?: string | null
          instruccion?: string | null
          pieza_id?: string | null
          spec_visual?: string | null
          version?: number | null
        }
        Relationships: []
      }
      respaldo_20260915_piezas: {
        Row: {
          comunidad_id: string | null
          created_at: string | null
          cta: string | null
          estado: string | null
          etapa_embudo: string | null
          etapa_legado: boolean | null
          fecha_objetivo: string | null
          fidelidad: string | null
          format_card_id: string | null
          formato: string | null
          formato_sugerido: string[] | null
          guion: string | null
          hipotesis: Json | null
          id: string | null
          id_publico: string | null
          idea_id: string | null
          notas: string | null
          notion_url: string | null
          origen: string | null
          plataforma: string | null
          programa_aprobado: boolean | null
          publicada_en: string | null
          requiere_hipotesis: boolean | null
          responsable_id: string | null
          serie: string | null
          spec_visual: string | null
          titulo: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          comunidad_id?: string | null
          created_at?: string | null
          cta?: string | null
          estado?: string | null
          etapa_embudo?: string | null
          etapa_legado?: boolean | null
          fecha_objetivo?: string | null
          fidelidad?: string | null
          format_card_id?: string | null
          formato?: string | null
          formato_sugerido?: string[] | null
          guion?: string | null
          hipotesis?: Json | null
          id?: string | null
          id_publico?: string | null
          idea_id?: string | null
          notas?: string | null
          notion_url?: string | null
          origen?: string | null
          plataforma?: string | null
          programa_aprobado?: boolean | null
          publicada_en?: string | null
          requiere_hipotesis?: boolean | null
          responsable_id?: string | null
          serie?: string | null
          spec_visual?: string | null
          titulo?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          comunidad_id?: string | null
          created_at?: string | null
          cta?: string | null
          estado?: string | null
          etapa_embudo?: string | null
          etapa_legado?: boolean | null
          fecha_objetivo?: string | null
          fidelidad?: string | null
          format_card_id?: string | null
          formato?: string | null
          formato_sugerido?: string[] | null
          guion?: string | null
          hipotesis?: Json | null
          id?: string | null
          id_publico?: string | null
          idea_id?: string | null
          notas?: string | null
          notion_url?: string | null
          origen?: string | null
          plataforma?: string | null
          programa_aprobado?: boolean | null
          publicada_en?: string | null
          requiere_hipotesis?: boolean | null
          responsable_id?: string | null
          serie?: string | null
          spec_visual?: string | null
          titulo?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      respaldo_20260915_tareas: {
        Row: {
          asignado_a: string | null
          checklist: Json | null
          created_at: string | null
          estado: string | null
          hecha_en: string | null
          historia_id: string | null
          id: string | null
          nota_bloqueo: string | null
          pieza_id: string | null
          tipo: string | null
          vence: string | null
        }
        Insert: {
          asignado_a?: string | null
          checklist?: Json | null
          created_at?: string | null
          estado?: string | null
          hecha_en?: string | null
          historia_id?: string | null
          id?: string | null
          nota_bloqueo?: string | null
          pieza_id?: string | null
          tipo?: string | null
          vence?: string | null
        }
        Update: {
          asignado_a?: string | null
          checklist?: Json | null
          created_at?: string | null
          estado?: string | null
          hecha_en?: string | null
          historia_id?: string | null
          id?: string | null
          nota_bloqueo?: string | null
          pieza_id?: string | null
          tipo?: string | null
          vence?: string | null
        }
        Relationships: []
      }
      series: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      sistemas: {
        Row: {
          activo: boolean
          aristas: Json
          cadencia: string
          clave: string
          id: string
          nodos: Json
          nombre: string
          orden: number
          proposito: string | null
          updated_at: string
          version: number
        }
        Insert: {
          activo?: boolean
          aristas?: Json
          cadencia?: string
          clave: string
          id?: string
          nodos?: Json
          nombre: string
          orden?: number
          proposito?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          activo?: boolean
          aristas?: Json
          cadencia?: string
          clave?: string
          id?: string
          nodos?: Json
          nombre?: string
          orden?: number
          proposito?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      sistemas_registrados: {
        Row: {
          activo: boolean
          descripcion: string | null
          esperado_cada: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          descripcion?: string | null
          esperado_cada: string
          nombre: string
        }
        Update: {
          activo?: boolean
          descripcion?: string | null
          esperado_cada?: string
          nombre?: string
        }
        Relationships: []
      }
      tareas: {
        Row: {
          asignado_a: string | null
          created_at: string
          estado: string
          hecha_en: string | null
          historia_id: string | null
          id: string
          nota_bloqueo: string | null
          pieza_id: string | null
          tipo: string
          vence: string | null
        }
        Insert: {
          asignado_a?: string | null
          created_at?: string
          estado?: string
          hecha_en?: string | null
          historia_id?: string | null
          id?: string
          nota_bloqueo?: string | null
          pieza_id?: string | null
          tipo: string
          vence?: string | null
        }
        Update: {
          asignado_a?: string | null
          created_at?: string
          estado?: string
          hecha_en?: string | null
          historia_id?: string | null
          id?: string
          nota_bloqueo?: string | null
          pieza_id?: string | null
          tipo?: string
          vence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tareas_historia_id_fkey"
            columns: ["historia_id"]
            isOneToOne: false
            referencedRelation: "historias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actualizar_hipotesis: {
        Args: {
          p_campo?: string
          p_fecha?: string
          p_hipotesis_id: string
          p_numero?: number
          p_texto?: string
        }
        Returns: {
          campo: string | null
          created_at: string
          estado: string
          fecha: string | null
          id: string
          numero: number | null
          resuelta_en: string | null
          texto: string
          updated_at: string
          veredicto: string | null
        }
        SetofOptions: {
          from: "*"
          to: "hipotesis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aprobar_historias: {
        Args: { p_editor?: string; p_semana: string }
        Returns: number
      }
      asignar_tarea: {
        Args: {
          p_asignado_a: string
          p_historia_id?: string
          p_pieza_id?: string
          p_tipo: string
          p_vence: string
        }
        Returns: {
          asignado_a: string | null
          created_at: string
          estado: string
          hecha_en: string | null
          historia_id: string | null
          id: string
          nota_bloqueo: string | null
          pieza_id: string | null
          tipo: string
          vence: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cambiar_estado_pieza: {
        Args: { p_nuevo_estado: string; p_pieza_id: string }
        Returns: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "piezas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_hipotesis: {
        Args: {
          p_campo: string
          p_fecha: string
          p_numero: number
          p_texto: string
        }
        Returns: {
          campo: string | null
          created_at: string
          estado: string
          fecha: string | null
          id: string
          numero: number | null
          resuelta_en: string | null
          texto: string
          updated_at: string
          veredicto: string | null
        }
        SetofOptions: {
          from: "*"
          to: "hipotesis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_pieza_validada: {
        Args: { payload: Json }
        Returns: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "piezas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cuota_semana: {
        Args: { p_semana: string }
        Returns: {
          en_camino: number
          meta: number
          piezas: Json
          publicadas: number
          tipo: string
        }[]
      }
      declarar_hueco: {
        Args: {
          p_nodo: string
          p_nota: string
          p_semana: string
          p_sistema: string
        }
        Returns: {
          created_at: string
          declarado_por: string | null
          id: string
          nodo_clave: string
          nota: string
          semana: string
          sistema_clave: string
        }
        SetofOptions: {
          from: "*"
          to: "huecos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      definir_sistema: {
        Args: { payload: Json }
        Returns: {
          activo: boolean
          aristas: Json
          cadencia: string
          clave: string
          id: string
          nodos: Json
          nombre: string
          orden: number
          proposito: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "sistemas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      estado_nodos: {
        Args: { p_clave: string; p_semana: string }
        Returns: {
          cuando: string
          detalle: string
          disparador: string
          dueno: string
          estado: string
          hueco_nota: string
          n: number
          nodo_clave: string
          nombre: string
          nota: string
          tipo: string
        }[]
      }
      evidencia_dia: {
        Args: { p_fecha: string; p_perfil: string }
        Returns: Json
      }
      evidencia_hipotesis: {
        Args: { p_hipotesis_id: string }
        Returns: {
          estado: string
          fecha: string
          fuente: string
          id_publico: string
          pieza_id: string
          publicada_en: string
          tipo: string
          titulo: string
          valor: number
        }[]
      }
      evidencia_nodo: {
        Args: { ev: Json; p_semana: string }
        Returns: {
          cuando: string
          detalle: string
          n: number
        }[]
      }
      exigir_rol: { Args: { roles: string[] }; Returns: undefined }
      guardar_contenido: {
        Args: {
          p_autor?: string
          p_contenido: string
          p_instruccion?: string
          p_pieza_id: string
        }
        Returns: {
          autor: string | null
          contenido: string
          created_at: string
          id: string
          instruccion: string | null
          pieza_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "contenido_versiones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_serie: {
        Args: {
          p_activa?: boolean
          p_descripcion?: string
          p_nombre: string
          p_nuevo_nombre?: string
        }
        Returns: {
          activa: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "series"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_url: {
        Args: { p_pieza_id: string; p_plataforma?: string; p_url: string }
        Returns: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "piezas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      latidos: {
        Args: never
        Returns: {
          atrasado: boolean
          esperado_cada: string
          sistema: string
          ultima_corrida: string
          ultimo_estado: string
          ultimo_resumen: string
        }[]
      }
      ligar_hipotesis: {
        Args: { p_hipotesis_id: string; p_pieza_id: string }
        Returns: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "piezas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcar_publicada: {
        Args: { p_pieza_id: string; p_plataforma: string; p_url: string }
        Returns: {
          comunidad_id: string
          contenido: string | null
          created_at: string
          estado: string
          etapa_embudo: string | null
          etiquetas: string[]
          fecha_objetivo: string | null
          formato_id: string | null
          hipotesis_id: string | null
          id: string
          id_publico: string | null
          notas: string | null
          notion_url: string | null
          plataforma: string | null
          programa_aprobado: boolean
          publicada_en: string | null
          responsable_id: string | null
          series: string[]
          tipo: string | null
          titulo: string | null
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "piezas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      multiplicador: {
        Args: { p_min_n?: number; p_pieza_id: string }
        Returns: {
          mediana: number
          multiplicador: number
          n: number
          views: number
        }[]
      }
      perfil_por_api_key: {
        Args: { p_hash: string }
        Returns: {
          api_key_hash: string | null
          comunidades: string[]
          created_at: string
          email: string | null
          nombre: string
          rol: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prefijo_tipo: { Args: { t: string }; Returns: string }
      recalcular_multiplicadores: { Args: never; Returns: number }
      registrar_corrida: {
        Args: {
          p_estado: string
          p_payload?: Json
          p_resumen?: string
          p_sistema: string
        }
        Returns: number
      }
      resolver_hipotesis: {
        Args: { p_estado: string; p_hipotesis_id: string; p_veredicto?: string }
        Returns: {
          campo: string | null
          created_at: string
          estado: string
          fecha: string | null
          id: string
          numero: number | null
          resuelta_en: string | null
          texto: string
          updated_at: string
          veredicto: string | null
        }
        SetofOptions: {
          from: "*"
          to: "hipotesis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resumen_formato: {
        Args: { p_formato_id: string }
        Returns: {
          episodios: number
          follows_totales: number
          multiplicador_promedio: number
          publicadas: number
          views_totales: number
        }[]
      }
      resumen_semana_persona: {
        Args: { p_perfil: string; p_semana: string }
        Returns: {
          archivos: number
          declaraciones: number
          estados: number
          fecha: string
          tareas_hechas: number
        }[]
      }
      resumen_serie: {
        Args: { p_nombre: string }
        Returns: {
          en_produccion: number
          piezas: number
          publicadas: number
          ultima_publicada: string
        }[]
      }
      rol_actual: { Args: never; Returns: string }
      siguiente_id_publico: { Args: { p_prefijo: string }; Returns: string }
      transicion_permitida: {
        Args: { p_a: string; p_de: string; p_rol: string }
        Returns: boolean
      }
      validar_pieza_para_estado: {
        Args: {
          p_estado: string
          p_etapa: string
          p_etiquetas?: string[]
          p_hipotesis_id: string
          p_tipo: string
        }
        Returns: undefined
      }
      views_recientes: { Args: { p_pieza_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]

export type Pieza = Tables<"piezas">
export type Tarea = Tables<"tareas">
export type Historia = Tables<"historias">
export type Perfil = Tables<"perfiles">
export type FormatoCard = Tables<"formatos">
export type Serie = Tables<"series">
export type Hipotesis = Tables<"hipotesis">
export type Asset = Tables<"assets">
export type Comentario = Tables<"comentarios">
export type Recurso = Tables<"recursos">
export type Sistema = Tables<"sistemas">
export type Hueco = Tables<"huecos">
