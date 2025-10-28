# Epic Scribe v2 - Detailed Implementation Plan

## Overview
This document provides Claude Code with specific, actionable instructions to transform epic-scribe into epic-scribe-v2 based on Dr. Rufus Sweeney's adaptation requirements.

---

## 1. HISTORY OF PRESENT ILLNESS (HPI) CHANGES

### Current Problem
- LLM condenses too much, losing important clinical details
- Temperature is too low (0.4-0.5)

### Required Changes

#### File: `/services/note/src/prompts/psychiatric-prompt-builder.ts`

**Line 15-30 (approximately)** - Locate the `SECTION_PROMPT_CONFIGS` object and find the HPI section:

```typescript
// CHANGE FROM:
'History of Present Illness': {
  sectionName: 'History of Present Illness',
  temperature: 0.5,
  instructions: `[current instructions]`,
  format: 'narrative'
}

// CHANGE TO:
'History of Present Illness': {
  sectionName: 'History of Present Illness',
  temperature: 0.7,  // INCREASED for more detail retention
  instructions: `Generate a comprehensive HPI that captures ALL clinically relevant details from the transcript.
    
    CRITICAL REQUIREMENTS:
    - Include specific timelines and dates mentioned
    - Preserve exact symptom descriptions and severity scales used by patient
    - Include ALL medications mentioned with doses and responses
    - Document precipitating factors, exacerbating/alleviating factors
    - Include patient's own words in quotes when clinically relevant
    - Capture social context that impacts presentation
    - Document previous treatment attempts and responses
    - Include functional impairment details
    
    DO NOT:
    - Summarize or condense information
    - Omit "minor" details - everything is potentially relevant
    - Use generic phrases when specific information is available
    
    Length: Aim for 2-3 full paragraphs minimum, more if needed to capture all details.`,
  format: 'detailed_narrative'
}
```

---

## 2. PSYCHIATRIC HISTORY ENHANCEMENTS

### Required Changes

#### File: `/services/note/src/templates/psychiatric-focused-template.ts`

**Lines 35-45 (approximately)** - Update the Psychiatric History section:

```typescript
// CHANGE FROM:
{
  order: 3,
  name: 'Psychiatric History',
  content: '***',
  exemplar: '[current exemplar]'
}

// CHANGE TO:
{
  order: 3,
  name: 'Psychiatric History',
  content: `Previous diagnoses: ***
Previous medications: ***
Hospitalizations: ***
Suicide attempts: ***
Self-harm history (NSSIB): ***
Previous therapy: ***`,
  exemplar: `Previous diagnoses: Major Depressive Disorder diagnosed 2019, Generalized Anxiety Disorder diagnosed 2020
Previous medications: Tried sertraline 100mg (partial response), escitalopram 20mg (GI side effects)
Hospitalizations: One psychiatric hospitalization in 2019 for severe depression with SI, 5-day stay at Regional Medical Center
Suicide attempts: Denies any previous suicide attempts
Self-harm history (NSSIB): Remote history of cutting in teenage years, none in past 10 years
Previous therapy: CBT with Dr. Johnson 2019-2020, found helpful but stopped due to insurance`
}
```

#### File: `/services/note/src/prompts/psychiatric-prompt-builder.ts`

**Add new section config:**

```typescript
'Psychiatric History': {
  sectionName: 'Psychiatric History',
  temperature: 0.3,  // Low temperature for accuracy
  instructions: `Extract psychiatric history with EXTREME ACCURACY for these critical items:
    
    HOSPITALIZATIONS:
    - Only include if explicitly mentioned in transcript
    - Include dates, duration, facility name, and reason
    - If uncertain, state "Unable to confirm from transcript"
    
    SUICIDE ATTEMPTS:
    - CRITICAL: Only document if explicitly stated
    - Include method, date, and medical intervention if mentioned
    - Never infer or assume - must be directly stated
    - Default to "Denies" if asked but negative
    
    SELF-HARM (NSSIB):
    - Document only what is explicitly mentioned
    - Include method, frequency, last occurrence
    - Distinguish from suicide attempts
    - Default to "Denies" if asked but negative
    
    For all other history, be comprehensive but only include what is mentioned.`,
  format: 'structured_with_wildcards'
}
```

---

