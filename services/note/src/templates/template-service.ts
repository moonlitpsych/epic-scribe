/**
 * Template Service
 * Manages Epic note templates for all settings and visit types
 */

import { Template, Setting, VisitType, TemplateSection, SmartTool } from '@epic-scribe/types';
import templateMapping from '../../../../configs/template-mapping.json';
import { createFocusedPsychiatricTemplate, PSYCHIATRIC_FOCUSED_SECTIONS } from './psychiatric-focused-template';

// Template repository - in production, this would be in a database
const TEMPLATES: Map<string, Template> = new Map();

// Initialize with base templates
function initializeTemplates() {
  // Use focused psychiatric templates for all settings

  // RCC Intake Template - Now using focused psychiatric format
  TEMPLATES.set('rcc_intake_v1', createFocusedPsychiatricTemplate(
    'rcc_intake_v1',
    'RCC Intake - Focused Psychiatric',
    'HMHI Downtown RCC',
    'Intake'
  ));

  // Original comprehensive template kept for reference
  TEMPLATES.set('rcc_intake_comprehensive_v1', {
    templateId: 'rcc_intake_v1',
    name: 'RCC Intake',
    setting: 'HMHI Downtown RCC',
    visitType: 'Intake',
    version: 1,
    sections: [
      {
        order: 1,
        name: 'UNIVERSITY HEALTHCARE',
        content: 'PSYCHIATRY CONSULTATION NOTE\n\nPatient: @FNAME@ @LNAME@\nMRN: @MRN@\nDate of Service: @DATE@\nProvider: .provider',
        exemplar: 'Standard header with patient demographics and visit information.'
      },
      {
        order: 2,
        name: 'Chief Complaint',
        content: '@RFV@',
        exemplar: 'Brief statement of the patient\'s primary reason for visit.'
      },
      {
        order: 3,
        name: 'History of Present Illness',
        content: '***',
        exemplar: 'The patient is a @age@ year old presenting for initial psychiatric evaluation. They report experiencing symptoms including mood changes, anxiety, and sleep disturbance for the past several months. The symptoms began gradually and have progressively worsened, significantly impacting daily functioning.'
      },
      {
        order: 4,
        name: 'Past Psychiatric History',
        content: 'Previous hospitalizations: {BH Hospitalizations:304120103}\nPrevious suicide attempts: {Suicide History:304120104}\nPrevious treatments: ***',
        exemplar: 'Patient reports two previous psychiatric hospitalizations, most recently in 2022 for major depression. They have been in outpatient treatment intermittently.'
      },
      {
        order: 5,
        name: 'Current Medications',
        content: '@MEDS@\nMedication compliance: {Medication Compliance:304120105}',
        exemplar: 'Patient currently takes sertraline 100mg daily and reports good compliance with medications.'
      },
      {
        order: 6,
        name: 'Psychiatric Review of Systems',
        content: 'Sleep: {Sleep Quality:304120106}\nAppetite: {Appetite:304120107}\nMood: {Mood:304120108}\nAnxiety: {Anxiety Level:304120109}\nConcentration: {Concentration:304120110}',
        exemplar: 'Sleep is poor with difficulty falling asleep. Appetite is decreased. Mood is depressed. Anxiety is moderate. Concentration is impaired.'
      },
      {
        order: 7,
        name: 'Mental Status Examination',
        content: 'Appearance: ***\nBehavior: ***\nEye Contact: ***\nSpeech: ***\nMood: ***\nAffect: ***\nThought Process: ***\nThought Content: ***\nPerceptual Disturbances: ***\nSuicidal Ideation: ***\nHomicidal Ideation: ***\nInsight: ***\nJudgment: ***',
        exemplar: 'Appearance: Well-groomed, appropriate dress, appears stated age\nBehavior: Cooperative, calm\nEye Contact: Good\nSpeech: Normal rate and tone\nMood: "Depressed"\nAffect: Congruent with mood, restricted range\nThought Process: Linear and goal-directed\nThought Content: No delusions, no paranoid ideation\nPerceptual Disturbances: None reported\nSuicidal Ideation: Denies\nHomicidal Ideation: Denies\nInsight: Fair - understands need for treatment\nJudgment: Fair - appropriate decision-making observed'
      },
      {
        order: 8,
        name: 'Assessment',
        content: 'Diagnostic Impression: @DIAGNOSIS@\n\nFormulation: ***\n\nRisk assessment: {Risk Level:304120111}\nPrognosis: {Prognosis:304120112}',
        exemplar: 'Diagnostic Impression: Major Depressive Disorder, moderate severity (F32.1); Generalized Anxiety Disorder (F41.1)\n\nFormulation: This is a 35-year-old patient presenting with a 3-month history of depressed mood, anhedonia, poor sleep, and decreased appetite consistent with a major depressive episode. Symptoms appear to have been triggered by significant work-related stress and have progressively worsened. The patient has limited social support and has not previously engaged in mental health treatment. Anxiety symptoms are also prominent and appear to predate the depressive episode. The patient demonstrates fair insight into their condition and motivation for treatment. Protective factors include stable employment, no substance use, and willingness to engage in both medication and therapy.\n\nRisk assessment: Low\nPrognosis: Good with treatment'
      },
      {
        order: 9,
        name: 'Plan',
        content: '1. Medications: ***\n2. Psychotherapy: {Therapy Referral:304120113}\n3. Labs: @LABS@\n4. Follow-up: {Follow-up Timeframe:304120114}\n5. Safety planning: ***',
        exemplar: 'Continue current medications with dose adjustment. Refer for cognitive behavioral therapy. Order basic labs including TSH and CBC. Follow-up in 2-3 weeks. Safety plan reviewed and documented.'
      }
    ],
    smarttools: [
      { type: 'smartlink', identifier: 'FNAME', placeholder: '@FNAME@', description: 'Patient first name' },
      { type: 'smartlink', identifier: 'LNAME', placeholder: '@LNAME@', description: 'Patient last name' },
      { type: 'smartlink', identifier: 'MRN', placeholder: '@MRN@', description: 'Medical record number' },
      { type: 'smartlink', identifier: 'DATE', placeholder: '@DATE@', description: 'Date of service' },
      { type: 'smartlink', identifier: 'RFV', placeholder: '@RFV@', description: 'Reason for visit' },
      { type: 'smartlink', identifier: 'age', placeholder: '@age@', description: 'Patient age' },
      { type: 'smartlink', identifier: 'MEDS', placeholder: '@MEDS@', description: 'Current medications' },
      { type: 'smartlink', identifier: 'DIAGNOSIS', placeholder: '@DIAGNOSIS@', description: 'Diagnosis' },
      { type: 'smartlink', identifier: 'LABS', placeholder: '@LABS@', description: 'Laboratory orders' },
      { type: 'dotphrase', identifier: 'provider', placeholder: '.provider', description: 'Provider signature' },
      { type: 'wildcard', identifier: 'hpi', placeholder: '***', description: 'History of present illness' },
      { type: 'wildcard', identifier: 'mse', placeholder: '***', description: 'Mental status exam' }
    ]
  });

  // Create focused psychiatric templates for all settings and visit types
  const settings: Setting[] = ['HMHI Downtown RCC', 'Redwood Clinic MHI', 'Davis Behavioral Health', 'Moonlit Psychiatry'];
  const visitTypes = ['Intake', 'Transfer of Care', 'Follow-up'];

  settings.forEach(setting => {
    visitTypes.forEach(visitType => {
      const actualVisitType = visitType === 'Intake' && setting === 'Redwood Clinic MHI' ? 'Consultation Visit' : visitType;
      const mapping = getTemplateMapping(setting, actualVisitType);
      if (mapping && !TEMPLATES.has(mapping.templateId)) {
        // All templates now use the focused psychiatric format
        TEMPLATES.set(mapping.templateId, createFocusedPsychiatricTemplate(
          mapping.templateId,
          `${setting} - ${visitType} - Focused Psychiatric`,
          setting,
          visitType
        ));
      }
    });
  });
}

