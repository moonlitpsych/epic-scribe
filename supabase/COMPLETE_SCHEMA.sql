-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.billing_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  npi text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type = ANY (ARRAY['individual'::text, 'organization'::text])),
  taxonomy_code text,
  phone text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_bookable boolean DEFAULT false,
  CONSTRAINT billing_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.claim_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL,
  response_file_id uuid,
  previous_status text,
  new_status text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['submission'::text, '999'::text, '277'::text, '835'::text, 'manual'::text])),
  response_code text,
  response_description text,
  payment_amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT claim_status_events_pkey PRIMARY KEY (id),
  CONSTRAINT claim_status_events_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id),
  CONSTRAINT claim_status_events_response_file_id_fkey FOREIGN KEY (response_file_id) REFERENCES public.edi_response_files(id)
);
CREATE TABLE public.claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intakeq_appointment_id text NOT NULL,
  patient_first_name text NOT NULL,
  patient_last_name text NOT NULL,
  patient_dob date NOT NULL,
  patient_gender text CHECK (patient_gender = ANY (ARRAY['M'::text, 'F'::text, 'U'::text])),
  patient_address_street text,
  patient_address_city text,
  patient_address_state text,
  patient_address_zip text,
  payer_id uuid,
  member_id text NOT NULL,
  group_number text,
  subscriber_name text,
  subscriber_dob date,
  subscriber_relationship text CHECK (subscriber_relationship = ANY (ARRAY['self'::text, 'spouse'::text, 'child'::text, 'other'::text])),
  diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  rendering_provider_npi text NOT NULL,
  billing_provider_npi text NOT NULL,
  total_charge numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  submitted_at timestamp with time zone,
  edi_filename text,
  edi_content text,
  submission_error text,
  control_number text,
  payer_claim_number text,
  acknowledgment_date timestamp with time zone,
  accepted_date timestamp with time zone,
  rejected_date timestamp with time zone,
  paid_date timestamp with time zone,
  paid_amount numeric,
  rejection_reason text,
  rejection_codes ARRAY,
  submission_source text DEFAULT 'moonlit'::text CHECK (submission_source = ANY (ARRAY['moonlit'::text, 'intakeq'::text, 'manual'::text, 'unknown'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_status_check timestamp with time zone,
  denial_reason text,
  denial_codes jsonb,
  check_number text,
  check_date date,
  last_edi_file text,
  CONSTRAINT claims_pkey PRIMARY KEY (id),
  CONSTRAINT claims_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.payers(id)
);
CREATE TABLE public.claims_external (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  control_number text,
  payer_claim_number text UNIQUE,
  patient_name text NOT NULL,
  charge_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  date_of_service text,
  status text NOT NULL DEFAULT 'unknown'::text,
  source text NOT NULL DEFAULT 'intakeq'::text,
  intakeq_appointment_id text,
  payer_name text,
  payer_id text,
  denial_reason text,
  denial_codes jsonb,
  check_number text,
  check_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_edi_file text,
  last_edi_date timestamp with time zone,
  CONSTRAINT claims_external_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cm_group_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  session_name text NOT NULL,
  pod_name text NOT NULL,
  session_date date NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  billable_units integer,
  status text DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'billed'::text])),
  attendees ARRAY,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cm_group_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT cm_group_sessions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.cm_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  activity_tokens integer DEFAULT 0 CHECK (activity_tokens >= 0),
  cash_balance numeric DEFAULT 0.00 CHECK (cash_balance >= 0::numeric),
  total_points integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  groups_attended integer DEFAULT 0,
  last_activity_date timestamp with time zone,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'graduated'::text, 'inactive'::text])),
  enrollment_date date DEFAULT CURRENT_DATE,
  pod_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cm_patients_pkey PRIMARY KEY (id),
  CONSTRAINT cm_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.cm_points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cm_patient_id uuid NOT NULL,
  points integer,
  tokens integer,
  cash numeric,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['token_earned'::text, 'cash_won'::text, 'cash_redeemed'::text, 'token_spent'::text])),
  reason text NOT NULL,
  reason_code text CHECK (reason_code = ANY (ARRAY['group_attendance'::text, 'negative_uds'::text, 'weekly_checkin'::text, 'bonus'::text, 'roulette_win'::text, 'milestone'::text, 'roulette_spin'::text])),
  awarded_by uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cm_points_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT cm_points_transactions_cm_patient_id_fkey FOREIGN KEY (cm_patient_id) REFERENCES public.cm_patients(id),
  CONSTRAINT cm_points_transactions_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES auth.users(id)
);
CREATE TABLE public.edi_response_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename text NOT NULL UNIQUE,
  file_type text NOT NULL CHECK (file_type = ANY (ARRAY['999'::text, '277'::text, '835'::text])),
  file_content text,
  processing_status text DEFAULT 'pending'::text CHECK (processing_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])),
  processing_error text,
  claims_matched integer DEFAULT 0,
  claims_updated integer DEFAULT 0,
  downloaded_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT edi_response_files_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  recipient_email character varying NOT NULL,
  email_type character varying NOT NULL,
  subject text,
  status character varying NOT NULL,
  error_message text,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.questionnaire_sessions(id)
);
CREATE TABLE public.encounters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  calendar_event_id text NOT NULL UNIQUE,
  setting text NOT NULL,
  visit_type text NOT NULL,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  meet_link text,
  transcript_file_id text,
  transcript_indexed_at timestamp with time zone,
  status text DEFAULT 'scheduled'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT encounters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.generated_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  encounter_id uuid,
  template_id text NOT NULL,
  prompt_version text NOT NULL,
  prompt_hash text NOT NULL,
  drive_file_id text,
  generated_at timestamp with time zone DEFAULT now(),
  edited boolean DEFAULT false,
  final_note_content text,
  is_final boolean DEFAULT false,
  finalized_at timestamp with time zone,
  finalized_by text,
  generated_content text,
  CONSTRAINT generated_notes_pkey PRIMARY KEY (id),
  CONSTRAINT generated_notes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob date NOT NULL,
  medicaid_id text UNIQUE,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payer_name_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  intakeq_carrier_name text NOT NULL,
  payer_id uuid,
  confidence text DEFAULT 'manual'::text CHECK (confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text, 'manual'::text])),
  match_count integer DEFAULT 0,
  last_matched_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payer_name_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT payer_name_mappings_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.payers(id)
);
CREATE TABLE public.payers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  office_ally_payer_id text,
  oa_professional_837p_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  role text DEFAULT 'cpss'::text CHECK (role = ANY (ARRAY['cpss'::text, 'admin'::text])),
  assigned_pods ARRAY,
  active_patients integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.questionnaire_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  question_number integer NOT NULL CHECK (question_number >= 1 AND question_number <= 18),
  question_text text NOT NULL,
  response_value integer NOT NULL CHECK (response_value >= 0 AND response_value <= 4),
  response_text character varying NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT questionnaire_responses_pkey PRIMARY KEY (id),
  CONSTRAINT questionnaire_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.questionnaire_sessions(id)
);
CREATE TABLE public.questionnaire_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  part_a_score integer NOT NULL,
  part_a_positive boolean NOT NULL,
  total_score integer NOT NULL,
  severity character varying NOT NULL CHECK (severity::text = ANY (ARRAY['minimal'::character varying, 'mild'::character varying, 'moderate'::character varying, 'severe'::character varying]::text[])),
  clinician_notified boolean DEFAULT false,
  notification_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  questionnaire_type character varying DEFAULT 'ASRS'::character varying,
  scores jsonb,
  CONSTRAINT questionnaire_results_pkey PRIMARY KEY (id),
  CONSTRAINT questionnaire_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.questionnaire_sessions(id)
);
CREATE TABLE public.questionnaire_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unique_id character varying NOT NULL UNIQUE,
  patient_name character varying NOT NULL,
  patient_email character varying NOT NULL,
  patient_dob date,
  phone_number character varying,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'expired'::character varying]::text[])),
  clinician_email character varying NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  questionnaire_type character varying DEFAULT 'ASRS'::character varying,
  CONSTRAINT questionnaire_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_questionnaire_type FOREIGN KEY (questionnaire_type) REFERENCES public.questionnaire_types(code)
);
CREATE TABLE public.questionnaire_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  total_questions integer NOT NULL,
  scoring_type character varying DEFAULT 'standard'::character varying,
  max_score integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT questionnaire_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.smartlist_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  smartlist_id uuid,
  selected_value text NOT NULL,
  context text,
  encounter_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smartlist_values_pkey PRIMARY KEY (id),
  CONSTRAINT smartlist_values_smartlist_id_fkey FOREIGN KEY (smartlist_id) REFERENCES public.smartlists(id),
  CONSTRAINT smartlist_values_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id)
);
CREATE TABLE public.smartlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  identifier text NOT NULL UNIQUE,
  epic_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  group_name text,
  options jsonb NOT NULL,
  metadata jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smartlists_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  phone_number character varying NOT NULL,
  message_content text NOT NULL,
  status character varying NOT NULL,
  error_message text,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.questionnaire_sessions(id)
);
CREATE TABLE public.template_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  section_name text,
  old_content text,
  new_content text,
  edited_by text,
  edit_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_edits_pkey PRIMARY KEY (id),
  CONSTRAINT template_edits_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id)
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id text NOT NULL UNIQUE,
  name text NOT NULL,
  setting text NOT NULL,
  visit_type text NOT NULL,
  version integer DEFAULT 1,
  sections jsonb NOT NULL,
  smarttools jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  staffing_config jsonb,
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);