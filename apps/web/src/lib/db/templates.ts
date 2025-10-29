/**
 * Template Database Service
 *
 * Handles all Template CRUD operations with Supabase.
 * Migrates from in-memory storage to persistent database.
 */

import { supabase } from '../supabase';
import { Template, NewTemplate, UpdateTemplate, NewTemplateEdit } from '../database.types';

export interface TemplateSection {
  order: number;
  name: string;
  content: string;
  exemplar?: string;
}

export interface SmartTool {
  type: string;
  identifier: string;
  placeholder: string;
  description: string;
  smartListId?: string;
}

/**
 * Get all active templates
 */
export async function getAllTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('active', true)
    .order('setting', { ascending: true })
    .order('visit_type', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get templates by setting and visit type
 */
export async function getTemplateBySettingAndVisitType(
  setting: string,
  visitType: string
): Promise<Template | null> {
  // Handle Redwood's "Consultation Visit" alias for "Intake"
  let normalizedVisitType = visitType;
  if (setting === 'Redwood Clinic MHI' && visitType === 'Consultation Visit') {
    normalizedVisitType = 'Intake';
  }

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('setting', setting)
    .eq('visit_type', normalizedVisitType)
    .eq('active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching template:', error);
    throw error;
  }

  return data;
}

/**
 * Get template by template_id
 */
export async function getTemplateById(templateId: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('template_id', templateId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching template:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new template
 */
export async function createTemplate(template: NewTemplate): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, updates: UpdateTemplate): Promise<Template> {
  // First get the current template for comparison
  const { data: currentTemplate } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  // Update the template
  const { data, error } = await supabase
    .from('templates')
    .update({
      ...updates,
      version: currentTemplate ? (currentTemplate.version + 1) : 1,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    throw error;
  }

  // Track the edit if sections changed
  if (currentTemplate && updates.sections) {
    await trackTemplateEdit(id, currentTemplate.sections, updates.sections);
  }

  return data;
}

/**
 * Update a specific section in a template
 */
export async function updateTemplateSection(
  templateId: string,
  sectionName: string,
  newContent: string,
  editReason?: string
): Promise<Template> {
  // Get current template
  const { data: template, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (fetchError) {
    console.error('Error fetching template:', fetchError);
    throw fetchError;
  }

  // Update the specific section
  const updatedSections = template.sections.map((section: TemplateSection) => {
    if (section.name === sectionName) {
      return { ...section, content: newContent };
    }
    return section;
  });

  // Update template with new sections
  const { data, error } = await supabase
    .from('templates')
    .update({
      sections: updatedSections,
      version: template.version + 1,
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template section:', error);
    throw error;
  }

  // Track the edit
  const oldSection = template.sections.find((s: TemplateSection) => s.name === sectionName);
  if (oldSection) {
    await supabase.from('template_edits').insert({
      template_id: templateId,
      section_name: sectionName,
      old_content: oldSection.content,
      new_content: newContent,
      edit_reason: editReason,
    });
  }

  return data;
}

/**
 * Delete (soft delete) a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .update({ active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Track template edit history
 */
async function trackTemplateEdit(
  templateId: string,
  oldSections: TemplateSection[],
  newSections: TemplateSection[]
): Promise<void> {
  const edits: NewTemplateEdit[] = [];

  // Compare sections
  for (const newSection of newSections) {
    const oldSection = oldSections.find((s: TemplateSection) => s.name === newSection.name);
    if (oldSection && oldSection.content !== newSection.content) {
      edits.push({
        template_id: templateId,
        section_name: newSection.name,
        old_content: oldSection.content,
        new_content: newSection.content,
      });
    }
  }

  if (edits.length > 0) {
    const { error } = await supabase.from('template_edits').insert(edits);
    if (error) {
      console.error('Error tracking template edits:', error);
      // Don't throw - this is non-critical tracking
    }
  }
}

/**
 * Get template edit history
 */
export async function getTemplateEditHistory(templateId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('template_edits')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching template history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Migrate templates from in-memory to database (one-time operation)
 */
export async function migrateTemplatesFromMemory(templates: Record<string, any>): Promise<void> {
  const templatesToInsert: NewTemplate[] = [];

  for (const [key, template] of Object.entries(templates)) {
    // Generate a unique template_id
    const templateId = `${template.setting}_${template.visitType}`
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Check if already exists
    const existing = await getTemplateById(templateId);
    if (existing) {
      console.log(`Template ${templateId} already exists, skipping`);
      continue;
    }

    templatesToInsert.push({
      template_id: templateId,
      name: `${template.setting} - ${template.visitType}`,
      setting: template.setting,
      visit_type: template.visitType,
      version: 1,
      sections: template.sections || [],
      smarttools: template.smarttools || null,
      active: true,
      created_by: 'migration',
    });
  }

  if (templatesToInsert.length > 0) {
    const { error } = await supabase
      .from('templates')
      .insert(templatesToInsert);

    if (error) {
      console.error('Error migrating templates:', error);
      throw error;
    }

    console.log(`Successfully migrated ${templatesToInsert.length} templates to database`);
  } else {
    console.log('No new templates to migrate');
  }
}

/**
 * Clone a template with a new setting/visit type
 */
export async function cloneTemplate(
  sourceTemplateId: string,
  newSetting: string,
  newVisitType: string
): Promise<Template> {
  // Get source template
  const source = await getTemplateById(sourceTemplateId);
  if (!source) {
    throw new Error(`Template ${sourceTemplateId} not found`);
  }

  // Create new template
  const newTemplateId = `${newSetting}_${newVisitType}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return createTemplate({
    template_id: newTemplateId,
    name: `${newSetting} - ${newVisitType}`,
    setting: newSetting,
    visit_type: newVisitType,
    version: 1,
    sections: source.sections,
    smarttools: source.smarttools,
    active: true,
    created_by: 'clone',
  });
}