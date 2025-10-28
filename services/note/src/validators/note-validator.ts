/**
 * Note Validator for Epic Scribe v2
 * Enforces structural requirements for psychiatric notes
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationSection {
  name: string;
  content: string;
}

/**
 * Comprehensive note validation for psychiatric documentation
 */
export class NoteValidator {
  /**
   * Validate that the Formulation section has exactly 4 paragraphs with correct structure
   */
  validateFormulation(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Split into paragraphs (must have substantial content)
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    // Check paragraph count
    if (paragraphs.length !== 4) {
      errors.push(
        `Formulation must have EXACTLY 4 paragraphs (found ${paragraphs.length}). ` +
        `Each paragraph must be separated by a blank line.`
      );
      return { valid: false, errors, warnings };
    }

    // Validate Paragraph 1: One-liner format
    const para1 = paragraphs[0];
    const oneLinerPattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+is\s+a\s+\d+[-\s]year[-\s]old/i;
    if (!oneLinerPattern.test(para1)) {
      errors.push(
        'Paragraph 1 must start with "[First name] [Last name] is a [age] year old..."'
      );
    }
    if (!para1.toLowerCase().includes('presents for') && !para1.toLowerCase().includes('who presents')) {
      warnings.push('Paragraph 1 should include "who presents for [reason]"');
    }

    // Validate Paragraph 2: Diagnosis with biopsychosocial formulation
    const para2 = paragraphs[1];
    if (!para2.toLowerCase().includes('diagnosis is most consistent with') &&
        !para2.toLowerCase().includes("patient's presentation is most consistent with")) {
      errors.push(
        'Paragraph 2 must include "diagnosis is most consistent with" or ' +
        '"patient\'s presentation is most consistent with"'
      );
    }

    // Check for biopsychosocial components
    const hasBiological = para2.toLowerCase().includes('biological') ||
                         para2.toLowerCase().includes('genetic') ||
                         para2.toLowerCase().includes('medical');
    const hasPsychological = para2.toLowerCase().includes('psychological') ||
                            para2.toLowerCase().includes('cognitive') ||
                            para2.toLowerCase().includes('personality');
    const hasSocial = para2.toLowerCase().includes('social') ||
                      para2.toLowerCase().includes('environmental') ||
                      para2.toLowerCase().includes('support');

    if (!hasBiological || !hasPsychological || !hasSocial) {
      errors.push(
        'Paragraph 2 MUST explicitly address ALL three domains: biological, psychological, and social factors'
      );
    }

    // Check for ICD-10 code
    if (!para2.match(/[FG]\d{2}(?:\.\d+)?/)) {
      warnings.push('Paragraph 2 should include ICD-10 code (e.g., F32.1)');
    }

    // Validate Paragraph 3: Differential diagnosis
    const para3 = paragraphs[2];
    if (!para3.toLowerCase().startsWith('also considered') &&
        !para3.toLowerCase().includes('differential diagnosis')) {
      errors.push(
        'Paragraph 3 must start with "Also considered" or include "differential diagnosis"'
      );
    }

    // Check that differentials have reasoning
    const hasReasoning = para3.toLowerCase().includes('because') ||
                        para3.toLowerCase().includes('however') ||
                        para3.toLowerCase().includes('less likely') ||
                        para3.toLowerCase().includes('more likely');
    if (!hasReasoning) {
      errors.push(
        'Paragraph 3 must provide specific reasoning for each differential diagnosis'
      );
    }

    // Validate Paragraph 4: Treatment direction
    const para4 = paragraphs[3];
    if (!para4.toLowerCase().startsWith('plan is to') &&
        !para4.toLowerCase().startsWith('the treatment plan') &&
        !para4.toLowerCase().startsWith('treatment will focus')) {
      errors.push(
        'Paragraph 4 must start with "Plan is to..." or "The treatment plan..." or "Treatment will focus..."'
      );
    }

    // Check that it ends with colon (transitions to Plan section)
    if (!para4.trim().endsWith(':')) {
      warnings.push('Paragraph 4 should end with a colon to transition to the Plan section');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate that the Plan section has all required subsections
   */
  validatePlan(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required subsections with variations
    const requiredSections = [
      {
        name: 'Medications',
        patterns: ['Medications:', 'MEDICATIONS:'],
        required: true
      },
      {
        name: 'Psychotherapy Referral',
        patterns: ['Referral to Psychotherapy:', 'Psychotherapy Referral:', 'Referral to Therapy:'],
        required: true
      },
      {
        name: 'Therapy Conducted',
        patterns: ['Therapy:', 'Therapy Conducted:', 'Therapy Provided:'],
        required: true
      },
      {
        name: 'Follow-up',
        patterns: ['Follow-up:', 'FOLLOW-UP:', 'Follow up:'],
        required: true
      },
      {
        name: 'Signature',
        patterns: ['Rufus Sweeney, MD'],
        required: true
      }
    ];

    // Check for each required section
    requiredSections.forEach(section => {
      const found = section.patterns.some(pattern =>
        text.includes(pattern)
      );

      if (!found && section.required) {
        errors.push(`Missing required Plan section: ${section.name}`);
      }
    });

    // Check medications format
    const medSection = text.match(/Medications:(.+?)(?=\n\n|\nReferral|\nPsychotherapy|\nTherapy)/is);
    if (medSection) {
      const medContent = medSection[1];
      // Check for action words
      const hasActions = /\b(Start|Continue|Increase|Decrease|Discontinue|Taper|Hold)\b/i.test(medContent);
      if (!hasActions && !medContent.includes('Continue current')) {
        warnings.push(
          'Medications should start with action words: Start, Continue, Increase, Decrease, etc.'
        );
      }
    }

    // Check therapy conducted section has duration
    const therapySection = text.match(/Therapy[^:]*:(.+?)(?=\n\n|\nFollow-up)/is);
    if (therapySection) {
      const therapyContent = therapySection[1];
      if (!therapyContent.match(/\d+\s*minutes/i)) {
        errors.push('Therapy section must include session duration in minutes');
      }
    }

    // Check follow-up format
    const followUpSection = text.match(/Follow-up:(.+?)(?=\n\n|\nRufus|$)/is);
    if (followUpSection) {
      const followUpContent = followUpSection[1].toLowerCase();
      if (!followUpContent.includes('sooner if needed')) {
        errors.push('Follow-up must end with "or sooner if needed"');
      }

      // Check for timeframe
      if (!followUpContent.match(/\d+\s*(week|month|day)/)) {
        warnings.push('Follow-up should specify a timeframe (e.g., "2 weeks", "1 month")');
      }
    }

    // Check signature is at the end
    const lines = text.trim().split('\n');
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine !== 'Rufus Sweeney, MD') {
      errors.push('Plan must end with "Rufus Sweeney, MD" as the last line');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate HPI is sufficiently detailed (not over-condensed)
   */
  validateHPI(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum length (should be at least 2 paragraphs or 300+ characters)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);

    if (paragraphs.length < 2 && text.length < 300) {
      errors.push(
        'HPI appears over-condensed. Should be 2-3 detailed paragraphs with rich clinical detail'
      );
    }

    // Check for clinical detail elements
    const hasTimeframe = /\b(week|month|year|day|started|began|since)\b/i.test(text);
    const hasSeverity = /\b(mild|moderate|severe|significant|minimal)\b/i.test(text);
    const hasImpact = /\b(work|relationship|function|ADL|sleep|appetite)\b/i.test(text);

    if (!hasTimeframe) {
      warnings.push('HPI should include temporal information (when symptoms started/changed)');
    }
    if (!hasSeverity) {
      warnings.push('HPI should describe severity of symptoms');
    }
    if (!hasImpact) {
      warnings.push('HPI should describe functional impact');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check for formatting violations (bullets, numbered lists outside Plan)
   */
  validateFormatting(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Split note into sections
    const planIndex = text.indexOf('Plan');
    const beforePlan = planIndex > -1 ? text.substring(0, planIndex) : text;
    const planSection = planIndex > -1 ? text.substring(planIndex) : '';

    // Check for bullets/numbered lists outside Plan
    const bulletPattern = /^\s*[-*•·]\s+/m;
    const numberedPattern = /^\s*\d+[.)]\s+/m;

    if (bulletPattern.test(beforePlan)) {
      errors.push(
        'Bullet points found outside Plan section. Use paragraph format only.'
      );
    }

    if (numberedPattern.test(beforePlan)) {
      errors.push(
        'Numbered lists found outside Plan section. Use paragraph format only.'
      );
    }

    // Check for multiple consecutive blank lines
    if (/\n\n\n+/.test(text)) {
      warnings.push('Multiple consecutive blank lines found. Use single blank lines between sections.');
    }

    // Check for SmartLink format errors (@id@ should be .id)
    const smartLinkPattern = /@[A-Za-z0-9_]+@/g;
    const matches = text.match(smartLinkPattern);
    if (matches && matches.length > 0) {
      errors.push(
        `Found unconverted SmartLinks: ${matches.join(', ')}. All @id@ should be converted to .id`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate psychiatric history safety requirements
   */
  validatePsychiatricHistory(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for potentially inferred hospitalizations
    const hospitalizationMentions = text.match(/hospital|inpatient|admitted/gi);
    if (hospitalizationMentions && !text.includes('Denies') && !text.includes('***')) {
      warnings.push(
        'Psychiatric History mentions hospitalizations - verify these were EXPLICITLY stated by patient'
      );
    }

    // Check for potentially inferred suicide attempts
    const suicidePattern = /suicide\s*attempt|overdose|tried to\s*(kill|end)/gi;
    if (suicidePattern.test(text) && !text.includes('Denies')) {
      warnings.push(
        'Psychiatric History mentions suicide attempts - verify these were EXPLICITLY stated, not inferred'
      );
    }

    // Check that wildcards are preserved when appropriate
    const wildcardCount = (text.match(/\*\*\*/g) || []).length;
    const expectedSections = [
      'Previous diagnoses',
      'Previous medications',
      'Hospitalizations',
      'Suicide attempts',
      'Self-harm history',
      'Previous therapy'
    ];

    expectedSections.forEach(section => {
      if (text.includes(section + ':') && !text.includes(section + ': ***') &&
          !text.includes(section + ': Denies') && !text.includes(section + ': None')) {
        // Section exists but might need verification
        if (section === 'Hospitalizations' || section === 'Suicide attempts' || section === 'Self-harm history') {
          warnings.push(
            `Verify ${section} information was explicitly stated by patient, not inferred`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Comprehensive note validation
   */
  validateNote(noteContent: string): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Extract sections using regex
    const sections = this.extractSections(noteContent);

    // Validate HPI if present
    const hpiSection = sections.find(s =>
      s.name.toLowerCase().includes('history of present illness') ||
      s.name.toLowerCase().includes('hpi')
    );
    if (hpiSection) {
      const hpiResult = this.validateHPI(hpiSection.content);
      allErrors.push(...hpiResult.errors);
      if (hpiResult.warnings) allWarnings.push(...hpiResult.warnings);
    }

    // Validate Psychiatric History if present
    const psychHistorySection = sections.find(s =>
      s.name.toLowerCase().includes('psychiatric history')
    );
    if (psychHistorySection) {
      const psychResult = this.validatePsychiatricHistory(psychHistorySection.content);
      allErrors.push(...psychResult.errors);
      if (psychResult.warnings) allWarnings.push(...psychResult.warnings);
    }

    // Validate Formulation if present
    const formulationSection = sections.find(s =>
      s.name.toLowerCase() === 'formulation' ||
      s.name.toLowerCase() === 'assessment and formulation'
    );
    if (formulationSection) {
      const formResult = this.validateFormulation(formulationSection.content);
      allErrors.push(...formResult.errors);
      if (formResult.warnings) allWarnings.push(...formResult.warnings);
    } else {
      allErrors.push('Formulation section not found');
    }

    // Validate Plan if present
    const planSection = sections.find(s =>
      s.name.toLowerCase() === 'plan' ||
      s.name.toLowerCase() === 'treatment plan'
    );
    if (planSection) {
      const planResult = this.validatePlan(planSection.content);
      allErrors.push(...planResult.errors);
      if (planResult.warnings) allWarnings.push(...planResult.warnings);
    } else {
      allErrors.push('Plan section not found');
    }

    // Validate overall formatting
    const formatResult = this.validateFormatting(noteContent);
    allErrors.push(...formatResult.errors);
    if (formatResult.warnings) allWarnings.push(...formatResult.warnings);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };
  }

  /**
   * Extract sections from the note content
   */
  private extractSections(noteContent: string): ValidationSection[] {
    const sections: ValidationSection[] = [];

    // Common section headers
    const sectionHeaders = [
      'Chief Complaint',
      'History of Present Illness',
      'Psychiatric History',
      'Psychiatric Review of Systems',
      'Substance Use History',
      'Social History',
      'Family Psychiatric History',
      'Medical History',
      'Mental Status Examination',
      'Formulation',
      'Assessment and Formulation',
      'Plan',
      'Treatment Plan'
    ];

    // Create regex pattern for section headers
    const headerPattern = new RegExp(
      `^(${sectionHeaders.join('|')})\\s*:?\\s*$`,
      'gmi'
    );

    const matches = Array.from(noteContent.matchAll(headerPattern));

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      const startIndex = currentMatch.index! + currentMatch[0].length;
      const endIndex = nextMatch ? nextMatch.index! : noteContent.length;

      sections.push({
        name: currentMatch[1],
        content: noteContent.substring(startIndex, endIndex).trim()
      });
    }

    return sections;
  }

  /**
   * Get a summary of validation results
   */
  getSummary(result: ValidationResult): string {
    if (result.valid) {
      return '✅ Note structure validated successfully';
    }

    let summary = '❌ Note validation failed:\n';
    summary += `Errors (${result.errors.length}):\n`;
    result.errors.forEach(error => {
      summary += `  • ${error}\n`;
    });

    if (result.warnings && result.warnings.length > 0) {
      summary += `\nWarnings (${result.warnings.length}):\n`;
      result.warnings.forEach(warning => {
        summary += `  • ${warning}\n`;
      });
    }

    return summary;
  }
}

// Export a singleton instance
export const noteValidator = new NoteValidator();