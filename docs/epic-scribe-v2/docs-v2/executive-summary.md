# Epic Scribe v2 - Executive Summary for Claude Code

## The Big Picture

Dr. Rufus Sweeney is a PGY-3 Psychiatry resident who has already built epic-scribe v1. While v1 works, it has some critical gaps that affect clinical care and efficiency. This v2 upgrade addresses those gaps based on real-world usage experience.

## Why These Changes Matter Clinically

### 1. **HPI Detail Retention** 
**Clinical Impact:** In psychiatry, subtle details matter. A patient saying "I feel like everyone would be better off without me" vs "I want to die" has vastly different clinical implications. The current condensing loses these nuances.

### 2. **Psychiatric History Accuracy**
**Clinical Impact:** Incorrectly documenting psychiatric hospitalizations or suicide attempts has serious consequences:
- Legal liability if missed
- Wrong risk stratification
- Insurance issues
- Inappropriate treatment planning

### 3. **Structured Formulation**
**Clinical Impact:** The 4-paragraph format teaches clinical reasoning:
- Paragraph 1: Orients any covering physician
- Paragraph 2: Demonstrates diagnostic reasoning
- Paragraph 3: Shows thorough differential consideration
- Paragraph 4: Links assessment to treatment

### 4. **SmartList Standardization**
**Clinical Impact:** Ensures consistency across notes, speeds documentation, and improves billing accuracy. Epic's SmartLists also enable data mining for quality metrics.

### 5. **Plan Structure**
**Clinical Impact:** Clear sections ensure nothing is missed:
- Medications: Prevents medication errors
- Therapy referral: Ensures continuity of care
- Therapy conducted: Supports billing (CPT codes)
- Follow-up: Clear expectations for patient

## The User Experience Vision

**Current State (v1):** Generate note → Edit for 10-15 minutes → Paste into Epic

**Target State (v2):** Generate note → Edit for <5 minutes → Paste into Epic

## Technical Philosophy

1. **Epic-Native:** Use Epic's SmartTools as designed, not fight against them
2. **Structured but Flexible:** SmartLists for structure, wildcards for narrative
3. **Safety First:** Never infer critical safety information
4. **Clinically Driven:** Every decision based on clinical need, not technical convenience

## What Success Looks Like

When Dr. Sweeney generates a note with epic-scribe-v2:
- The HPI tells the complete story
- Psychiatric history is 100% accurate
- The formulation demonstrates clear clinical thinking
- The plan is comprehensive and actionable
- It pastes into Epic perfectly
- Editing takes less than 5 minutes

## Implementation Priorities

1. **Safety Critical** (MUST fix first):
   - Psychiatric history accuracy
   - Suicide/self-harm documentation

2. **Efficiency Gains** (Big time savers):
   - SmartList conversion for ROS/MSE/Social
   - Plan structure automation

3. **Quality Improvements** (Better notes):
   - HPI detail retention
   - Formulation structure

## Key Constraints

- **No PHI in code:** All test data must be de-identified
- **Epic compatibility:** Must work with Epic's exact syntax
- **Maintain existing features:** Don't break what's working
- **Backward compatible:** Existing templates should still work

## The Ask for Claude Code

Transform epic-scribe into a tool that:
1. Generates clinically excellent notes
2. Respects Epic's SmartTools ecosystem
3. Saves significant physician time
4. Maintains highest safety standards

This isn't just about code - it's about improving psychiatric care delivery by giving clinicians more time with patients instead of documentation.

## Development Approach

1. **Start with foundation:** Add all SmartLists first
2. **Build up sections:** Update templates systematically
3. **Refine generation:** Adjust prompts and temperatures
4. **Validate rigorously:** Test with multiple scenarios
5. **Polish UX:** Make it intuitive and efficient

## Questions Claude Code Should Ask

Before implementing, consider:
- Does this change improve clinical accuracy?
- Does this save physician time?
- Is this Epic-compatible?
- Could this introduce safety issues?
- Is the output easily editable if needed?

## Measuring Success

The ultimate test is practical:
1. Generate a note from a real transcript
2. Copy the output
3. Paste into Epic
4. Time how long editing takes
5. Target: <5 minutes

If we achieve this, we've succeeded.

## Final Note

This isn't just another software project. This tool directly impacts patient care. Every minute saved on documentation is a minute that can be spent with patients. Every accurate detail captured could influence treatment decisions. Every properly structured note teaches clinical reasoning.

Build this with the understanding that it will be used in real clinical settings, for real patients, by physicians who are trying to provide the best possible psychiatric care.

---

**Remember:** The detailed implementation plan (`epic-scribe-v2-implementation-plan.md`) has all the specific technical requirements. This summary provides the "why" behind those requirements.