## 3. PSYCHIATRIC REVIEW OF SYSTEMS (ROS) - SMARTLIST CONVERSION

### Required Changes

#### File: `/configs/smartlists-catalog.json`

**Add these SmartList definitions** (append to existing file):

```json
{
  "304120106": {
    "epicId": "304120106",
    "displayName": "Sleep Quality",
    "category": "Psychiatric ROS",
    "options": [
      "Normal sleep pattern",
      "Initial insomnia",
      "Middle insomnia", 
      "Terminal insomnia",
      "Hypersomnia",
      "Nightmares",
      "Sleep not assessed"
    ],
    "defaultValue": "Sleep not assessed",
    "allowMultiple": false
  },
  "304120107": {
    "epicId": "304120107", 
    "displayName": "Appetite",
    "category": "Psychiatric ROS",
    "options": [
      "Normal appetite",
      "Increased appetite",
      "Decreased appetite",
      "No appetite",
      "Binge eating",
      "Appetite not assessed"
    ],
    "defaultValue": "Appetite not assessed",
    "allowMultiple": false
  },
  "304120108": {
    "epicId": "304120108",
    "displayName": "Mood",
    "category": "Psychiatric ROS",
    "options": [
      "Euthymic",
      "Depressed",
      "Anxious", 
      "Irritable",
      "Euphoric",
      "Labile",
      "Mood not assessed"
    ],
    "defaultValue": "Mood not assessed",
    "allowMultiple": false
  }
}
```

**Continue adding SmartLists for:**
- Anxiety Level (304120109)
- Concentration (304120110)
- Energy Level (304120115)
- Guilt/Worthlessness (304120116)
- Anhedonia (304120117)
- Psychomotor Changes (304120118)

---

## 4. SUBSTANCE USE HISTORY - SMARTLIST CONVERSION

### Required Changes

#### File: `/configs/smartlists-catalog.json`

**Add substance use SmartLists:**

```json
{
  "304120201": {
    "epicId": "304120201",
    "displayName": "Alcohol Use",
    "category": "Substance Use",
    "options": [
      "Never used",
      "Social use only",
      "Previous problematic use, now sober",
      "Current mild use disorder",
      "Current moderate use disorder", 
      "Current severe use disorder",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": false
  },
  "304120202": {
    "epicId": "304120202",
    "displayName": "Cannabis Use",
    "category": "Substance Use",
    "options": [
      "Never used",
      "Experimental use only",
      "Occasional recreational use",
      "Daily medicinal use",
      "Daily recreational use",
      "Previous problematic use, now abstinent",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": false
  }
}
```

**Add similar SmartLists for:**
- Tobacco/Nicotine (304120203)
- Cocaine (304120204)
- Amphetamines (304120205)
- Opioids (304120206)
- Benzodiazepines (304120207)
- Other substances (304120208)

#### File: `/services/note/src/templates/psychiatric-focused-template.ts`

**Update Substance Use History section:**

```typescript
{
  order: 6,
  name: 'Substance Use History',
  content: `Alcohol: {Alcohol Use:304120201} ***
Cannabis: {Cannabis Use:304120202} ***
Tobacco/Nicotine: {Tobacco Use:304120203} ***
Cocaine: {Cocaine Use:304120204} ***
Amphetamines: {Amphetamine Use:304120205} ***
Opioids: {Opioid Use:304120206} ***
Benzodiazepines: {Benzodiazepine Use:304120207} ***
Other substances: {Other Substances:304120208} ***`,
  exemplar: `Alcohol: Social use only - patient reports 1-2 drinks per week, wine with dinner, no history of withdrawal or blackouts
Cannabis: Never used
Tobacco/Nicotine: Previous problematic use, now sober - quit smoking 2 years ago after 10 pack-year history
[continue for all substances]`
}
```

---

## 5. SOCIAL HISTORY - SMARTLIST CONVERSION

### Required Changes

#### File: `/configs/smartlists-catalog.json`

**Add social history SmartLists:**

```json
{
  "304120301": {
    "epicId": "304120301",
    "displayName": "Living Situation",
    "category": "Social History",
    "options": [
      "Lives alone",
      "Lives with family",
      "Lives with spouse/partner",
      "Lives with roommates",
      "Homeless",
      "Assisted living",
      "Group home",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": false
  },
  "304120302": {
    "epicId": "304120302",
    "displayName": "Employment Status",
    "category": "Social History",
    "options": [
      "Employed full-time",
      "Employed part-time",
      "Unemployed",
      "Disabled",
      "Retired",
      "Student",
      "Homemaker",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": false
  }
}
```

