-- Migration 011: Add Teenscope South Templates
-- Adolescent psychiatry templates with collateral information support
-- Run this in Supabase Dashboard > SQL Editor

-- =====================================================
-- TEENSCOPE SOUTH - INTAKE (Comprehensive Psychiatric Diagnostic Evaluation)
-- =====================================================
INSERT INTO templates (
  template_id,
  name,
  setting,
  visit_type,
  version,
  sections,
  smarttools,
  staffing_config,
  active,
  created_by
) VALUES (
  'teenscope_south_intake_v1',
  'Teenscope South - Intake',
  'Teenscope South',
  'Intake',
  1,
  '[
    {
      "order": 1,
      "name": "Header",
      "content": "Comprehensive Psychiatric Diagnostic Evaluation\n\nAdmission Date: @ADMITDT@\nDate of Service: @TODAY@",
      "exemplar": "Use admission date from encounter and today''s date"
    },
    {
      "order": 2,
      "name": "ID",
      "content": "@NAME@ is a @AGE@ @SEX@.",
      "exemplar": "Extract patient demographics"
    },
    {
      "order": 3,
      "name": "Chief Complaint",
      "content": \"***\"",
      "exemplar": "Extract the chief complaint verbatim from the patient''s own words, using quotation marks"
    },
    {
      "order": 4,
      "name": "Reason for Hospitalization",
      "content": "***",
      "exemplar": "Synthesize the primary reasons for admission to Teenscope PHP program"
    },
    {
      "order": 5,
      "name": "History of Present Illness",
      "content": "Information was gathered from interview with patient, review of medical records and phone call with ***.\n\nPatient Interview\n***\n\nPer Collateral\n***",
      "exemplar": "For Patient Interview: Provide a comprehensive narrative of the presenting problems from the patient''s perspective. For Per Collateral: Include information from parent/guardian if collateral transcript provided, otherwise use: \"I attempted to reach [relationship], patient''s [parent/guardian], to obtain collateral information, but they were unavailable. Will attempt to reach later this week.\""
    },
    {
      "order": 6,
      "name": "Psychiatric Review of Systems",
      "content": "Depression: low mood, hyper/insomnia, anhedonia, isolative, guilt feelings, low energy, appetite change, SI, SH, poor concentration, crying, irritability, helplessness, hopeless\nMania: decreased need for sleep, grandiosity, elevated mood, rapid thoughts, pressured speech, impulsivity, irritability, increased goal-directed activity, risky behaviors, distractable\nAnxiety: GAD: excess worry about \"everything,\" fidgety, psychomotor agitation, easily fatigued, increased muscle tension, delayed onset of sleep, decreased concentration\n    OCD: intrusive persistent thoughts recognized as irrational or excessive, rituals\n    PTSD: traumatic event, nightmares, flashbacks, intrusive memories, avoidance, hypervigilence\n    Social: ***\n    Panic: ***\nPsychosis: AH, VH, paranoia, delusions\nEating disorders: restricting, purging, binging, laxative abuse, increased exercise, distorted body image\nADHD: hyper, distractible, fidgety, loses things, forgetful in daily activities, difficulty sustaining attention, talks excessively, blurts things out, difficulty awaiting turn\nASD: abnormal eye contact, impaired social or emotional reciprocity, idiosyncratic language/speech, lack of imaginary play, preoccupation or narrow interests, difficulty with change, insistence on non-functional routines, repetitive body movements\nDisruptive behaviors: ***\nPersonality symptoms: no persistent history of extreme reactions (panic, depression, rage) to abandonment, patterns of intense relationships with family/friends/loved ones, extreme closeness and love (idealization) to extreme dislike or anger (devaluation), distorted and unstable self-image or sense of self, impulsive and often dangerous behaviors, recurrent suicidal behaviors or threats or self-harming behavior, intense and highly changeable moods, chronic feelings of emptiness and/or boredom, inappropriate intense anger or problems controlling anger, stress-related paranoid thoughts or dissociative symptoms",
      "exemplar": "Document presence or absence of symptoms in each domain. Use ''denies'' for absent symptoms and describe present symptoms with onset, frequency, and severity"
    },
    {
      "order": 7,
      "name": "Past Psychiatric History",
      "content": "Previous Diagnoses: ***\nHospitalizations: ***\nSuicide Attempts: ***\nSelf-Harm Behaviors: ***\nCurrent/Previous Outpatient MH Providers: ***\nPrevious Medication Trials: ***\nPrevious ECT: ***",
      "exemplar": "Document all past psychiatric treatment comprehensively. Include dates, locations, and outcomes when available"
    },
    {
      "order": 8,
      "name": "Substance Use History",
      "content": "Tobacco: ***\nAlcohol: ***\nCannabis: ***\nOther illicit drugs: ***\nInhalants: ***\nPrescription drug abuse: ***",
      "exemplar": "Document all substance use history including age of first use, frequency, amount, and last use. Use ''denies'' if no history"
    },
    {
      "order": 9,
      "name": "Social History",
      "content": "Living situation: ***\nCustody: ***\nEducation: ***\nPeers: ***\nDating history: ***\nAbuse: ***\nReligious/spiritual beliefs: ***\nLegal issues: ***\nLoss: ***",
      "exemplar": "Document comprehensive social context including family structure, school performance, peer relationships, trauma history, and support systems"
    },
    {
      "order": 10,
      "name": "Development History",
      "content": "Birth: ***\nMilestones: ***\nAttachment: ***",
      "exemplar": "Document prenatal/perinatal complications, developmental milestones, and attachment patterns"
    },
    {
      "order": 11,
      "name": "Family Psychiatric History",
      "content": "***",
      "exemplar": "Document family psychiatric history including diagnoses, hospitalizations, suicide attempts, and substance use in biological relatives"
    },
    {
      "order": 12,
      "name": "Medications at Time of Evaluation",
      "content": "***",
      "exemplar": "List all current medications with doses and frequencies"
    },
    {
      "order": 13,
      "name": "Diagnostic Studies",
      "content": "***",
      "exemplar": "Document any relevant lab results, imaging, or other diagnostic studies"
    },
    {
      "order": 14,
      "name": "Physical Exam",
      "content": "@VSRANGES@\n\nPertinent Physical Exam: ***",
      "exemplar": "Document vital signs and any pertinent physical exam findings"
    },
    {
      "order": 15,
      "name": "Psychiatric Examination",
      "content": "General Appearance: ***\nBehavior: ***\nEye Contact: ***\nAffect: ***\nMood: ***\nSpeech: ***\nThought Process/Associations: ***\nIdeations: ***\nBehaviors: ***\nHallucinations/Delusions: ***\nOther Thought Content: ***\nMental Status: On mini-mental status examination, the patient is alert and oriented x3. Recall was 3/3 at 0 and 3/3 at 5 minutes. World was correctly spelled forwards and backwards. Recognition, repetition, and simple commands are intact. Proverbs: Don''t cry over spilled milk equals \"***\". Similarities: Ball and orange equal \"***\". Train and car equal \"***\". Tree and elephant equal \"***\".\nInsight: ***\nJudgement: ***\nMotivation: ***\nPatient Strengths: ***\nPatient Weaknesses: ***",
      "exemplar": "Document comprehensive mental status exam findings"
    },
    {
      "order": 16,
      "name": "Risk Assessment",
      "content": "Suicide Risk Factors:\n***\n\nSuicide Protective Factors:\n***\n\nOther Risks:\n***",
      "exemplar": "Comprehensively assess risk factors and protective factors"
    },
    {
      "order": 17,
      "name": "Initial Formulation",
      "content": "***\n@NAME@ ***is/is not genetically predisposed to *** as evident by mental illness in both immediate and distant family members. There are no genetic or cognitive disorders that would contribute to *** symptomology. There is no history of substance use or in utero exposures that would negatively impact *** neurocognitive development.\n\nFurther assessment will be needed to determine the appropriate diagnoses as well as to guide treatment. @NAME@ requires hospitalization to address safety concerns and to make plans for future treatment. Likely both medications and therapy will be needed to address symptoms.",
      "exemplar": "Provide a comprehensive biopsychosocial formulation integrating all gathered information"
    },
    {
      "order": 18,
      "name": "Diagnosis",
      "content": "***",
      "exemplar": "List all relevant psychiatric and medical diagnoses"
    },
    {
      "order": 19,
      "name": "Treatment Plan",
      "content": "Physician will meet with patient one-on-one to assess for changes in signs or symptoms of the problem(s) that led to patient''s inpatient psychiatric admission as well as provide education about diagnosis-specific medications and evaluate their effectiveness.\n\nInterventions include:\n\nMedication Intervention: ***\n\nTherapeutic Interventions:\nTherapeutic milieu and groups.\nIT and FT with team therapist.\n\nDischarge Criteria: ***\nExpected length of stay is *** days.\nAnticipated disposition: ***",
      "exemplar": "Detail comprehensive treatment plan including medications, therapy modalities, and discharge planning"
    },
    {
      "order": 20,
      "name": "Summary of Services",
      "content": "I spent *** minutes providing care for the patient today, including floor time. More than 50% of this time consisted of counseling and coordination of care, as detailed in the above notes.",
      "exemplar": "Document time spent and nature of services provided"
    }
  ]'::jsonb,
  NULL,
  NULL,
  true,
  'migration_011'
);

