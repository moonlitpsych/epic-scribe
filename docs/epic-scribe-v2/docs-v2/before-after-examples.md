# Epic Scribe v2 - Before/After Output Examples

## BEFORE (Current epic-scribe) vs AFTER (epic-scribe-v2)

### History of Present Illness

#### ❌ BEFORE (Too Condensed):
```
The patient reports depression and anxiety for several months with sleep difficulties and decreased appetite. Previously tried medication with partial response.
```

#### ✅ AFTER (Detailed, Temperature 0.7):
```
The patient is a 35-year-old male who first noticed depressive symptoms approximately 3 months ago, shortly after being laid off from his position as a software engineer at TechCorp where he had worked for 7 years. He describes his mood as "consistently low, about a 3 out of 10 most days" with particular worsening in the morning hours. Sleep has been significantly impacted with initial insomnia, taking 2-3 hours to fall asleep, and early morning awakening at 4 AM unable to return to sleep. He reports "my mind just races with worry about finances and finding a new job." Appetite has decreased substantially with an unintentional 12-pound weight loss over the past 2 months, stating "food just doesn't taste good anymore."

The patient previously tried sertraline 50mg daily for 6 weeks in 2019 during another depressive episode with "maybe 40% improvement" but discontinued due to sexual side effects. He also tried bupropion 150mg XL which caused increased anxiety and insomnia after 2 weeks. Current symptoms have progressively worsened despite attempting self-help measures including exercise, meditation apps, and vitamin D supplementation. His wife encouraged him to seek help after he mentioned "sometimes thinking everyone would be better off without me" though he denies any specific suicidal plans or intent.
```

### Psychiatric History

#### ❌ BEFORE (Vague):
```
History of depression treated with medications. Some past therapy. No hospitalizations mentioned.
```

#### ✅ AFTER (Specific with Critical Items):
```
Previous diagnoses: Major Depressive Disorder diagnosed 2019 by Dr. Smith, Generalized Anxiety Disorder diagnosed 2020
Previous medications: Sertraline 50mg (partial response, sexual side effects), Bupropion 150mg XL (increased anxiety), Escitalopram 10mg (GI upset)
Hospitalizations: Denies any psychiatric hospitalizations
Suicide attempts: Denies any previous suicide attempts
Self-harm history (NSSIB): Remote history of cutting on forearms age 16-17 during parents' divorce, none since
Previous therapy: CBT with Dr. Johnson 2019-2020 for 6 months, "helpful but stopped when insurance changed"
```

### Mental Status Examination

#### ❌ BEFORE (Mixed Format):
```
Appearance: The patient appeared well-groomed and appropriately dressed for the weather. 
Mood/Affect: Mood "depressed", affect congruent
Thought: Linear and goal-directed without evidence of psychosis
The patient denied suicidal ideation but endorsed passive thoughts
```

#### ✅ AFTER (All SmartLists):
```
Appearance: {Appearance:304120401:: "Well-groomed, appropriate dress, Appears stated age"}
Behavior: {Behavior:304120402:: "Cooperative, Psychomotor retardation"}
Eye Contact: {Eye Contact:304120403:: "Good eye contact"}
Speech: {Speech:304120404:: "Normal rate, Soft volume"}
Mood: {Mood:304120405:: "Depressed"}
Affect: {Affect:304120406:: "Congruent, Restricted range"}
Thought Process: {Thought Process:304120407:: "Linear and goal-directed"}
Thought Content: {Thought Content:304120408:: "No delusions, No paranoia, Ruminations about job loss"}
Perceptual Disturbances: {Perceptual Disturbances:304120409:: "None reported"}
Suicidal Ideation: {Suicidal Ideation:304120410:: "Passive ideation without plan or intent"}
Homicidal Ideation: {Homicidal Ideation:304120411:: "Denies"}
Insight: {Insight:304120412:: "Good"}
Judgment: {Judgment:304120413:: "Fair"}
```

### Formulation

#### ❌ BEFORE (Unstructured):
```
This patient presents with moderate to severe depression following job loss with significant functional impairment. The diagnosis is consistent with Major Depressive Disorder. There may be some anxiety component as well. Biological factors include family history. Treatment will include medication and therapy.
```

#### ✅ AFTER (Exactly 4 Paragraphs):
```
Jeremy Montoya is a 35 year old male with history of Major Depressive Disorder and Generalized Anxiety Disorder who presents for psychiatric evaluation following recent job loss and worsening depression.

The patient's diagnosis is most consistent with Major Depressive Disorder, moderate severity, single episode (F32.1) because of the presence of five or more DSM-5 criteria including depressed mood, anhedonia, insomnia, decreased appetite with weight loss, psychomotor retardation, fatigue, feelings of worthlessness, difficulty concentrating, and passive suicidal ideation for greater than 2 weeks with significant functional impairment. From a biological perspective, there is a positive family history of depression in mother and maternal aunt suggesting genetic vulnerability, with no current medical conditions contributing though low vitamin D noted. Psychologically, the patient demonstrates negative cognitive distortions including catastrophic thinking about the future, self-blame for job loss despite company-wide layoffs, and learned helplessness pattern. Socially, recent job loss has created significant financial strain with loss of health insurance, role transition from provider to unemployed, and social isolation from former work colleagues, though protective factors include supportive spouse and stable housing.

Also considered are Adjustment Disorder with Depressed Mood, Major Depressive Disorder with Anxious Distress, and Persistent Depressive Disorder. Adjustment Disorder with Depressed Mood is less likely because symptoms exceed what would be expected from the stressor alone and meet full criteria for MDD with neurovegetative symptoms. Major Depressive Disorder with Anxious Distress should be specified given concurrent anxiety symptoms including restlessness, worry, and tension. Persistent Depressive Disorder is ruled out as symptoms have been present for 3 months rather than 2+ years.

Plan is to initiate antidepressant pharmacotherapy with an SSRI, begin weekly cognitive behavioral therapy, provide supportive psychotherapy today, and ensure safety planning as follows:
```

