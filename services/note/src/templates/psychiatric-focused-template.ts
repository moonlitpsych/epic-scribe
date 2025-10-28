/**
 * Focused Psychiatric Note Template
 * Streamlined template focusing on key psychiatric sections only
 */

import { Template, TemplateSection } from '@epic-scribe/types';

export const PSYCHIATRIC_FOCUSED_SECTIONS: TemplateSection[] = [
  {
    order: 1,
    name: 'History of Present Illness',
    content: '***',
    exemplar: `.FNAME .LNAME is a .age year old who presents for psychiatric evaluation. The patient reports experiencing depressive symptoms including low mood, anhedonia, and decreased energy for the past three months, which began following a significant life stressor involving job loss. The symptoms have progressively worsened over time, with the patient noting particular difficulty in the mornings. Sleep has been significantly impacted with early morning awakening at 3-4 AM and inability to return to sleep. Appetite is decreased with an unintentional weight loss of 10 pounds over the past two months. The patient describes feeling hopeless about the future but denies any current suicidal ideation or plan. Concentration has been notably impaired, affecting work performance and leading to the recent job termination. The patient has attempted to cope through exercise and maintaining social connections but finds these increasingly difficult. Previous episodes of depression occurred in 2018 and 2020, both responding well to treatment. Current stressors include financial concerns and relationship strain with spouse.`,
    instructions: 'Generate detailed narrative from transcript. Include temporal course, severity, triggers, and impact on functioning. Capture specific details and patient quotes where relevant.'
  },
  {
    order: 2,
    name: 'Psychiatric History',
    content: `Previous diagnoses: ***
Previous medications: ***
Hospitalizations: ***
Suicide attempts: ***
Self-harm history (NSSIB): ***
Previous therapy: ***`,
    exemplar: `Previous diagnoses: Major Depressive Disorder diagnosed 2018 by Dr. Smith at Valley Mental Health, Generalized Anxiety Disorder diagnosed 2019 by Dr. Johnson
Previous medications: Sertraline 50-200mg daily (2018-2019, partial response with sexual side effects), Venlafaxine XR 150mg (2019-2020, good response but discontinued due to hypertension), Quetiapine 50mg qhs (2020-present for sleep)
Hospitalizations: Two psychiatric hospitalizations - University Hospital 03/2018 for 5 days (severe depression with SI), Valley Behavioral Health 09/2020 for 3 days (mixed episode)
Suicide attempts: One attempt 03/2018 via acetaminophen overdose, required medical hospitalization and psychiatric admission. No attempts since then.
Self-harm history (NSSIB): Remote history of cutting on forearms ages 17-22 during periods of emotional distress. Last episode over 10 years ago. No current self-harm.
Previous therapy: CBT with Dr. Johnson 2019-2020 (6 months, weekly, good response), DBT group at Valley 2020 (3 months, focused on distress tolerance)`,
    instructions: 'SAFETY CRITICAL: Extract ONLY explicitly stated information. For hospitalizations, suicide attempts, and self-harm - NEVER infer or assume. Use "Denies" only if patient explicitly denies when asked. Otherwise leave *** blank. Include specific dates, durations, and details when provided.'
  },
  {
    order: 3,
    name: 'Psychiatric Review of Systems',
    content: `Depression symptoms: Mood {Mood:305000005}, sleep {Sleep Pattern:305000001} with {Sleep Quality:305000002} quality, appetite {Appetite:305000003}, energy {Energy Level:305000004}, anhedonia {Anhedonia:305000009}, guilt/worthlessness {Guilt/Worthlessness:305000010}, concentration {Concentration:305000008}, hopelessness {Hopelessness:305000011}, suicidal ideation {Suicidal Ideation:305000012}. ***

Anxiety symptoms: Anxiety level {Anxiety Symptoms:305000006}, panic attacks {Panic Attacks:305000007}, specific phobias or social anxiety noted as follows: ***

Manic/Hypomanic symptoms: ***

Psychotic symptoms: Hallucinations {Hallucinations:305000014}, paranoia {Paranoia:305000015}, delusions or thought broadcasting noted as follows: ***

OCD symptoms: Obsessions {Obsessions:305000016}, compulsions {Compulsions:305000017}, other repetitive behaviors: ***

PTSD symptoms: Flashbacks {Flashbacks:305000018}, nightmares {Nightmares:305000019}, hypervigilance or avoidance noted as follows: ***

ADHD symptoms: ***

Other psychiatric symptoms: Homicidal ideation {Homicidal Ideation:305000013}. ***`,
    exemplar: `Depression symptoms: Mood depressed, sleep initial insomnia with poor with frequent awakening quality, appetite decreased, energy markedly decreased, anhedonia present, guilt/worthlessness excessive guilt, concentration significantly impaired, hopelessness present, suicidal ideation passive ideation without plan. Patient describes mood as persistently low for the past 6 weeks with no good days. Symptoms are worse in the morning with some mild improvement by evening.

Anxiety symptoms: Anxiety level moderate anxiety, panic attacks none, specific phobias or social anxiety noted as follows: Patient reports generalized worry about finances and job performance. Some social anxiety in group settings but able to function.

Manic/Hypomanic symptoms: Denies any periods of elevated mood, decreased need for sleep, grandiosity, or increased goal-directed activity. No history of spending sprees or risky behavior during mood episodes.

Psychotic symptoms: Hallucinations none, paranoia none, delusions or thought broadcasting noted as follows: No evidence of psychotic symptoms. Reality testing intact.

OCD symptoms: Obsessions none, compulsions none, other repetitive behaviors: Denies intrusive thoughts or ritualistic behaviors.

PTSD symptoms: Flashbacks none, nightmares occasional, hypervigilance or avoidance noted as follows: Occasional nightmares related to work stress but not trauma-related. No avoidance behaviors or hypervigilance.

ADHD symptoms: Difficulty with concentration and focus noted above appears to be secondary to depression. No childhood history of ADHD symptoms. No hyperactivity or impulsivity.

Other psychiatric symptoms: Homicidal ideation none. No evidence of eating disorder symptoms, dissociative symptoms, or personality disorder traits that would impact treatment.`,
    instructions: 'For INTAKE: Organize by diagnostic categories and be comprehensive. Use SmartLists for specific symptoms then expand with clinical details in wildcards. For FOLLOW-UP: Can use simpler symptom list format focusing on current issues.'
  },
  {
    order: 4,
    name: 'Substance Use History',
    content: `Alcohol: {Alcohol Use:305000020} ***
Cannabis: {Cannabis Use:305000021} ***
Tobacco/Nicotine: {Tobacco Use:305000025} ***
Stimulants: {Stimulant Use:305000022} ***
Cocaine: {Cocaine Use:304120501} ***
Amphetamines: {Amphetamine Use:304120502} ***
Opioids: {Opioid Use:305000023} ***
Benzodiazepines: {Benzodiazepine Use:305000024} ***
Other substances: {Other Substances:304120503} ***
Treatment history: ***`,
    exemplar: `Alcohol: Social use. Drinks 2-3 beers on weekends. No history of withdrawal, blackouts, or DUI. Denies drinking to intoxication.
Cannabis: None
Tobacco/Nicotine: Former smoker. Quit 5 years ago after 10-year pack-per-day history. Currently uses nicotine gum occasionally.
Stimulants: Prescribed ADHD medication only. Takes Adderall XR 20mg daily as prescribed for past 2 years.
Cocaine: None
Amphetamines: Prescribed ADHD medication only (see stimulants above)
Opioids: None
Benzodiazepines: None. Previously prescribed lorazepam prn but discontinued due to concerns about dependence.
Other substances: None
Treatment history: No formal substance use treatment. Quit smoking independently with nicotine replacement therapy.`,
    instructions: 'Use SmartLists for primary categorization, then add specific details in wildcard sections. Include patterns, amounts, frequency, route of administration, consequences, and treatment history. Be specific about prescribed vs illicit use.'
  },
  {
    order: 5,
    name: 'Social History',
    content: `Living situation: {Living Situation:305000030} ***
Employment: {Employment Status:305000031} ***
Education: {Education Level:305000032} ***
Relationships: {Relationship Status:305000033} ***
Support system: {Support System:305000034} ***
Financial status: {Financial Status:304120601} ***
Legal issues: {Legal Issues:304120602} ***
Trauma history: ***
Military history: ***`,
    exemplar: `Living situation: Stable housing. Lives in apartment with spouse and two children ages 8 and 12. Rent is current, no housing instability.
Employment: Recently unemployed. Worked as software engineer for 8 years until termination 2 months ago due to performance issues related to depression.
Education: College graduate. Bachelor's degree in Computer Science from University of Utah, graduated 2010.
Relationships: Married. Reports relationship strain due to current symptoms but spouse is supportive. Good relationships with children. Some isolation from friends recently.
Support system: Good. Has supportive spouse, close relationship with sister who lives locally, and two close friends from college. Parents live nearby and are involved.
Financial status: Financial stress. Lost primary income 2 months ago. Spouse works part-time. Using savings currently. Applied for unemployment benefits.
Legal issues: No legal issues. No criminal history, no DUIs, no current legal proceedings.
Trauma history: Witnessed domestic violence between parents during childhood. No physical or sexual abuse. Motor vehicle accident 3 years ago with mild PTSD symptoms that resolved without treatment.
Military history: No military service.`,
    instructions: 'Use SmartLists for primary categories, then expand with relevant psychosocial details from transcript. Focus on factors that impact psychiatric presentation and treatment planning.'
  },
  {
    order: 6,
    name: 'Mental Status Examination',
    content: `Appearance: {MSE Appearance:305000040}
Behavior: {MSE Behavior:305000041}
Eye contact: {MSE Eye Contact:305000042}
Speech: {MSE Speech Rate:305000043} {MSE Speech Volume:305000044}
Mood (patient stated): {MSE Mood:305000045}
Affect: {MSE Affect:305000046}
Thought process: {MSE Thought Process:305000047}
Thought content: {MSE Thought Content:305000048}
Perceptual disturbances: {MSE Perceptual:305000049}
Cognitive function: {MSE Cognition:305000050}
Insight: {MSE Insight:305000051}
Judgment: {MSE Judgment:305000052}`,
    exemplar: `Appearance: Well-groomed
Behavior: Cooperative
Eye contact: Good
Speech: Normal rate Normal volume
Mood (patient stated): Depressed
Affect: Constricted and mood-congruent
Thought process: Linear and goal-directed
Thought content: No delusions or paranoia
Perceptual disturbances: None
Cognitive function: Grossly intact
Insight: Good
Judgment: Good`,
    instructions: 'Select SmartList options based on clinical observation described in transcript. Use standard psychiatric terminology.'
  },
  {
    order: 7,
    name: 'Formulation',
    content: '***',
    exemplar: `.FNAME .LNAME is a .age year old married software engineer with a history of major depressive disorder and generalized anxiety disorder who presents for follow-up after recent job loss.

The patient's presentation is most consistent with Major Depressive Disorder, recurrent, moderate severity (F33.1) based on the presence of depressed mood, anhedonia, sleep disturbance, decreased appetite with weight loss, psychomotor retardation, fatigue, feelings of worthlessness, and impaired concentration meeting full criteria for a major depressive episode lasting over 2 weeks. From a biological perspective, there is likely a genetic vulnerability given family history of depression in mother and maternal grandmother, with possible neurotransmitter dysregulation. Psychologically, the patient demonstrates negative cognitive patterns and catastrophic thinking following job loss, with decreased self-esteem and self-efficacy. Socially, recent unemployment has created financial stress and role transition difficulties, though protective factors include stable marriage and good family support.

Also considered in the differential diagnosis are Adjustment Disorder with Depressed Mood, which is less likely given the severity and number of symptoms exceeding what would be expected from the stressor alone. Bipolar II Disorder was considered given past episodes, but the patient denies any history of hypomania and previous episodes have all been depressive in nature. Generalized Anxiety Disorder is comorbid rather than the primary diagnosis, as anxiety symptoms are currently less prominent than depressive symptoms.

The treatment plan will focus on both medication optimization and psychotherapeutic intervention, with consideration of vocational rehabilitation given the occupational impairment. The prognosis is good given previous positive treatment response and current motivation for treatment. Plan details are as follows:`,
    instructions: 'Generate exactly 4 paragraphs: (1) One-liner with demographics and presentation, (2) Primary diagnosis with DSM criteria and biopsychosocial formulation, (3) Differential diagnosis with reasoning, (4) Treatment direction and transition to plan.'
  },
  {
    order: 8,
    name: 'Plan',
    content: `Medications:
***

Referral to Psychotherapy:
***

Therapy:
***

Follow-up:
***

Rufus Sweeney, MD`,
    exemplar: `Medications:
Start sertraline 50 mg daily for depression - patient had partial response previously but was not at adequate dose
Continue gabapentin 300 mg TID for anxiety - stable and effective
Start trazodone 50 mg qhs prn for insomnia - patient requesting sleep aid, avoiding benzodiazepines given history

Referral to Psychotherapy:
Refer to Dr. Sarah Smith for cognitive behavioral therapy weekly focusing on depression, negative thought patterns, and return-to-work anxiety
Patient has verified insurance coverage for 20 sessions

Therapy:
Supportive psychotherapy provided today focusing on validation of job loss experience, normalization of depressive symptoms in context of significant stressor, and collaborative problem-solving regarding financial concerns. Utilized cognitive restructuring to address catastrophic thinking about future employment. Patient engaged well and expressed feeling understood. Session duration: 30 minutes.

Follow-up:
Return in 2 weeks for medication monitoring and supportive therapy, or sooner if needed

Rufus Sweeney, MD`,
    instructions: 'REQUIRED: All 5 subsections must be present in this exact order: Medications, Referral to Psychotherapy, Therapy (conducted today), Follow-up, and Signature. Therapy section MUST include session duration. Follow-up MUST end with "or sooner if needed". End with "Rufus Sweeney, MD".'
  }
];