-- =====================================================
-- TEENSCOPE SOUTH - FOLLOW-UP (Daily Progress Note)
-- =====================================================
INSERT INTO templates (
  template_id,
  name,
  setting,
  visit_type,
  version,
  sections,
  smarttools,
  staffing_config,
  active,
  created_by
) VALUES (
  'teenscope_south_followup_v1',
  'Teenscope South - Follow-up',
  'Teenscope South',
  'Follow-up',
  1,
  '[
    {
      "order": 1,
      "name": "Header",
      "content": "Psychiatric Attending Daily Progress Note\n\nAdmission Date: @ADMITDT@\nMRN: @MRN@",
      "exemplar": "Use admission date and MRN from patient record"
    },
    {
      "order": 2,
      "name": "ID",
      "content": "@NAME@ is a @AGE@ @SEX@.",
      "exemplar": "Extract patient demographics"
    },
    {
      "order": 3,
      "name": "Reason for Hospitalization",
      "content": "{BH Reason for Admission AME:304310010}",
      "exemplar": "Brief summary of admission reason using SmartList"
    },
    {
      "order": 4,
      "name": "Interval History",
      "content": "Pre-interview Review:\nHome notes, DBT and night writing assignments were reviewed, when available. Staff and therapist notes reviewed. Of note, ***.\n\nPer patient:\n***\n\nPer collateral:\n***\n\nMedical ROS: ***\nMood: ***\nAnxiety: ***\nSI: ***\nSHI: ***\nAggressive ideations/Homicidal ideations: ***\n\nMedications were reviewed and patient was *** compliant with all scheduled meds. VS reviewed and stable***. Care team continues to provide education, insight, motivation, and support during our conversations with the patient.",
      "exemplar": "Document changes since last note including patient report and collateral information if available. Include review of therapeutic assignments, staff observations, symptom updates, and medication compliance"
    },
    {
      "order": 5,
      "name": "Review of Systems",
      "content": "Energy Level: {BH Energy Level:304260290}\nSleep: {BH Sleep:304260300}\nAppetite/Gastrointestinal: {BH Appetite - Gastrointestinal:304260310}\nMusculoskeletal: {BH Musculoskeletal:304260320}\nNeurological: {BH Neurological:304260330}\nSkin/Integumentary: {BH Integumentary:304260340}\nAttitude: {BH Attitude:304260350}",
      "exemplar": "Complete review of systems using appropriate SmartLists"
    },
    {
      "order": 6,
      "name": "Psychiatric Examination",
      "content": "General Appearance: {General Appearance:9231}\nBehavior: {Behavior:9234}\nEye Contact: {Eye Contact:9232}\nAffect: {Affect:9225}\nMood: {Mood:304260510}\nSpeech: {Speech:9228}\nThought Process/Associations: {Thought Processes:9233}\nIdeations: {Ideations:9229}\nBehaviors: {Behaviors:304260640}\nHallucinations/Delusions: {Hallucinations:304260520}\nOther Thought Content: {Other Thought Content:304260530}\nMental Status/Cognition: {Memory Status and Cognition:304260580}\nMemory: {Memory:304260590}\nInsight: {Insight:9337}\nJudgement: {Judgement:9340}\nMedication Side Effects: {Medication Side Effects:304260600}",
      "exemplar": "Document current mental status exam findings"
    },
    {
      "order": 7,
      "name": "Physical Exam",
      "content": "@LASTVITALS@",
      "exemplar": "Document most recent vital signs"
    },
    {
      "order": 8,
      "name": "Diagnostic Studies",
      "content": "Radiology Results\n@RISRSLTIP@\n{Imaging Review:304720038:x}\n\nLab Results\n@RESULTRCNTLAB(36h)@",
      "exemplar": "Include any new lab or imaging results from past 36 hours"
    },
    {
      "order": 9,
      "name": "Risk Assessment",
      "content": "Continued Hospital Treatment\n{Continued Hospital Treatment:304260570}\nSuicide Risk Factors\n{Suicde Risk Factors:304260260}\nSuicide Protective Factors\n{Suicide Protective Factors:304260270}\nOther Risks\n{Other Risks:304260450}",
      "exemplar": "Update risk assessment with current factors"
    },
    {
      "order": 10,
      "name": "Diagnoses",
      "content": "@HPROBLEMLISTIP@\n@PROB@",
      "exemplar": "List current diagnoses"
    },
    {
      "order": 11,
      "name": "Formulation and Treatment Plan",
      "content": "@NAME@ is a @AGE@ @SEX@ with history of *** who presented voluntary/involuntary with ***.\n\nOverall, patient is improving with treatment with ***, which they''ve received for *** days.\n\nPsychiatrist/***\nTherapist/***\n\nTherapeutic Interventions\n- Pt will benefit from the therapeutic milieu, group and supportive therapy.\n\nDiagnostic clarification\nDiagnostic clarification to be gained through collateral information from outside providers, observation and serial interviews.\n- ***\n\nPharmacologic interventions\nHome medications:\n\n#[Psych Problem 1]\n#[Psych Problem 2]\n- (Continue, Start, Increase, Decrease, Cross-titrate) [Medication] [dosage] [units] [time interval] for [clinical reason]\n\nMedical interventions\nmonitor VS and somatic complaints\n\n#[Medical Problem 1]\n#[Medical Problem 2]\n- (Continue, Start, Increase, Decrease, Cross-titrate) [Medication] [dosage] [units] [time interval] for [clinical reason]\n\nObtained baseline labs: ***\n\nDischarge\nPatient to be discharged upon {Discharge Criteria:304260620}\nThe patient length of stay is estimated at: ***.\n\nAnticipated disposition {BH Disposition:304260370}",
      "exemplar": "Provide comprehensive update on treatment progress and plans. Include medication changes, therapy updates, and discharge planning"
    },
    {
      "order": 12,
      "name": "Teenscope Medications",
      "content": "Teenscope Medications:\n\n@MEDSSCHEDULED@\n\n\nRufus Sweeney, MD\nPGY-3, Psychiatry",
      "exemplar": "List all current scheduled medications"
    }
  ]'::jsonb,
  NULL,
  NULL,
  true,
  'migration_011'
);

-- Verify insertion
SELECT template_id, name, setting, visit_type, active
FROM templates
WHERE setting = 'Teenscope South'
ORDER BY visit_type;