### Plan

#### ❌ BEFORE (Unstructured):
```
1. Start sertraline 50mg daily
2. Refer to therapy
3. F/u 2 weeks
- Discussed coping strategies
- Labs: TSH, CBC
```

#### ✅ AFTER (Structured Subsections):
```
Medications:
Start sertraline 50 mg daily for depression - patient had partial response previously, willing to retry at higher dose with plan to titrate
Start trazodone 50 mg qhs prn for insomnia - avoiding benzodiazepines given depression
Continue vitamin D 2000 IU daily - low level on recent PCP labs

Referral to Psychotherapy:
Refer to Dr. Sarah Chen for cognitive behavioral therapy weekly focusing on cognitive restructuring and behavioral activation for depression
Patient agreeable and has verified insurance coverage for 20 sessions

Therapy:
Supportive psychotherapy provided today focusing on validation of job loss experience, normalization of depressive symptoms, and psychoeducation about depression as a medical condition. Collaborated on behavioral activation schedule including daily walks and one pleasant activity. Reviewed sleep hygiene strategies. Session duration: 25 minutes.

Follow-up:
Return in 2 weeks on .DATE at .TIME via telemedicine for medication monitoring and therapy, or sooner if needed

Rufus Sweeney, MD
```

### Substance Use History

#### ❌ BEFORE (Paragraph Format):
```
The patient drinks socially on weekends. Denies illicit drug use. Smoked marijuana in college. No tobacco use.
```

#### ✅ AFTER (SmartList + Details):
```
Alcohol: {Alcohol Use:304120201:: "Social use only"} 2-3 beers on weekends, no history of withdrawal or blackouts, no DUIs
Cannabis: {Cannabis Use:304120202:: "Previous recreational use, now abstinent"} Used regularly in college, none in past 10 years
Tobacco/Nicotine: {Tobacco Use:304120203:: "Never used"}
Cocaine: {Cocaine Use:304120204:: "Never used"}
Amphetamines: {Amphetamine Use:304120205:: "Never used"} 
Opioids: {Opioid Use:304120206:: "Never used"}
Benzodiazepines: {Benzodiazepine Use:304120207:: "Never used"}
Other substances: {Other Substances:304120208:: "Never used"}
```

### Social History

#### ❌ BEFORE (Brief):
```
Married, lives with spouse. Recently unemployed. College educated.
```

#### ✅ AFTER (SmartList + Context):
```
Living Situation: {Living Situation:304120301:: "Lives with spouse/partner"} Stable housing in 2-bedroom apartment, no risk of eviction
Employment: {Employment Status:304120302:: "Unemployed"} Laid off 3 months ago from software engineer position, actively job searching, receiving unemployment benefits
Relationship: {Relationship Status:304120303:: "Married"} Married 8 years, describes relationship as "supportive but strained by financial stress"
Education: {Education Level:304120304:: "Bachelor's degree"} BS in Computer Science from State University
Support System: {Support System:304120305:: "Good support"} Supportive spouse, parents live nearby and help financially, two close friends
Financial: {Financial Status:304120306:: "Financial stress"} Unemployment benefits ending soon, using savings, spouse working part-time
Legal: {Legal Issues:304120307:: "No legal issues"}
```

## KEY DIFFERENCES SUMMARY

| Section | Before | After |
|---------|--------|-------|
| HPI | 1 paragraph, condensed | 2-3 paragraphs, all details |
| Psych History | Vague, uncertain | Explicit, structured |
| MSE | Mixed format | All SmartLists |
| Formulation | Unstructured | Exactly 4 paragraphs |
| Plan | Bullets/numbered | Named subsections |
| Substance Use | Paragraph | SmartList + details |
| Social History | Brief mentions | SmartList + context |

## VALIDATION POINTS

### ✅ MUST HAVE:
1. Formulation = 4 paragraphs exactly
2. Plan has all 5 subsections (Meds, Referral, Therapy, F/U, Signature)
3. MSE uses only SmartLists
4. HPI is detailed (2-3+ paragraphs)
5. Ends with "Rufus Sweeney, MD"

### ❌ MUST NOT HAVE:
1. Bullet points anywhere
2. Numbered lists
3. Inferred psychiatric history
4. Wildcards in MSE
5. Missing SmartList selections
6. Condensed HPI
7. Less than 4 formulation paragraphs

## EPIC PASTE TEST

The final output should paste into Epic with:
- All .dotphrases properly formatted
- All SmartLists showing as {Name:ID:: "selection"}
- No formatting errors
- No extra line breaks or spacing issues
- Signature at the very end

## Testing Note

Use this document to verify that epic-scribe-v2 output matches the "AFTER" examples, not the "BEFORE" examples.