**Add SmartLists for:**
- Relationship Status (304120303)
- Education Level (304120304)
- Support System (304120305)
- Financial Status (304120306)
- Legal Issues (304120307)

---

## 6. MENTAL STATUS EXAM - FULL SMARTLIST CONVERSION

### Required Changes

#### File: `/configs/smartlists-catalog.json`

**Add MSE SmartLists for ALL components:**

```json
{
  "304120401": {
    "epicId": "304120401",
    "displayName": "Appearance",
    "category": "Mental Status Exam",
    "options": [
      "Well-groomed, appropriate dress",
      "Disheveled",
      "Bizarre dress",
      "Appears stated age",
      "Appears older than stated age",
      "Appears younger than stated age",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": true
  },
  "304120402": {
    "epicId": "304120402",
    "displayName": "Behavior",
    "category": "Mental Status Exam", 
    "options": [
      "Cooperative",
      "Uncooperative",
      "Agitated",
      "Calm",
      "Restless",
      "Psychomotor retardation",
      "Psychomotor agitation",
      "Not assessed"
    ],
    "defaultValue": "Not assessed",
    "allowMultiple": true
  }
}
```

**Continue for all MSE components:**
- Eye Contact (304120403)
- Speech (304120404)
- Mood (304120405)
- Affect (304120406)
- Thought Process (304120407)
- Thought Content (304120408)
- Perceptual Disturbances (304120409)
- Suicidal Ideation (304120410)
- Homicidal Ideation (304120411)
- Insight (304120412)
- Judgment (304120413)

#### File: `/services/note/src/templates/psychiatric-focused-template.ts`

**Replace entire MSE section with SmartList version:**

```typescript
{
  order: 7,
  name: 'Mental Status Examination',
  content: `Appearance: {Appearance:304120401}
Behavior: {Behavior:304120402}
Eye Contact: {Eye Contact:304120403}
Speech: {Speech:304120404}
Mood: {Mood:304120405}
Affect: {Affect:304120406}
Thought Process: {Thought Process:304120407}
Thought Content: {Thought Content:304120408}
Perceptual Disturbances: {Perceptual Disturbances:304120409}
Suicidal Ideation: {Suicidal Ideation:304120410}
Homicidal Ideation: {Homicidal Ideation:304120411}
Insight: {Insight:304120412}
Judgment: {Judgment:304120413}`,
  exemplar: `[Provide example with all SmartLists filled]`
}
```

---

## 7. FORMULATION - 4-PARAGRAPH STRUCTURE

### Required Changes

#### File: `/services/note/src/prompts/psychiatric-prompt-builder.ts`

**Lines 180-220 (approximately)** - Replace entire Formulation section config:

```typescript
'Formulation': {
  sectionName: 'Formulation',
  temperature: 0.6,
  instructions: `Generate EXACTLY 4 paragraphs following this EXACT structure:

    PARAGRAPH 1 - Patient One-Liner:
    "[First name] [Last name] is a [age] year old [sex/gender] with history of [psychiatric history - list diagnoses only] who presents for [reason for presentation - be specific]."
    - Keep to ONE sentence
    - Be concise but complete
    
    PARAGRAPH 2 - Diagnosis Statement with Biopsychosocial Support:
    Start with: "The patient's diagnosis is most consistent with [primary diagnosis with ICD-10 code] because of [specific DSM-5 criteria met]."
    Then add: "From a biological perspective, [genetics, medical factors, substances]. Psychologically, [cognitive patterns, personality factors, coping styles]. Socially, [stressors, support, cultural factors]."
    - Must explicitly state DSM-5 criteria
    - Must address all three domains (bio/psycho/social)
    
    PARAGRAPH 3 - Differential Diagnosis:
    Start with: "Also considered are [list other possible diagnoses]."
    Then for each: "[Diagnosis] is [less/more] likely because [specific evidence for or against]."
    - Include at least 2-3 differential diagnoses
    - Provide specific reasoning for each
    
    PARAGRAPH 4 - Treatment Direction:
    Start with: "Plan is to [primary interventions] as follows:"
    - State the main treatment approach
    - This is a brief transition to the Plan section
    - End with colon to lead into Plan section
    
    FORMATTING RULES:
    - Each paragraph must be distinct and separated
    - No bullet points or lists
    - Use complete sentences
    - Keep medical terminology precise`,
  format: 'four_paragraph_structure'
}
```

