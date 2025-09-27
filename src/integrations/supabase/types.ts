export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_models_main: {
        Row: {
          id: number
          inference_provider: string | null
          model_provider: string | null
          human_readable_name: string | null
          model_provider_country: string | null
          official_url: string | null
          input_modalities: string | null
          output_modalities: string | null
          license_name: string | null
          license_url: string | null
          license_info_text: string | null
          license_info_url: string | null
          rate_limits: string | null
          provider_api_access: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          inference_provider?: string | null
          model_provider?: string | null
          human_readable_name?: string | null
          model_provider_country?: string | null
          official_url?: string | null
          input_modalities?: string | null
          output_modalities?: string | null
          license_name?: string | null
          license_url?: string | null
          license_info_text?: string | null
          license_info_url?: string | null
          rate_limits?: string | null
          provider_api_access?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          inference_provider?: string | null
          model_provider?: string | null
          human_readable_name?: string | null
          model_provider_country?: string | null
          official_url?: string | null
          input_modalities?: string | null
          output_modalities?: string | null
          license_name?: string | null
          license_url?: string | null
          license_info_text?: string | null
          license_info_url?: string | null
          rate_limits?: string | null
          provider_api_access?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}