// Types for Designated Examiner Court Presentations

export interface DEPresentationDemographics {
  age: string;
  sex: string;
  psychiatric_diagnoses: string;
}

export interface DEPresentationAdmission {
  reason: string;
  commitment_reason: string;
}

export interface DEPresentationHistory {
  previous_admissions: string;
  suicide_attempts: string;
  violence_history: string;
  substance_use: string;
  social_history: string;
}

export interface DEPresentationHospitalCourse {
  improvement: string;
  medication_compliance: string;
  special_interventions: string;
  activities: string;
}

export interface DEPresentationInterviewObjective {
  thought_process: string;
  orientation: string;
}

export interface DEPresentationInterviewSubjective {
  insight: string;
  follow_up_plan: string;
}

export interface DEPresentationInterview {
  objective: DEPresentationInterviewObjective;
  subjective: DEPresentationInterviewSubjective;
}

export interface DEPresentationMedications {
  prior: string[];
  current: string[];
}

export interface DECriteriaEvidence {
  criterion_1: string;
  criterion_2: string;
  criterion_3: string;
  criterion_4: string;
  criterion_5: string;
}

export interface DEPresentationData {
  one_liner: string;
  demographics: DEPresentationDemographics;
  admission: DEPresentationAdmission;
  initial_presentation: string;
  relevant_history: DEPresentationHistory;
  medications: DEPresentationMedications;
  hospital_course: DEPresentationHospitalCourse;
  interview: DEPresentationInterview;
  criteria_evidence: DECriteriaEvidence;
}

export interface DECriteriaAssessment {
  meets_criterion_1: boolean;
  meets_criterion_2: boolean;
  meets_criterion_3: boolean;
  meets_criterion_4: boolean;
  meets_criterion_5: boolean;
}

export type PresentationStatus = 'draft' | 'ready' | 'presented' | 'archived';

export interface DEPresentation {
  id: string;
  patient_id?: string;
  encounter_id?: string;
  patient_name?: string;
  hearing_date?: string;
  commitment_type?: '30-day' | '60-day' | '90-day';
  hospital?: string;
  transcript?: string;
  cheat_sheet_notes?: string;
  clinical_notes?: string;
  generated_argument?: string;
  final_argument?: string;
  presentation_data?: DEPresentationData;
  presentation_status: PresentationStatus;
  last_edited_section?: string;
  ai_enhanced_sections?: string[];
  export_settings?: ExportSettings;
  criteria_assessment?: DECriteriaAssessment;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  finalized_by?: string;
}

export interface ExportSettings {
  include_header?: boolean;
  header_text?: string;
  font_size?: 'small' | 'medium' | 'large';
  include_criteria?: boolean;
  include_signature_line?: boolean;
  page_orientation?: 'portrait' | 'landscape';
}

export interface DEPresentationTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template_data: Partial<DEPresentationData>;
  commitment_type?: '30-day' | '60-day' | '90-day';
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface SectionEnhanceRequest {
  section: keyof DEPresentationData;
  transcript: string;
  existing_data?: Partial<DEPresentationData>;
  context?: {
    clinical_notes?: string;
    cheat_sheet_notes?: string;
  };
}

export interface SectionEnhanceResponse {
  section: keyof DEPresentationData;
  enhanced_content: any; // Will be typed based on section
  confidence: number;
  suggestions?: string[];
}

// Utah Commitment Criteria with labels
export const UTAH_CRITERIA = {
  criterion_1: {
    label: 'Has mental illness',
    full: 'The individual has a mental illness',
  },
  criterion_2: {
    label: 'Danger or inability to care',
    full: 'Poses substantial danger to self/others or lacks ability to care for basic needs',
  },
  criterion_3: {
    label: 'Lacks capacity',
    full: 'Lacks the capacity to make rational treatment decisions',
  },
  criterion_4: {
    label: 'Least restrictive',
    full: 'Hospitalization is the least restrictive appropriate treatment alternative',
  },
  criterion_5: {
    label: 'LMHA can treat',
    full: 'Local Mental Health Authority can provide adequate and appropriate treatment',
  },
} as const;

// Section metadata for UI
export const PRESENTATION_SECTIONS = {
  one_liner: {
    title: 'Patient One-Liner',
    placeholder: 'Brief summary: e.g., "32-year-old male with schizophrenia admitted for command auditory hallucinations to harm others"',
    aiEnhanceable: true,
  },
  demographics: {
    title: 'Demographics & Diagnoses',
    aiEnhanceable: true,
  },
  admission: {
    title: 'Admission & Commitment',
    aiEnhanceable: true,
  },
  initial_presentation: {
    title: 'Initial Presentation',
    subtitle: 'Past 2-4 weeks journey from home to admission',
    aiEnhanceable: true,
  },
  relevant_history: {
    title: 'Relevant History',
    aiEnhanceable: true,
  },
  medications: {
    title: 'Medications',
    aiEnhanceable: true,
  },
  hospital_course: {
    title: 'Hospital Course',
    aiEnhanceable: true,
  },
  interview: {
    title: 'Patient Interview',
    aiEnhanceable: true,
  },
  criteria_evidence: {
    title: 'Utah Criteria Evidence',
    aiEnhanceable: false,
  },
} as const;

// Export format types
export type ExportFormat = 'pdf' | 'speaking-notes' | 'screen-reference';

export interface ExportOptions {
  format: ExportFormat;
  presentation_id: string;
  settings?: ExportSettings;
}

// Helper type for section keys
export type PresentationSectionKey = keyof typeof PRESENTATION_SECTIONS;