function createBaseTemplate(templateId: string, setting: Setting, visitType: VisitType | string): Template {
  const baseTemplate = TEMPLATES.get('rcc_intake_v1')!;
  return {
    ...baseTemplate,
    templateId,
    name: `${setting} - ${visitType}`,
    setting,
    visitType: visitType as VisitType,
    sections: baseTemplate.sections.map(section => ({
      ...section,
      // Adjust content based on visit type
      content: visitType === 'Follow-up' ?
        section.content.replace('initial psychiatric evaluation', 'follow-up visit') :
        visitType === 'Transfer of Care' ?
        section.content.replace('initial psychiatric evaluation', 'transfer of care visit') :
        section.content
    }))
  };
}

export class TemplateService {
  constructor() {
    initializeTemplates();
  }

  /**
   * Get a template by setting and visit type
   */
  getTemplate(setting: Setting, visitType: VisitType | string): Template | null {
    const mapping = getTemplateMapping(setting, visitType);
    if (!mapping) return null;

    return TEMPLATES.get(mapping.templateId) || null;
  }

  /**
   * Get a template by ID
   */
  getTemplateById(templateId: string): Template | null {
    return TEMPLATES.get(templateId) || null;
  }

  /**
   * List all available templates
   */
  listTemplates(): Template[] {
    return Array.from(TEMPLATES.values());
  }

