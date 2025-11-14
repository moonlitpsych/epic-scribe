import { createClient } from '@supabase/supabase-js';
import type {
  DEPresentation,
  DEPresentationData,
  DECriteriaAssessment,
  DEPresentationTemplate,
  PresentationStatus
} from '@/types/designated-examiner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============ Presentation CRUD Operations ============

export async function createPresentation(params: {
  userId: string;
  patientName?: string;
  hearingDate?: string;
  commitmentType?: string;
  hospital?: string;
  presentationData: DEPresentationData;
  criteriaAssessment?: DECriteriaAssessment;
  transcript?: string;
  cheatSheetNotes?: string;
  clinicalNotes?: string;
}): Promise<DEPresentation> {
  const {
    userId,
    patientName,
    hearingDate,
    commitmentType,
    hospital,
    presentationData,
    criteriaAssessment,
    transcript,
    cheatSheetNotes,
    clinicalNotes
  } = params;

  const { data, error } = await supabase
    .from('designated_examiner_reports')
    .insert({
      patient_name: patientName,
      hearing_date: hearingDate,
      commitment_type: commitmentType || '30-day',
      hospital: hospital || 'Huntsman Mental Health Institute',
      presentation_data: presentationData,
      presentation_status: 'draft',
      transcript,
      cheat_sheet_notes: cheatSheetNotes,
      clinical_notes: clinicalNotes,
      meets_criterion_1: criteriaAssessment?.meets_criterion_1 || false,
      meets_criterion_2: criteriaAssessment?.meets_criterion_2 || false,
      meets_criterion_3: criteriaAssessment?.meets_criterion_3 || false,
      meets_criterion_4: criteriaAssessment?.meets_criterion_4 || false,
      meets_criterion_5: criteriaAssessment?.meets_criterion_5 || false,
      finalized_by: userId
    })
    .select()
    .single();

  if (error) {
    console.error('[createPresentation] Error:', error);
    throw error;
  }

  return mapDbToPresentation(data);
}

export async function updatePresentation(params: {
  presentationId: string;
  userId: string;
  patientName?: string;
  hearingDate?: string;
  commitmentType?: string;
  hospital?: string;
  presentationData?: DEPresentationData;
  criteriaAssessment?: DECriteriaAssessment;
  presentationStatus?: PresentationStatus;
  lastEditedSection?: string;
  aiEnhancedSections?: string[];
}): Promise<DEPresentation> {
  const {
    presentationId,
    userId,
    patientName,
    hearingDate,
    commitmentType,
    hospital,
    presentationData,
    criteriaAssessment,
    presentationStatus,
    lastEditedSection,
    aiEnhancedSections
  } = params;

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (patientName !== undefined) updateData.patient_name = patientName;
  if (hearingDate !== undefined) updateData.hearing_date = hearingDate;
  if (commitmentType !== undefined) updateData.commitment_type = commitmentType;
  if (hospital !== undefined) updateData.hospital = hospital;
  if (presentationData !== undefined) updateData.presentation_data = presentationData;
  if (presentationStatus !== undefined) updateData.presentation_status = presentationStatus;
  if (lastEditedSection !== undefined) updateData.last_edited_section = lastEditedSection;
  if (aiEnhancedSections !== undefined) updateData.ai_enhanced_sections = aiEnhancedSections;

  // Update criteria assessment if provided
  if (criteriaAssessment) {
    updateData.meets_criterion_1 = criteriaAssessment.meets_criterion_1;
    updateData.meets_criterion_2 = criteriaAssessment.meets_criterion_2;
    updateData.meets_criterion_3 = criteriaAssessment.meets_criterion_3;
    updateData.meets_criterion_4 = criteriaAssessment.meets_criterion_4;
    updateData.meets_criterion_5 = criteriaAssessment.meets_criterion_5;
  }

  const { data, error } = await supabase
    .from('designated_examiner_reports')
    .update(updateData)
    .eq('id', presentationId)
    .eq('finalized_by', userId) // Ensure user owns this presentation
    .select()
    .single();

  if (error) {
    console.error('[updatePresentation] Error:', error);
    throw error;
  }

  return mapDbToPresentation(data);
}

export async function getPresentation(presentationId: string, userId: string): Promise<DEPresentation | null> {
  const { data, error } = await supabase
    .from('designated_examiner_reports')
    .select('*')
    .eq('id', presentationId)
    .eq('finalized_by', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('[getPresentation] Error:', error);
    throw error;
  }

  return mapDbToPresentation(data);
}

