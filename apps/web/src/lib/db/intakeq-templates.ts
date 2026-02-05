/**
 * IntakeQ Templates Database Operations
 *
 * Functions for loading and managing IntakeQ template configurations.
 * These templates define how Epic Scribe sections map to IntakeQ form fields.
 */

import { getSupabaseClient } from '../supabase';
import type { IntakeQFieldMapping, IntakeQFieldType } from '@epic-scribe/intakeq-playwright';

// ============================================================
// Types
// ============================================================

export interface IntakeQTemplate {
  id: string;
  name: string;
  template_type: 'intake' | 'progress';
  provider_id: string | null;
  total_contenteditable_fields: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntakeQTemplateField {
  id: string;
  template_id: string;
  epic_scribe_section: string;
  intakeq_section_number: number;
  field_type: IntakeQFieldType;
  contenteditable_index: number | null;
  intakeq_question_text: string | null;
  placeholder: string | null;
  alternate_names: string[] | null;
  sort_order: number;
  created_at: string;
}

export interface IntakeQTemplateWithFields extends IntakeQTemplate {
  fields: IntakeQTemplateField[];
}

// ============================================================
// Template Lookup
// ============================================================

/**
 * Get all active templates
 */
export async function getAllTemplates(): Promise<IntakeQTemplate[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('[Templates] Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }

  return data;
}

/**
 * Get template by name
 */
export async function getTemplateByName(name: string): Promise<IntakeQTemplateWithFields | null> {
  const supabase = getSupabaseClient(true);

  const { data: template, error } = await supabase
    .from('intakeq_templates')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Templates] Error fetching template:', error);
    throw new Error('Failed to fetch template');
  }

  // Get the fields for this template
  const { data: fields, error: fieldsError } = await supabase
    .from('intakeq_template_fields')
    .select('*')
    .eq('template_id', template.id)
    .order('sort_order');

  if (fieldsError) {
    console.error('[Templates] Error fetching template fields:', fieldsError);
    throw new Error('Failed to fetch template fields');
  }

  return {
    ...template,
    fields: fields || [],
  };
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<IntakeQTemplateWithFields | null> {
  const supabase = getSupabaseClient(true);

  const { data: template, error } = await supabase
    .from('intakeq_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Templates] Error fetching template:', error);
    throw new Error('Failed to fetch template');
  }

  // Get the fields for this template
  const { data: fields, error: fieldsError } = await supabase
    .from('intakeq_template_fields')
    .select('*')
    .eq('template_id', template.id)
    .order('sort_order');

  if (fieldsError) {
    console.error('[Templates] Error fetching template fields:', fieldsError);
    throw new Error('Failed to fetch template fields');
  }

  return {
    ...template,
    fields: fields || [],
  };
}

/**
 * Get templates for a specific provider (includes shared templates)
 */
export async function getTemplatesForProvider(providerId: string): Promise<IntakeQTemplate[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_templates')
    .select('*')
    .eq('is_active', true)
    .or(`provider_id.eq.${providerId},provider_id.is.null`)
    .order('name');

  if (error) {
    console.error('[Templates] Error fetching templates for provider:', error);
    throw new Error('Failed to fetch templates');
  }

  return data;
}

// ============================================================
// Field Mapping Conversion
// ============================================================

/**
 * Convert database template fields to IntakeQFieldMapping format
 * This format is used by the intakeq-playwright note-mapper
 */
export function convertToFieldMappings(fields: IntakeQTemplateField[]): IntakeQFieldMapping[] {
  return fields.map((field) => ({
    epicScribeSection: field.epic_scribe_section,
    intakeQSectionNumber: field.intakeq_section_number,
    intakeQQuestionText: field.intakeq_question_text || field.epic_scribe_section,
    fieldType: field.field_type,
    placeholder: field.placeholder || undefined,
    alternateNames: field.alternate_names || undefined,
  }));
}

/**
 * Build section-to-contenteditable-index mapping for automation
 * This maps IntakeQ section numbers to their contenteditable element index
 */
export function buildSectionToEditableIndex(
  fields: IntakeQTemplateField[]
): Record<number, number> {
  const mapping: Record<number, number> = {};

  for (const field of fields) {
    if (field.field_type === 'contenteditable' && field.contenteditable_index !== null) {
      mapping[field.intakeq_section_number] = field.contenteditable_index;
    }
  }

  return mapping;
}

/**
 * Get field mappings for a template by name
 * Returns the mappings in the format expected by note-mapper
 */
export async function getFieldMappingsForTemplate(
  templateName: string
): Promise<IntakeQFieldMapping[] | null> {
  const template = await getTemplateByName(templateName);

  if (!template) {
    return null;
  }

  return convertToFieldMappings(template.fields);
}

// ============================================================
// Template Management (Admin)
// ============================================================

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<IntakeQTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<IntakeQTemplate> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('[Templates] Error creating template:', error);
    throw new Error('Failed to create template');
  }

  return data;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<IntakeQTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<IntakeQTemplate> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Templates] Error updating template:', error);
    throw new Error('Failed to update template');
  }

  return data;
}

/**
 * Add a field to a template
 */
export async function addTemplateField(
  field: Omit<IntakeQTemplateField, 'id' | 'created_at'>
): Promise<IntakeQTemplateField> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_template_fields')
    .insert(field)
    .select()
    .single();

  if (error) {
    console.error('[Templates] Error adding template field:', error);
    throw new Error('Failed to add template field');
  }

  return data;
}

/**
 * Update a template field
 */
export async function updateTemplateField(
  id: string,
  updates: Partial<Omit<IntakeQTemplateField, 'id' | 'created_at'>>
): Promise<IntakeQTemplateField> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('intakeq_template_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Templates] Error updating template field:', error);
    throw new Error('Failed to update template field');
  }

  return data;
}

/**
 * Delete a template field
 */
export async function deleteTemplateField(id: string): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('intakeq_template_fields')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Templates] Error deleting template field:', error);
    throw new Error('Failed to delete template field');
  }
}

/**
 * Bulk upsert template fields
 */
export async function upsertTemplateFields(
  templateId: string,
  fields: Array<Omit<IntakeQTemplateField, 'id' | 'created_at' | 'template_id'>>
): Promise<IntakeQTemplateField[]> {
  const supabase = getSupabaseClient(true);

  // Delete existing fields for this template
  await supabase
    .from('intakeq_template_fields')
    .delete()
    .eq('template_id', templateId);

  // Insert new fields
  const fieldsWithTemplateId = fields.map((f) => ({
    ...f,
    template_id: templateId,
  }));

  const { data, error } = await supabase
    .from('intakeq_template_fields')
    .insert(fieldsWithTemplateId)
    .select();

  if (error) {
    console.error('[Templates] Error upserting template fields:', error);
    throw new Error('Failed to upsert template fields');
  }

  return data;
}
