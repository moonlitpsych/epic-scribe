import { SmartToolsParser } from '@epic-scribe/note-service/src/smarttools';

const parser = new SmartToolsParser();

// Example selections for common SmartList types to make examples realistic
const EXAMPLE_SELECTIONS: { [key: string]: string[] } = {
  // Depression examples
  'depression': [
    'Depressed mood, sleep disturbance, poor appetite',
    'Mild depression, anhedonia, fatigue',
    'Moderate depression with guilt and worthlessness',
    'Severe depression with suicidal ideation'
  ],
  'anxiety': [
    'Mild anxiety, no panic attacks',
    'Moderate anxiety with occasional panic',
    'Generalized worry about finances and work',
    'Social anxiety in group settings'
  ],
  'mania': [
    'No manic symptoms',
    'Denies periods of elevated mood or decreased sleep',
    'History of one manic episode 5 years ago',
    'Mild hypomania with increased energy'
  ],
  'psychosis': [
    'No psychotic symptoms',
    'Denies hallucinations or delusions',
    'Paranoid ideation without fixed delusions',
    'Auditory hallucinations, well-controlled on medication'
  ],
  'ocd': [
    'No obsessive-compulsive symptoms',
    'Mild checking behaviors',
    'Moderate contamination fears',
    'Severe rituals taking 2+ hours daily'
  ],
  'trauma': [
    'No trauma history',
    'Childhood trauma, currently stable',
    'Recent trauma with nightmares',
    'PTSD symptoms including flashbacks and avoidance'
  ],
  'eating': [
    'No eating disorder symptoms',
    'Mild dietary restriction',
    'Binge eating weekly',
    'Anorexia with significant weight loss'
  ],
  'substance': [
    'Denies substance use',
    'Social alcohol use only',
    'Cannabis use daily',
    'Polysubstance use in remission'
  ],
  'adhd': [
    'No ADHD symptoms',
    'Mild inattention',
    'Moderate hyperactivity and impulsivity',
    'Severe ADHD affecting work performance'
  ],
  'sleep': [
    'Normal sleep pattern',
    'Initial insomnia 30 minutes',
    'Middle insomnia with frequent awakening',
    'Severe insomnia with 3-4 hours nightly'
  ],
  'mood': [
    'Euthymic',
    'Mildly depressed',
    'Anxious',
    'Irritable'
  ],
  'affect': [
    'Appropriate and reactive',
    'Blunted',
    'Labile',
    'Constricted'
  ],
  'thought_process': [
    'Linear and goal-directed',
    'Tangential at times',
    'Circumstantial',
    'Disorganized'
  ],
  'insight': [
    'Good',
    'Fair',
    'Limited',
    'Poor'
  ],
  'judgment': [
    'Good',
    'Fair',
    'Impaired',
    'Poor'
  ]
};

/**
 * Determines the category of a SmartList based on its name
 */
function categorizeSmartList(displayName: string, identifier: string): string {
  const lowerName = displayName.toLowerCase();
  const lowerIdentifier = identifier.toLowerCase();

  if (lowerName.includes('depression') || lowerIdentifier.includes('depression')) return 'depression';
  if (lowerName.includes('anxiety') || lowerIdentifier.includes('anxiety')) return 'anxiety';
  if (lowerName.includes('mania') || lowerName.includes('hypomani') || lowerIdentifier.includes('mania')) return 'mania';
  if (lowerName.includes('psychos') || lowerIdentifier.includes('psychos')) return 'psychosis';
  if (lowerName.includes('obsess') || lowerName.includes('compuls') || lowerIdentifier.includes('ocd')) return 'ocd';
  if (lowerName.includes('trauma') || lowerName.includes('ptsd') || lowerIdentifier.includes('trauma')) return 'trauma';
  if (lowerName.includes('eating') || lowerIdentifier.includes('eating')) return 'eating';
  if (lowerName.includes('substance') || lowerName.includes('alcohol') || lowerIdentifier.includes('substance')) return 'substance';
  if (lowerName.includes('adhd') || lowerName.includes('attention') || lowerIdentifier.includes('adhd')) return 'adhd';
  if (lowerName.includes('sleep') || lowerIdentifier.includes('sleep')) return 'sleep';
  if (lowerName.includes('mood') || lowerIdentifier.includes('mood')) return 'mood';
  if (lowerName.includes('affect') || lowerIdentifier.includes('affect')) return 'affect';
  if (lowerName.includes('thought') || lowerIdentifier.includes('thought')) return 'thought_process';
  if (lowerName.includes('insight') || lowerIdentifier.includes('insight')) return 'insight';
  if (lowerName.includes('judgment') || lowerIdentifier.includes('judgment')) return 'judgment';

  return 'default';
}

/**
 * Selects an appropriate example value for a SmartList
 */
