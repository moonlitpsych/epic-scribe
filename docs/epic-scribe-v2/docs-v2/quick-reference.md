# Epic Scribe v2 - Quick Reference for Claude Code

## Project Location
```bash
cd /Users/macsweeney/Projects/epic-scribe
```

## Key Requirements from Dr. Sweeney

### 1. HPI - "Turn Up the Temperature"
- **Problem:** Currently condenses too much
- **Solution:** Temperature 0.7, preserve ALL details
- **Test:** Should be 2-3 paragraphs minimum

### 2. Formulation - MUST Be 4 Paragraphs
```
Para 1: [Name] is a [age] year old [gender] with history of [dx] who presents for [reason].
Para 2: The patient's diagnosis is most consistent with [dx] because of [criteria]. Bio/Psycho/Social factors.
Para 3: Also considered are [differentials]. [Reasoning for each].
Para 4: Plan is to [treatment approach] as follows:
```

### 3. Plan Format - EXACT Structure
```
Medications:
[Each med on own line with indication]

Referral to Psychotherapy:
[Type and frequency]

Therapy:
[What YOU did in session, duration]

Follow-up:
[Timeframe] or sooner if needed

Rufus Sweeney, MD
```

### 4. Critical Accuracy Items
- **Hospitalizations:** Only if explicitly mentioned
- **Suicide Attempts:** NEVER infer - must be directly stated
- **Self-Harm (NSSIB):** Distinguish from suicide attempts
- **Default to "Denies" if asked but negative**

### 5. SmartList Philosophy
- Every structured item should be a SmartList
- Always include "Not assessed" option
- Psychiatric ROS: All SmartLists
- Substance Use: SmartList + wildcard for details
- Social History: SmartList + wildcard for context
- MSE: ALL SmartLists (no wildcards)

## Temperature Settings by Section

| Section | Temperature | Reason |
|---------|------------|--------|
| Chief Complaint | 0.2 | Factual only |
| HPI | **0.7** | Capture all details |
| Psychiatric History | 0.3 | Accuracy critical |
| Medications | 0.1 | Must be exact |
| Substance Use | 0.4 | Some narrative |
| Social History | 0.4 | Some narrative |
| ROS | 0.3 | Structured |
| MSE | 0.2 | Objective only |
| Formulation | 0.6 | Synthesis needed |
| Plan | 0.4 | Structured but personalized |

## SmartList Categories to Add

### Psychiatric ROS (9 items)
- Sleep Quality (304120106)
- Appetite (304120107)
- Mood (304120108)
- Anxiety Level (304120109)
- Concentration (304120110)
- Energy Level (304120115)
- Guilt/Worthlessness (304120116)
- Anhedonia (304120117)
- Psychomotor Changes (304120118)

### Substance Use (8 items)
- Alcohol Use (304120201)
- Cannabis Use (304120202)
- Tobacco/Nicotine (304120203)
- Cocaine (304120204)
- Amphetamines (304120205)
- Opioids (304120206)
- Benzodiazepines (304120207)
- Other Substances (304120208)

### Social History (7 items)
- Living Situation (304120301)
- Employment Status (304120302)
- Relationship Status (304120303)
- Education Level (304120304)
- Support System (304120305)
- Financial Status (304120306)
- Legal Issues (304120307)

### Mental Status Exam (13 items)
- Appearance (304120401)
- Behavior (304120402)
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

## Testing Commands

```bash
# Start the dev server
cd apps/web
pnpm dev

# Run tests
pnpm test

# Test pages
# http://localhost:3002/smartlists - SmartList manager
# http://localhost:3002/generate - Note generation
# http://localhost:3002/templates - Template editor
```

## Validation Checklist

### Must Pass All:
- [ ] Formulation has EXACTLY 4 paragraphs
- [ ] Plan has ALL required subsections
- [ ] Plan ends with "Rufus Sweeney, MD"
- [ ] HPI is 2-3+ paragraphs (not condensed)
- [ ] Hospitalizations/SA/NSSIB only if explicit
- [ ] All SmartLists resolve to valid options
- [ ] No bullets or numbered lists anywhere
- [ ] MSE is all SmartLists (no wildcards)

### Epic Compatibility:
- [ ] All @smartlinks@ convert to .dotphrases
- [ ] SmartLists format: {Name:ID:: "selection"}
- [ ] Wildcards (***) filled or preserved
- [ ] No formatting that breaks Epic paste

## Common Pitfalls to Avoid

1. **DON'T** condense the HPI - keep all details
2. **DON'T** infer psychiatric history - only what's stated
3. **DON'T** use bullets anywhere - paragraphs only
4. **DON'T** miss any Plan subsections
5. **DON'T** forget the MD signature
6. **DON'T** make Formulation less than 4 paragraphs
7. **DON'T** use wildcards in MSE - SmartLists only

## Order of Implementation

1. **First:** Add all SmartLists (foundation)
2. **Second:** Update templates with new structure
3. **Third:** Update prompt instructions
4. **Fourth:** Add validation
5. **Last:** Test with real transcripts

## Success Metric

**The ultimate test:** 
Can Dr. Sweeney generate a note, copy it, paste into Epic, and need less than 5 minutes of edits?

If yes → Success!
If no → Check validation checklist and fix

## Contact for Questions

This implementation is for Dr. Rufus Sweeney's Epic Scribe v2.
Key focus areas based on clinical experience:
- Accurate psychiatric history (critical for patient safety)
- Detailed HPI (important for billing and care continuity)
- Structured formulation (teaching tool and clinical reasoning)
- Complete plan (clear next steps for coverage)