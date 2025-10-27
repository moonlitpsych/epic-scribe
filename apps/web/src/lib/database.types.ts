/**
 * Supabase Database TypeScript Types
 * Generated from the schema in supabase/migrations/001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
