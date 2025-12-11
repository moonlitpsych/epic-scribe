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
    initializeTeenscopeTemplates();
    initializeBHIDCTherapyTemplates();
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

// Initialize Teenscope South templates
function initializeTeenscopeTemplates() {
  console.log('[TemplateService] Initializing Teenscope South templates');
  // Teenscope South Intake
  TEMPLATES.set('teenscope_south_intake_v1', {
    templateId: 'teenscope_south_intake_v1',
    name: 'Teenscope South - Intake',
    setting: 'Teenscope South' as Setting,
    visitType: 'Intake' as VisitType,
    version: 1,
    sections: [
      {
        order: 1,
        name: 'Header',
        content: 'Comprehensive Psychiatric Diagnostic Evaluation\n\nAdmission Date: @ADMITDT@\nDate of Service: @TODAY@',
        exemplar: 'Use admission date from encounter and today\'s date'
      },
      {
        order: 2,
        name: 'ID',
        content: '@NAME@ is a @AGE@ @SEX@.',
        exemplar: 'Extract patient demographics'
      },
      {
        order: 3,
        name: 'Chief Complaint',
        content: '"***"',
        exemplar: 'Extract the chief complaint verbatim from the patient\'s own words, using quotation marks'
      },
      {
        order: 4,
        name: 'Reason for Hospitalization',
        content: '***',
        exemplar: 'Synthesize the primary reasons for admission to Teenscope PHP program'
      },
      {
        order: 5,
        name: 'History of Present Illness',
        content: 'Information was gathered from interview with patient, review of medical records and phone call with ***.\n\nPatient Interview\n***\n\nPer Collateral\n***',
        exemplar: 'For Patient Interview: Provide a comprehensive narrative. For Per Collateral: Include information from parent/guardian if collateral transcript provided, otherwise use: "I attempted to reach [relationship], patient\'s [parent/guardian], to obtain collateral information, but they were unavailable."'
      },
      {
        order: 6,
        name: 'Psychiatric Review of Systems',
        content: 'Depression: low mood, hyper/insomnia, anhedonia, isolative, guilt feelings, low energy, appetite change, SI, SH, poor concentration, crying, irritability, helplessness, hopeless\nMania: decreased need for sleep, grandiosity, elevated mood, rapid thoughts, pressured speech, impulsivity, irritability, increased goal-directed activity, risky behaviors, distractable\nAnxiety: GAD: excess worry about "everything," fidgety, psychomotor agitation, easily fatigued, increased muscle tension, delayed onset of sleep, decreased concentration\n    OCD: intrusive persistent thoughts recognized as irrational or excessive, rituals\n    PTSD: traumatic event, nightmares, flashbacks, intrusive memories, avoidance, hypervigilence\n    Social: ***\n    Panic: ***\nPsychosis: AH, VH, paranoia, delusions\nEating disorders: restricting, purging, binging, laxative abuse, increased exercise, distorted body image\nADHD: hyper, distractible, fidgety, loses things, forgetful in daily activities, difficulty sustaining attention, talks excessively, blurts things out, difficulty awaiting turn\nASD: abnormal eye contact, impaired social or emotional reciprocity, idiosyncratic language/speech, lack of imaginary play, preoccupation or narrow interests, difficulty with change, insistence on non-functional routines, repetitive body movements\nDisruptive behaviors: ***\nPersonality symptoms: no persistent history of extreme reactions (panic, depression, rage) to abandonment, patterns of intense relationships with family/friends/loved ones, extreme closeness and love (idealization) to extreme dislike or anger (devaluation), distorted and unstable self-image or sense of self, impulsive and often dangerous behaviors, recurrent suicidal behaviors or threats or self-harming behavior, intense and highly changeable moods, chronic feelings of emptiness and/or boredom, inappropriate intense anger or problems controlling anger, stress-related paranoid thoughts or dissociative symptoms',
        exemplar: 'Document presence or absence of symptoms in each domain. Use "denies" for absent symptoms and describe present symptoms with onset, frequency, and severity'
      },
      {
        order: 7,
        name: 'Past Psychiatric History',
        content: 'Previous Diagnoses: ***\nHospitalizations: ***\nSuicide Attempts: ***\nSelf-Harm Behaviors: ***\nCurrent/Previous Outpatient MH Providers: ***\nPrevious Medication Trials: ***\nPrevious ECT: ***',
        exemplar: 'Document all past psychiatric treatment comprehensively. Include dates, locations, and outcomes when available'
      },
      {
        order: 8,
        name: 'Substance Use History',
        content: 'Tobacco: ***\nAlcohol: ***\nCannabis: ***\nOther illicit drugs: ***\nInhalants: ***\nPrescription drug abuse: ***',
        exemplar: 'Document all substance use history including age of first use, frequency, amount, and last use. Use "denies" if no history'
      },
      {
        order: 9,
        name: 'Social History',
        content: 'Living situation: ***\nCustody: ***\nEducation: ***\nPeers: ***\nDating history: ***\nAbuse: ***\nReligious/spiritual beliefs: ***\nLegal issues: ***\nLoss: ***',
        exemplar: 'Document comprehensive social context including family structure, school performance, peer relationships, trauma history, and support systems'
      },
      {
        order: 10,
        name: 'Development History',
        content: 'Birth: ***\nMilestones: ***\nAttachment: ***',
        exemplar: 'Document prenatal/perinatal complications, developmental milestones, and attachment patterns'
      },
      {
        order: 11,
        name: 'Family Psychiatric History',
        content: '***',
        exemplar: 'Document family psychiatric history including diagnoses, hospitalizations, suicide attempts, and substance use in biological relatives'
      },
      {
        order: 12,
        name: 'Medications at Time of Evaluation',
        content: '***',
        exemplar: 'List all current medications with doses and frequencies'
      },
      {
        order: 13,
        name: 'Diagnostic Studies',
        content: '***',
        exemplar: 'Document any relevant lab results, imaging, or other diagnostic studies'
      },
      {
        order: 14,
        name: 'Physical Exam',
        content: '@VSRANGES@\n\nPertinent Physical Exam: ***',
        exemplar: 'Document vital signs and any pertinent physical exam findings'
      },
      {
        order: 15,
        name: 'Psychiatric Examination',
        content: 'General Appearance: ***\nBehavior: ***\nEye Contact: ***\nAffect: ***\nMood: ***\nSpeech: ***\nThought Process/Associations: ***\nIdeations: ***\nBehaviors: ***\nHallucinations/Delusions: ***\nOther Thought Content: ***\nMental Status: On mini-mental status examination, the patient is alert and oriented x3. Recall was 3/3 at 0 and 3/3 at 5 minutes. World was correctly spelled forwards and backwards. Recognition, repetition, and simple commands are intact. Proverbs: Don\'t cry over spilled milk equals "***". Similarities: Ball and orange equal "***". Train and car equal "***". Tree and elephant equal "***".\nInsight: ***\nJudgement: ***\nMotivation: ***\nPatient Strengths: ***\nPatient Weaknesses: ***',
        exemplar: 'Document comprehensive mental status exam findings'
      },
      {
        order: 16,
        name: 'Risk Assessment',
        content: 'Suicide Risk Factors:\n***\n\nSuicide Protective Factors:\n***\n\nOther Risks:\n***',
        exemplar: 'Comprehensively assess risk factors and protective factors'
      },
      {
        order: 17,
        name: 'Initial Formulation',
        content: '***\n@NAME@ ***is/is not genetically predisposed to *** as evident by mental illness in both immediate and distant family members. There are no genetic or cognitive disorders that would contribute to *** symptomology. There is no history of substance use or in utero exposures that would negatively impact *** neurocognitive development.\n\nFurther assessment will be needed to determine the appropriate diagnoses as well as to guide treatment. @NAME@ requires hospitalization to address safety concerns and to make plans for future treatment. Likely both medications and therapy will be needed to address symptoms.',
        exemplar: 'Provide a comprehensive biopsychosocial formulation integrating all gathered information'
      },
      {
        order: 18,
        name: 'Diagnosis',
        content: '***',
        exemplar: 'List all relevant psychiatric and medical diagnoses'
      },
      {
        order: 19,
        name: 'Treatment Plan',
        content: 'Physician will meet with patient one-on-one to assess for changes in signs or symptoms of the problem(s) that led to patient\'s inpatient psychiatric admission as well as provide education about diagnosis-specific medications and evaluate their effectiveness.\n\nInterventions include:\n\nMedication Intervention: ***\n\nTherapeutic Interventions:\nTherapeutic milieu and groups.\nIT and FT with team therapist.\n\nDischarge Criteria: ***\nExpected length of stay is *** days.\nAnticipated disposition: ***',
        exemplar: 'Detail comprehensive treatment plan including medications, therapy modalities, and discharge planning'
      },
      {
        order: 20,
        name: 'Summary of Services',
        content: 'I spent *** minutes providing care for the patient today, including floor time. More than 50% of this time consisted of counseling and coordination of care, as detailed in the above notes.',
        exemplar: 'Document time spent and nature of services provided'
      }
    ],
    smarttools: []
  });

  // Teenscope South Follow-up
  TEMPLATES.set('teenscope_south_followup_v1', {
    templateId: 'teenscope_south_followup_v1',
    name: 'Teenscope South - Follow-up',
    setting: 'Teenscope South' as Setting,
    visitType: 'Follow-up' as VisitType,
    version: 1,
    sections: [
      {
        order: 1,
        name: 'Header',
        content: 'Psychiatric Attending Daily Progress Note\n\nAdmission Date: @ADMITDT@\nMRN: @MRN@',
        exemplar: 'Use admission date and MRN from patient record'
      },
      {
        order: 2,
        name: 'ID',
        content: '@NAME@ is a @AGE@ @SEX@.',
        exemplar: 'Extract patient demographics'
      },
      {
        order: 3,
        name: 'Interval History',
        content: 'Per patient:\n***\n\nPer collateral:\n***',
        exemplar: 'Document changes since last note including patient report and collateral information if available'
      },
      {
        order: 4,
        name: 'Assessment',
        content: '***',
        exemplar: 'Update clinical assessment with current progress'
      },
      {
        order: 5,
        name: 'Plan',
        content: 'Pharmacologic interventions:\n***\n\nTherapeutic Interventions:\n***\n\nDischarge planning:\n***',
        exemplar: 'Update treatment plan with medication changes and discharge planning'
      }
    ],
    smarttools: []
  });
  console.log('[TemplateService] Teenscope templates added. Total templates:', TEMPLATES.size);
  console.log('[TemplateService] Template IDs:', Array.from(TEMPLATES.keys()));
}