  /**
   * List templates for a specific setting
   */
  listTemplatesBySetting(setting: Setting): Template[] {
    return Array.from(TEMPLATES.values()).filter(t => t.setting === setting);
  }

  /**
   * Update a template
   */
  updateTemplate(templateId: string, updates: Partial<Template>): Template | null {
    const template = TEMPLATES.get(templateId);
    if (!template) return null;

    const updated = {
      ...template,
      ...updates,
      templateId, // Ensure ID doesn't change
      version: template.version + 1
    };

    TEMPLATES.set(templateId, updated);
    return updated;
  }

  /**
   * Add or update a section in a template
   */
  updateSection(templateId: string, sectionName: string, content: string): Template | null {
    const template = TEMPLATES.get(templateId);
    if (!template) return null;

    const sectionIndex = template.sections.findIndex(s => s.name === sectionName);
    if (sectionIndex === -1) {
      // Add new section
      template.sections.push({
        order: template.sections.length + 1,
        name: sectionName,
        content
      });
    } else {
      // Update existing section
      template.sections[sectionIndex].content = content;
    }

    template.version++;
    TEMPLATES.set(templateId, template);

    // Note: Persistence is handled by the API endpoint, not here
    return template;
  }

  /**
   * Get SmartTools used in a template
   */
  getTemplateSmartTools(templateId: string): SmartTool[] {
    const template = TEMPLATES.get(templateId);
    return template?.smarttools || [];
  }

  /**
   * Validate template has all required sections
   */
  validateTemplate(templateId: string): { valid: boolean; issues: string[] } {
    const template = TEMPLATES.get(templateId);
    if (!template) {
      return { valid: false, issues: ['Template not found'] };
    }

    const issues: string[] = [];
    const requiredSections = ['Chief Complaint', 'History of Present Illness', 'Assessment', 'Plan'];

    requiredSections.forEach(required => {
      if (!template.sections.find(s => s.name === required)) {
        issues.push(`Missing required section: ${required}`);
      }
    });

    return { valid: issues.length === 0, issues };
  }
}

/**
 * Get template mapping from configuration
 */
function getTemplateMapping(setting: Setting | string, visitType: string): { templateId: string; version: number } | null {
  const settingConfig = (templateMapping as any)[setting];
  if (!settingConfig) return null;

  return settingConfig[visitType] || null;
}

// Export singleton instance
export const templateService = new TemplateService();