/**
 * Psychiatric ROS section for follow-up visits (simpler format)
 */
const PSYCHIATRIC_ROS_FOLLOWUP: TemplateSection = {
  order: 3,
  name: 'Psychiatric Review of Systems',
  content: `Sleep: {Sleep Pattern:305000001} with {Sleep Quality:305000002} quality
Appetite: {Appetite:305000003}
Energy: {Energy Level:305000004}
Mood: {Mood:305000005}
Anxiety: {Anxiety Symptoms:305000006}
Anhedonia: {Anhedonia:305000009}
Concentration: {Concentration:305000008}
Suicidal ideation: {Suicidal Ideation:305000012}
Hallucinations: {Hallucinations:305000014}
Other symptoms: ***`,
  exemplar: `Sleep: Improved from initial insomnia to normal sleep with good quality
Appetite: Normal
Energy: Mildly decreased
Mood: Improved but still mildly depressed
Anxiety: Mild anxiety
Anhedonia: Improving
Concentration: Mildly impaired
Suicidal ideation: None
Hallucinations: None
Other symptoms: Occasional tension headaches, likely stress-related. No new psychiatric symptoms since last visit.`,
  instructions: 'For FOLLOW-UP visits: Focus on current symptoms and changes since last visit. Use SmartLists for main symptoms and wildcard for any additional concerns.'
};