#### File: `/services/note/src/templates/psychiatric-focused-template.ts`

**Update Formulation exemplar to show exact 4-paragraph structure:**

```typescript
exemplar: `Jeremy Montoya is a 35 year old male with history of Major Depressive Disorder and Generalized Anxiety Disorder who presents for initial psychiatric evaluation.

The patient's diagnosis is most consistent with Major Depressive Disorder, moderate severity (F32.1) because of the presence of depressed mood, anhedonia, insomnia, decreased appetite with 10-pound weight loss, psychomotor retardation, fatigue, feelings of worthlessness, and difficulty concentrating for the past 3 months. From a biological perspective, there is a positive family history of depression in mother and maternal grandmother suggesting genetic vulnerability, with no current medical conditions or substance use contributing. Psychologically, the patient demonstrates negative cognitive distortions, catastrophic thinking, and poor coping strategies in response to stressors. Socially, recent job loss has created financial strain and role transition difficulties, though protective factors include stable marriage and supportive family.

Also considered are Adjustment Disorder with Depressed Mood, Bipolar II Disorder, and Persistent Depressive Disorder. Adjustment Disorder is less likely because symptoms exceed what would be expected from the stressor alone and meet full criteria for MDD. Bipolar II Disorder was ruled out as patient denies any history of hypomanic episodes with careful screening. Persistent Depressive Disorder is less likely given the acute onset 3 months ago rather than chronic course.

Plan is to initiate antidepressant therapy with an SSRI, refer for cognitive behavioral therapy, and provide supportive psychotherapy as follows:`
```

---

## 8. PLAN SECTION - SPECIFIC FORMATTING

### Required Changes

#### File: `/services/note/src/templates/psychiatric-focused-template.ts`

**Replace Plan section entirely:**

```typescript
{
  order: 9,
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
Start sertraline 50 mg daily for depression - patient agreeable to SSRI trial given previous partial response to different SSRI
Continue gabapentin 300 mg TID for anxiety - stable and effective per patient

Referral to Psychotherapy:
Refer to CBT therapist for weekly sessions focusing on cognitive restructuring and behavioral activation
Patient expressed interest in therapy and insurance covers 20 sessions

Therapy:
Supportive psychotherapy provided today focusing on validation, psychoeducation about depression, and development of safety plan. Discussed behavioral activation strategies and importance of medication compliance. Session duration: 25 minutes.

Follow-up:
Return in 2 weeks on [DATE] at [TIME] via telemedicine for medication monitoring and therapy, or sooner if needed

Rufus Sweeney, MD`
}
```

#### File: `/services/note/src/prompts/psychiatric-prompt-builder.ts`

**Add Plan section config:**

```typescript
'Plan': {
  sectionName: 'Plan',
  temperature: 0.4,
  instructions: `Format the plan with these EXACT subsections and requirements:

    MEDICATIONS:
    - Each medication on its own line
    - Format: "[Action] [medication] [dose] [frequency] for [indication]"
    - Actions: Start, Continue, Increase, Decrease, Discontinue, Taper
    - For changes, include reason: "- [reason for change]"
    - Example: "Start sertraline 50 mg daily for depression - patient agreeable to SSRI trial"
    - Example: "Increase sertraline from 50 mg to 100 mg daily - partial response at current dose"
    
    REFERRAL TO PSYCHOTHERAPY:
    - State if referring to therapy or continuing current therapy
    - Specify type (CBT, DBT, EMDR, psychodynamic, etc.)
    - Include frequency if mentioned
    - If continuing: "Continue individual psychotherapy with current therapist"
    - If referring: "Refer to [type] therapy for [frequency] sessions focusing on [goals]"
    
    THERAPY:
    - Document therapy YOU provided in this session
    - Include: 1) Type of therapy used
    - 2) Main themes discussed
    - 3) Interventions or techniques used
    - 4) Approximate duration in minutes
    - Example: "Supportive psychotherapy provided today focusing on validation and coping strategies. Discussed sleep hygiene and stress management techniques. Session duration: 20 minutes."
    
    FOLLOW-UP:
    - Format: "Return in [timeframe] on [use DATE placeholder] at [use TIME placeholder] via [in-person/telemedicine] for [purpose], or sooner if needed"
    - Always end with "or sooner if needed"
    - Example: "Return in 2 weeks on [DATE] at [TIME] via telemedicine for medication monitoring, or sooner if needed"
    
    End with signature: "Rufus Sweeney, MD"`,
  format: 'structured_subsections'
}
```

---

## 9. SMARTLIST EDITOR UI IMPROVEMENTS

### Required Changes

#### File: `/apps/web/app/smartlists/page.tsx`

**Add "Quick Add" button at top of page:**

```typescript
// After line 50 (approximately), add:
<div className="mb-6 flex justify-between items-center">
  <button
    onClick={() => setShowQuickAdd(true)}
    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
  >
    <svg className="w-5 h-5" /* plus icon */> 
    Quick Add SmartList
  </button>
  <div className="text-sm text-gray-600">
    Tip: SmartLists allow the AI to select from predefined options, ensuring consistency
  </div>