function selectExampleValue(
  smartList: any,
  options: any[]
): string {
  // If no options available, return placeholder
  if (!options || options.length === 0) {
    return '[No options available]';
  }

  // Try to find a good example based on the SmartList category
  const category = categorizeSmartList(smartList.displayName || '', smartList.identifier || '');
  const categoryExamples = EXAMPLE_SELECTIONS[category];

  if (categoryExamples && categoryExamples.length > 0) {
    // Pick a random realistic example from our predefined ones
    const exampleText = categoryExamples[Math.floor(Math.random() * categoryExamples.length)];

    // Check if any of the actual options match or are similar
    const matchingOption = options.find(opt =>
      opt.value.toLowerCase().includes(exampleText.toLowerCase().substring(0, 20))
    );

    if (matchingOption) {
      return matchingOption.value;
    }

    // If no exact match, try to find something that's not "none" or "not assessed"
    const goodOptions = options.filter(opt => {
      const lower = opt.value.toLowerCase();
      return !lower.includes('none') &&
             !lower.includes('not assessed') &&
             !lower.includes('denies') &&
             !lower.includes('no ');
    });

    if (goodOptions.length > 0) {
      // Pick a random good option
      return goodOptions[Math.floor(Math.random() * goodOptions.length)].value;
    }
  }

  // Fallback: pick any non-default option, or the first option if all are defaults
  const nonDefaultOptions = options.filter(opt => !opt.is_default);
  if (nonDefaultOptions.length > 0) {
    return nonDefaultOptions[Math.floor(Math.random() * nonDefaultOptions.length)].value;
  }

  // Last resort: return first option
  return options[0].value;
}

/**
 * Fetches SmartList data from the API
 */
async function fetchSmartList(epicId: string): Promise<any> {
  try {
    const response = await fetch(`/api/smartlists?epicId=${epicId}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    // API returns array, get first item
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.error(`Error fetching SmartList ${epicId}:`, error);
    return null;
  }
}

/**
 * Generates a dynamic example output based on the template content
 */
export async function generateExampleOutput(templateContent: string): Promise<string> {
  try {
    // Parse the template to find SmartLists
    const parsed = parser.parse(templateContent);
    const smartLists = parsed.smartLists || [];

    if (smartLists.length === 0) {
      // No SmartLists, just return the content with wildcards replaced
      return templateContent.replace(/\*\*\*/g, '[Patient-specific information would appear here]');
    }

    // Create a map of replacements
    const replacements: { [key: string]: string } = {};

    // Fetch options for each SmartList and select examples
    for (const smartListRef of smartLists) {
      const epicId = smartListRef.epicId;
      const placeholder = smartListRef.text; // The full {Display:EpicID} string

      try {
        // Get the SmartList data via API
        const smartList = await fetchSmartList(epicId);

        if (smartList && smartList.options) {
          // Select an appropriate example value
          const exampleValue = selectExampleValue(smartList, smartList.options);

          // Store the replacement
          // Format as it would appear in Epic: {Display:EpicID:: "selected value"}
          replacements[placeholder] = `${exampleValue}`;
        } else {
          replacements[placeholder] = '[SmartList options not found]';
        }
      } catch (error) {
        console.error(`Error fetching SmartList ${epicId}:`, error);
        replacements[placeholder] = '[SmartList not available]';
      }
    }

    // Replace all SmartList placeholders with example values
    let exampleOutput = templateContent;
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      exampleOutput = exampleOutput.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
    }

    // Replace wildcards with example text
    exampleOutput = exampleOutput.replace(/\*\*\*/g, 'Patient reports symptoms have been present for several weeks');

    // Replace SmartLinks with example text (convert @xxx@ to descriptive text)
    exampleOutput = exampleOutput.replace(/@[^@]+@/g, (match) => {
      const id = match.slice(1, -1).toLowerCase();
      if (id.includes('name')) return 'John Smith';
      if (id.includes('age')) return '45 years old';
      if (id.includes('vital')) return 'BP 120/80, HR 72, RR 16';
      if (id.includes('med')) return 'Sertraline 100mg daily';
      return '[Clinical data]';
    });

    return exampleOutput;
  } catch (error) {
    console.error('Error generating example output:', error);
    return 'Example output generation failed. Please check template format.';
  }
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a simpler, synchronous example (for initial render)
 */
export function generateSimpleExample(templateContent: string): string {
  // This is a simpler version that doesn't fetch actual SmartList data
  // Used for immediate display while the async version loads

  let exampleOutput = templateContent;

  // Replace SmartLists with generic examples based on their names
  exampleOutput = exampleOutput.replace(/\{([^:}]+):(\d+)\}/g, (match, displayName) => {
    const lowerName = displayName.toLowerCase();

    if (lowerName.includes('depression')) return 'Moderate depression with anhedonia';
    if (lowerName.includes('anxiety')) return 'Mild anxiety, no panic attacks';
    if (lowerName.includes('mania')) return 'No manic symptoms';
    if (lowerName.includes('psychosis')) return 'No psychotic symptoms';
    if (lowerName.includes('trauma')) return 'No significant trauma history';
    if (lowerName.includes('eating')) return 'Normal eating patterns';
    if (lowerName.includes('substance')) return 'Denies substance use';
    if (lowerName.includes('sleep')) return 'Initial insomnia, 6 hours nightly';
    if (lowerName.includes('mood')) return 'Mildly depressed';
    if (lowerName.includes('affect')) return 'Congruent and appropriate';

    return `[${displayName} selection]`;
  });

  // Replace wildcards
  exampleOutput = exampleOutput.replace(/\*\*\*/g, 'Patient-specific information based on transcript');

  // Replace SmartLinks
  exampleOutput = exampleOutput.replace(/@[^@]+@/g, '[Data from chart]');

  return exampleOutput;
}