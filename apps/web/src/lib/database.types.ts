/**
 * Database type definitions for Supabase
 *
 * These types match the schema defined in supabase/migrations/001_initial_schema.sql
 * In production, you can generate these automatically using:
 * npx supabase gen types typescript --project-id <project-id> > database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string; // ISO date string
          mrn: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
          mrn?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string;
          mrn?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      encounters: {
        Row: {
          id: string;
          patient_id: string;
          calendar_event_id: string;
          setting: string;
          visit_type: string;
          scheduled_start: string;
          scheduled_end: string;
          meet_link: string | null;
          transcript_file_id: string | null;
          transcript_indexed_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          calendar_event_id: string;
          setting: string;
          visit_type: string;
          scheduled_start: string;
          scheduled_end: string;
          meet_link?: string | null;
          transcript_file_id?: string | null;
          transcript_indexed_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          calendar_event_id?: string;
          setting?: string;
          visit_type?: string;
          scheduled_start?: string;
          scheduled_end?: string;
          meet_link?: string | null;
          transcript_file_id?: string | null;
          transcript_indexed_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          setting: string;
          visit_type: string;
          version: number;
          sections: Array<{
            order: number;
            name: string;
            content: string;
            exemplar?: string;
          }>;
          smarttools: Array<{
            type: string;
            identifier: string;
            placeholder: string;
            description: string;
            smartListId?: string;
          }> | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          setting: string;
          visit_type: string;
          version?: number;
          sections: Array<{
            order: number;
            name: string;
            content: string;
            exemplar?: string;
          }>;
          smarttools?: Array<{
            type: string;
            identifier: string;
            placeholder: string;
            description: string;
            smartListId?: string;
          }> | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          setting?: string;
          visit_type?: string;
          version?: number;
          sections?: Array<{
            order: number;
            name: string;
            content: string;
            exemplar?: string;
          }>;
          smarttools?: Array<{
            type: string;
            identifier: string;
            placeholder: string;
            description: string;
            smartListId?: string;
          }> | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      smartlists: {
        Row: {
          id: string;
          identifier: string;
          epic_id: string;
          display_name: string;
          group_name: string | null;
          options: Array<{
            value: string;
            order: number;
            is_default?: boolean;
          }>;
          metadata: Record<string, any> | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          epic_id: string;
          display_name: string;
          group_name?: string | null;
          options: Array<{
            value: string;
            order: number;
            is_default?: boolean;
          }>;
          metadata?: Record<string, any> | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          epic_id?: string;
          display_name?: string;
          group_name?: string | null;
          options?: Array<{
            value: string;
            order: number;
            is_default?: boolean;
          }>;
          metadata?: Record<string, any> | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      smartlist_values: {
        Row: {
          id: string;
          smartlist_id: string;
          selected_value: string;
          context: string | null;
          encounter_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          smartlist_id: string;
          selected_value: string;
          context?: string | null;
          encounter_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          smartlist_id?: string;
          selected_value?: string;
          context?: string | null;
          encounter_id?: string | null;
          created_at?: string;
        };
      };
      generated_notes: {
        Row: {
          id: string;
          encounter_id: string;
          template_id: string;
          prompt_version: string;
          prompt_hash: string;
          drive_file_id: string | null;
          generated_at: string;
          edited: boolean;
        };
        Insert: {
          id?: string;
          encounter_id: string;
          template_id: string;
          prompt_version: string;
          prompt_hash: string;
          drive_file_id?: string | null;
          generated_at?: string;
          edited?: boolean;
        };
        Update: {
          id?: string;
          encounter_id?: string;
          template_id?: string;
          prompt_version?: string;
          prompt_hash?: string;
          drive_file_id?: string | null;
          generated_at?: string;
          edited?: boolean;
        };
      };
      template_edits: {
        Row: {
          id: string;
          template_id: string;
          section_name: string | null;
          old_content: string | null;
          new_content: string | null;
          edited_by: string | null;
          edit_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          section_name?: string | null;
          old_content?: string | null;
          new_content?: string | null;
          edited_by?: string | null;
          edit_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          section_name?: string | null;
          old_content?: string | null;
          new_content?: string | null;
          edited_by?: string | null;
          edit_reason?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      // You can add view types here if needed
    };
    Functions: {
      // You can add function types here if needed
    };
    Enums: {
      // You can add enum types here if needed
    };
  };
}

// Helper type exports for convenience
export type Patient = Database['public']['Tables']['patients']['Row'];
export type NewPatient = Database['public']['Tables']['patients']['Insert'];
export type UpdatePatient = Database['public']['Tables']['patients']['Update'];

export type Encounter = Database['public']['Tables']['encounters']['Row'];
export type NewEncounter = Database['public']['Tables']['encounters']['Insert'];
export type UpdateEncounter = Database['public']['Tables']['encounters']['Update'];

export type Template = Database['public']['Tables']['templates']['Row'];
export type NewTemplate = Database['public']['Tables']['templates']['Insert'];
export type UpdateTemplate = Database['public']['Tables']['templates']['Update'];

export type SmartList = Database['public']['Tables']['smartlists']['Row'];
export type NewSmartList = Database['public']['Tables']['smartlists']['Insert'];
export type UpdateSmartList = Database['public']['Tables']['smartlists']['Update'];

export type SmartListValue = Database['public']['Tables']['smartlist_values']['Row'];
export type NewSmartListValue = Database['public']['Tables']['smartlist_values']['Insert'];

export type GeneratedNote = Database['public']['Tables']['generated_notes']['Row'];
export type NewGeneratedNote = Database['public']['Tables']['generated_notes']['Insert'];

export type TemplateEdit = Database['public']['Tables']['template_edits']['Row'];
export type NewTemplateEdit = Database['public']['Tables']['template_edits']['Insert'];