</div>
```

#### File: `/apps/web/components/QuickAddSmartList.tsx`

**Create new component:**

```typescript
export function QuickAddSmartList({ onAdd, onClose }) {
  const categories = [
    'Psychiatric ROS',
    'Substance Use',
    'Social History', 
    'Mental Status Exam',
    'Treatment Planning'
  ];

  return (
    <div className="modal">
      <h2>Quick Add SmartList</h2>
      <form>
        <label>Category</label>
        <select>{categories.map(c => <option>{c}</option>)}</select>
        
        <label>Display Name</label>
        <input type="text" placeholder="e.g., Sleep Quality" />
        
        <label>Epic ID</label>
        <input type="text" placeholder="e.g., 304120106" />
        
        <label>Options (one per line)</label>
        <textarea rows={6} placeholder="Normal sleep
Initial insomnia
Middle insomnia
Terminal insomnia" />
        
        <label>Default Value</label>
        <input type="text" placeholder="e.g., Not assessed" />
        
        <button type="submit">Add SmartList</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}
```

---

## 10. TEMPERATURE OPTIMIZATION BY SECTION

### Required Changes

#### File: `/services/note/src/llm/gemini-client.ts`

**Lines 100-150 (approximately)** - Add section-specific temperature handling:

```typescript
// Add method to apply section-specific temperature
private getSectionTemperature(sectionName: string): number {
  const sectionTemperatures = {
    'Chief Complaint': 0.2,           // Very low - factual
    'History of Present Illness': 0.7, // Higher - capture all details
    'Psychiatric History': 0.3,        // Low - accuracy critical
    'Current Medications': 0.1,        // Very low - must be exact
    'Substance Use History': 0.4,      // Moderate - some narrative
    'Social History': 0.4,              // Moderate - some narrative
    'Psychiatric Review of Systems': 0.3, // Low - structured
    'Mental Status Examination': 0.2,  // Very low - objective
    'Formulation': 0.6,                // Higher - synthesis needed
    'Plan': 0.4                        // Moderate - structured but personalized
  };
  
  return sectionTemperatures[sectionName] || 0.4;
}
```

---

## 11. VALIDATION ENHANCEMENTS

### Required Changes

#### File: `/services/note/src/validators/note-validator.ts`

**Create new file for enhanced validation:**

```typescript
export class NoteValidator {
  validateFormulation(text: string): ValidationResult {
    const errors = [];
    
    // Check for exactly 4 paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    if (paragraphs.length !== 4) {
      errors.push('Formulation must have exactly 4 paragraphs');
    }
    
    // Check paragraph 1 format
    if (!paragraphs[0]?.match(/^\w+ \w+ is a \d+ year old/)) {
      errors.push('Paragraph 1 must start with patient one-liner format');
    }
    
    // Check paragraph 2 format
    if (!paragraphs[1]?.includes('diagnosis is most consistent with')) {
      errors.push('Paragraph 2 must state primary diagnosis explicitly');
    }
    
    // Check paragraph 3 format
    if (!paragraphs[2]?.startsWith('Also considered')) {
      errors.push('Paragraph 3 must start with "Also considered"');
    }
    
    // Check paragraph 4 format
    if (!paragraphs[3]?.startsWith('Plan is to')) {
      errors.push('Paragraph 4 must start with "Plan is to"');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  validatePlan(text: string): ValidationResult {
    const requiredSections = [
      'Medications:',
      'Referral to Psychotherapy:',
      'Therapy:',
      'Follow-up:',
      'Rufus Sweeney, MD'
    ];
    
    const errors = [];
    requiredSections.forEach(section => {
      if (!text.includes(section)) {
        errors.push(`Missing required section: ${section}`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
}
```

---

## 12. TESTING DATA

### Required Changes

#### File: `/tests/fixtures/test-transcript.txt`

**Create test transcript with all required elements:**

```text
[Create a comprehensive test transcript that includes:]
- Clear HPI with timeline and multiple symptoms
- Previous psychiatric history with hospitalizations
- Explicit mention of no suicide attempts but remote NSSIB
- Complete ROS covering all symptoms
- Substance use history for multiple substances
- Social history details
- Observable MSE findings
- Clear diagnostic criteria for formulation
- Discussion of medications and therapy plans
```

---

## IMPLEMENTATION SEQUENCE FOR CLAUDE CODE

1. **Phase 1: SmartList Infrastructure** (30 min)
   - Add all new SmartLists to catalog
   - Create QuickAdd UI component
   - Test SmartList creation and management

2. **Phase 2: Template Updates** (45 min)
   - Update all template sections with new structure
   - Add SmartList references to all sections
   - Update exemplars with new format

3. **Phase 3: Prompt Engineering** (60 min)
   - Update psychiatric-prompt-builder.ts with new instructions
   - Implement section-specific temperatures
   - Add validation for each section

4. **Phase 4: Validation & Testing** (30 min)
   - Create note-validator.ts
   - Add validation checks to generation flow
   - Test with sample transcripts

5. **Phase 5: UI Polish** (30 min)
   - Add helpful tooltips
   - Improve error messages
   - Add progress indicators

---

## CRITICAL SUCCESS FACTORS

1. **Formulation MUST be exactly 4 paragraphs** with the specified structure
2. **Plan MUST have all subsections** in the exact order specified
3. **Psychiatric History accuracy** is critical for hospitalizations, SA, and NSSIB
4. **HPI must retain details** - increase temperature and length
5. **All SmartLists must have "Not assessed" option** as fallback
6. **Signature must be "Rufus Sweeney, MD"** at end of Plan

---

## TESTING CHECKLIST

- [ ] HPI captures all details from transcript (not condensed)
- [ ] Psychiatric History accurately reflects ONLY what's in transcript
- [ ] All ROS items use SmartLists properly
- [ ] Substance Use has SmartList + narrative for each substance
- [ ] Social History uses SmartLists + wildcards appropriately
- [ ] MSE uses only SmartList selections
- [ ] Formulation has exactly 4 paragraphs in correct format
- [ ] Plan has all required subsections in order
- [ ] Note ends with "Rufus Sweeney, MD"
- [ ] Can manually add new SmartLists via UI
- [ ] Generated note pastes into Epic without formatting issues

---

## FILES TO MODIFY (SUMMARY)

1. `/services/note/src/prompts/psychiatric-prompt-builder.ts` - Section configs
2. `/services/note/src/templates/psychiatric-focused-template.ts` - Template structure
3. `/configs/smartlists-catalog.json` - Add ~30 new SmartLists
4. `/services/note/src/llm/gemini-client.ts` - Temperature handling
5. `/services/note/src/validators/note-validator.ts` - NEW FILE
6. `/apps/web/components/QuickAddSmartList.tsx` - NEW FILE
7. `/apps/web/app/smartlists/page.tsx` - Add Quick Add button
8. `/tests/fixtures/test-transcript.txt` - NEW FILE

---

## NOTES FOR CLAUDE CODE

- Start with SmartList additions - they're foundational
- Test each section independently before full integration
- Use the exemplars as exact formatting guides
- Validation is critical - don't skip it
- The user prioritizes Epic compatibility above all else
- Temperature adjustments are crucial for quality
- Test with multiple transcripts to ensure consistency

This plan should enable Claude Code to systematically transform epic-scribe into the desired epic-scribe-v2 that fully implements Dr. Sweeney's vision.