export async function getUserPresentations(userId: string): Promise<DEPresentation[]> {
  const { data, error } = await supabase
    .from('designated_examiner_reports')
    .select('*')
    .eq('finalized_by', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[getUserPresentations] Error:', error);
    throw error;
  }

  return data.map(mapDbToPresentation);
}

export async function deletePresentation(presentationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('designated_examiner_reports')
    .delete()
    .eq('id', presentationId)
    .eq('finalized_by', userId);

  if (error) {
    console.error('[deletePresentation] Error:', error);
    throw error;
  }

  return true;
}

// ============ Template Operations ============

export async function createTemplate(params: {
  userId: string;
  name: string;
  description?: string;
  templateData: Partial<DEPresentationData>;
  commitmentType?: string;
  isDefault?: boolean;
}): Promise<DEPresentationTemplate> {
  const { userId, name, description, templateData, commitmentType, isDefault } = params;

  // If setting as default, unset other defaults for this user
  if (isDefault) {
    await supabase
      .from('de_presentation_templates')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('de_presentation_templates')
    .insert({
      user_id: userId,
      name,
      description,
      template_data: templateData,
      commitment_type: commitmentType,
      is_default: isDefault || false
    })
    .select()
    .single();

  if (error) {
    console.error('[createTemplate] Error:', error);
    throw error;
  }

  return data as DEPresentationTemplate;
}

export async function getUserTemplates(userId: string): Promise<DEPresentationTemplate[]> {
  const { data, error } = await supabase
    .from('de_presentation_templates')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUserTemplates] Error:', error);
    throw error;
  }

  return data as DEPresentationTemplate[];
}

export async function updateTemplateUsage(templateId: string, userId: string): Promise<void> {
  await supabase
    .from('de_presentation_templates')
    .update({
      usage_count: supabase.raw('usage_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .eq('user_id', userId);
}

export async function deleteTemplate(templateId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('de_presentation_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) {
    console.error('[deleteTemplate] Error:', error);
    throw error;
  }

  return true;
}

// ============ Helper Functions ============

function mapDbToPresentation(dbRow: any): DEPresentation {
  return {
    id: dbRow.id,
    patient_id: dbRow.patient_id,
    encounter_id: dbRow.encounter_id,
    patient_name: dbRow.patient_name,
    hearing_date: dbRow.hearing_date,
    commitment_type: dbRow.commitment_type,
    hospital: dbRow.hospital,
    transcript: dbRow.transcript,
    cheat_sheet_notes: dbRow.cheat_sheet_notes,
    clinical_notes: dbRow.clinical_notes,
    generated_argument: dbRow.generated_argument,
    final_argument: dbRow.final_argument,
    presentation_data: dbRow.presentation_data,
    presentation_status: dbRow.presentation_status || 'draft',
    last_edited_section: dbRow.last_edited_section,
    ai_enhanced_sections: dbRow.ai_enhanced_sections,
    export_settings: dbRow.export_settings,
    criteria_assessment: {
      meets_criterion_1: dbRow.meets_criterion_1 || false,
      meets_criterion_2: dbRow.meets_criterion_2 || false,
      meets_criterion_3: dbRow.meets_criterion_3 || false,
      meets_criterion_4: dbRow.meets_criterion_4 || false,
      meets_criterion_5: dbRow.meets_criterion_5 || false,
    },
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
    finalized_at: dbRow.finalized_at,
    finalized_by: dbRow.finalized_by
  };
}

// ============ Search and Filter ============

export async function searchPresentations(params: {
  userId: string;
  searchTerm?: string;
  status?: PresentationStatus;
  startDate?: string;
  endDate?: string;
}): Promise<DEPresentation[]> {
  const { userId, searchTerm, status, startDate, endDate } = params;

  let query = supabase
    .from('designated_examiner_reports')
    .select('*')
    .eq('finalized_by', userId);

  if (searchTerm) {
    query = query.ilike('patient_name', `%${searchTerm}%`);
  }

  if (status) {
    query = query.eq('presentation_status', status);
  }

  if (startDate) {
    query = query.gte('hearing_date', startDate);
  }

  if (endDate) {
    query = query.lte('hearing_date', endDate);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    console.error('[searchPresentations] Error:', error);
    throw error;
  }

  return data.map(mapDbToPresentation);
}