// Initialize BHIDC Therapy templates
function initializeBHIDCTherapyTemplates() {
  console.log('[TemplateService] Initializing BHIDC Therapy templates');

  // BHIDC Therapy - First Visit
  TEMPLATES.set('bhidc_therapy_first_visit_v1', {
    templateId: 'bhidc_therapy_first_visit_v1',
    name: 'BHIDC Therapy - First Visit',
    setting: 'BHIDC therapy' as Setting,
    visitType: 'First Visit' as VisitType,
    version: 1,
    sections: [
      {
        order: 1,
        name: 'BHIDC Staff Intake Summary',
        content: 'Summary from BHIDC staff screener intake (if available):\n\n***',
        exemplar: 'Review the BHIDC staff intake note and extract key information: presenting problems, prior treatment history, risk factors, and initial assessment. Summarize the most clinically relevant information that informs treatment planning.'
      },
      {
        order: 2,
        name: 'Diagnostic Impressions',
        content: '***'
      },
      {
        order: 3,
        name: 'Presenting Problem',
        content: "Client's initial explanation of the problem(s), duration and precipitant cause:\n\n***"
      },
      {
        order: 4,
        name: 'Pertinent History',
        content: 'Prior therapy (including family, social, psychological, and medical). Include current medications if relevant to therapy:\n\n***'
      },
      {
        order: 5,
        name: 'Observations',
        content: "Therapist's observations of client's presentation and family interactions:\n\n***"
      },
      {
        order: 6,
        name: 'Family/Psychosocial Assessment',
        content: '***'
      },
      {
        order: 7,
        name: 'Risk',
        content: 'Evidence of potential or actual risk(s):\n\n***'
      },
      {
        order: 8,
        name: 'Contract/Safety Plan',
        content: '***'
      },
      {
        order: 9,
        name: 'Mental Status Examination',
        content: 'Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***'
      },
      {
        order: 10,
        name: 'Session Focus',
        content: '***'
      },
      {
        order: 11,
        name: 'Therapeutic Intervention',
        content: 'Therapy modality and techniques used:\n\n***'
      },
      {
        order: 12,
        name: 'Planned Intervention',
        content: 'Treatment goals:\n\n***\n\nHomework/between-session tasks:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD'
      },
      {
        order: 13,
        name: 'Client Progress',
        content: 'Initial assessment - baseline established for future progress monitoring.'
      }
    ],
    smarttools: []
  });

  // BHIDC Therapy - Follow-up
  TEMPLATES.set('bhidc_therapy_followup_v1', {
    templateId: 'bhidc_therapy_followup_v1',
    name: 'BHIDC Therapy - Follow-up',
    setting: 'BHIDC therapy' as Setting,
    visitType: 'Follow-up' as VisitType,
    version: 1,
    sections: [
      {
        order: 1,
        name: 'Interval History',
        content: 'Update since last session:\n\n***'
      },
      {
        order: 2,
        name: 'Mental Status Examination',
        content: 'Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***'
      },
      {
        order: 3,
        name: 'Session Focus',
        content: '***'
      },
      {
        order: 4,
        name: 'Therapeutic Intervention',
        content: 'Therapy modality and techniques used:\n\n***\n\nClient engagement and response:\n\n***'
      },
      {
        order: 5,
        name: 'Client Progress',
        content: 'Progress towards treatment goals:\n\n***'
      },
      {
        order: 6,
        name: 'Planned Intervention',
        content: 'Homework/between-session tasks:\n\n***\n\nFocus for next session:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD'
      }
    ],
    smarttools: []
  });

  console.log('[TemplateService] BHIDC Therapy templates added. Total templates:', TEMPLATES.size);
}

// Export singleton instance
export const templateService = new TemplateService();