/**
 * Create a focused psychiatric template for a specific setting and visit type
 */
export function createFocusedPsychiatricTemplate(
  templateId: string,
  name: string,
  setting: string,
  visitType: string
): Template {
  // Create a copy of sections and modify based on visit type
  let sections = [...PSYCHIATRIC_FOCUSED_SECTIONS];

  // For follow-up visits, use simpler ROS format
  if (visitType === 'Follow-up') {
    sections = sections.map(section => {
      if (section.name === 'Psychiatric Review of Systems') {
        return PSYCHIATRIC_ROS_FOLLOWUP;
      }
      return section;
    });
  }

  // For Transfer of Care, use intake format but may adjust in future
  // For now, TOC uses same comprehensive format as Intake

  return {
    templateId,
    name,
    setting: setting as any,
    visitType: visitType as any,
    version: 1,
    sections,
    smarttools: [
      // SmartLinks (convert to DotPhrases)
      { type: 'smartlink', identifier: 'FNAME', placeholder: '@FNAME@', description: 'Patient first name' },
      { type: 'smartlink', identifier: 'LNAME', placeholder: '@LNAME@', description: 'Patient last name' },
      { type: 'smartlink', identifier: 'age', placeholder: '@age@', description: 'Patient age' },

      // DotPhrases
      { type: 'dotphrase', identifier: 'FNAME', placeholder: '.FNAME', description: 'Patient first name' },
      { type: 'dotphrase', identifier: 'LNAME', placeholder: '.LNAME', description: 'Patient last name' },
      { type: 'dotphrase', identifier: 'age', placeholder: '.age', description: 'Patient age' },

      // Wildcards
      { type: 'wildcard', identifier: 'custom', placeholder: '***', description: 'Custom text from transcript' }
    ]
  };
}