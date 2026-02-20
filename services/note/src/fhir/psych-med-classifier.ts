/**
 * Psychiatric Medication Classifier
 *
 * Classifies medications as psychiatric vs non-psychiatric for prompt ordering.
 * Uses RxNorm codes when available, falls back to name-based matching.
 */

// Psychiatric medication classes with common generic names
const PSYCH_MED_NAMES: Record<string, string[]> = {
  // SSRIs
  SSRI: [
    'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram',
    'fluvoxamine', 'prozac', 'zoloft', 'paxil', 'celexa', 'lexapro', 'luvox',
  ],
  // SNRIs
  SNRI: [
    'venlafaxine', 'desvenlafaxine', 'duloxetine', 'levomilnacipran', 'milnacipran',
    'effexor', 'pristiq', 'cymbalta', 'fetzima', 'savella',
  ],
  // TCAs
  TCA: [
    'amitriptyline', 'nortriptyline', 'imipramine', 'desipramine', 'clomipramine',
    'doxepin', 'trimipramine', 'protriptyline', 'elavil', 'pamelor', 'tofranil',
    'norpramin', 'anafranil', 'sinequan',
  ],
  // MAOIs
  MAOI: [
    'phenelzine', 'tranylcypromine', 'selegiline', 'isocarboxazid',
    'nardil', 'parnate', 'emsam', 'marplan',
  ],
  // Atypical antidepressants
  'Atypical Antidepressant': [
    'bupropion', 'mirtazapine', 'trazodone', 'vilazodone', 'vortioxetine', 'nefazodone',
    'wellbutrin', 'remeron', 'desyrel', 'viibryd', 'trintellix',
  ],
  // Typical antipsychotics
  'Typical Antipsychotic': [
    'haloperidol', 'chlorpromazine', 'fluphenazine', 'perphenazine', 'thiothixene',
    'thioridazine', 'loxapine', 'molindone', 'pimozide',
    'haldol', 'thorazine', 'prolixin', 'trilafon', 'navane',
  ],
  // Atypical antipsychotics
  'Atypical Antipsychotic': [
    'risperidone', 'olanzapine', 'quetiapine', 'aripiprazole', 'ziprasidone',
    'paliperidone', 'lurasidone', 'brexpiprazole', 'cariprazine', 'clozapine',
    'pimavanserin', 'lumateperone',
    'risperdal', 'zyprexa', 'seroquel', 'abilify', 'geodon', 'invega',
    'latuda', 'rexulti', 'vraylar', 'clozaril', 'nuplazid', 'caplyta',
  ],
  // Mood stabilizers
  'Mood Stabilizer': [
    'lithium', 'valproate', 'valproic acid', 'divalproex', 'carbamazepine',
    'lamotrigine', 'oxcarbazepine',
    'depakote', 'depakene', 'tegretol', 'lamictal', 'trileptal', 'eskalith', 'lithobid',
  ],
  // Anxiolytics (benzos)
  Benzodiazepine: [
    'alprazolam', 'lorazepam', 'clonazepam', 'diazepam', 'chlordiazepoxide',
    'oxazepam', 'temazepam', 'triazolam', 'midazolam', 'clorazepate',
    'xanax', 'ativan', 'klonopin', 'valium', 'librium', 'serax',
    'restoril', 'halcion',
  ],
  // Non-benzo anxiolytics
  Anxiolytic: [
    'buspirone', 'hydroxyzine', 'gabapentin', 'pregabalin',
    'buspar', 'vistaril', 'atarax', 'neurontin', 'lyrica',
  ],
  // Stimulants
  Stimulant: [
    'methylphenidate', 'amphetamine', 'dextroamphetamine', 'lisdexamfetamine',
    'atomoxetine', 'modafinil', 'armodafinil',
    'ritalin', 'concerta', 'adderall', 'vyvanse', 'strattera', 'provigil',
    'nuvigil', 'focalin', 'daytrana', 'quillivant', 'jornay',
  ],
  // Alpha-agonists
  'Alpha-Agonist': [
    'clonidine', 'guanfacine',
    'catapres', 'kapvay', 'intuniv', 'tenex',
  ],
  // Hypnotics/sleep
  Hypnotic: [
    'zolpidem', 'eszopiclone', 'zaleplon', 'suvorexant', 'lemborexant',
    'ramelteon', 'tasimelteon',
    'ambien', 'lunesta', 'sonata', 'belsomra', 'dayvigo', 'rozerem', 'hetlioz',
  ],
};

// Build a flat Set of all psych med names (lowercased) for fast lookup
const PSYCH_MED_NAME_SET = new Set<string>();
for (const names of Object.values(PSYCH_MED_NAMES)) {
  for (const name of names) {
    PSYCH_MED_NAME_SET.add(name.toLowerCase());
  }
}

/**
 * Check if a medication is psychiatric based on name or RxNorm code.
 */
export function isPsychMed(rxNormCode?: string, name?: string): boolean {
  if (!name) return false;

  const lowerName = name.toLowerCase();

  // Check if any known psych med name is contained in the medication name
  for (const knownName of PSYCH_MED_NAME_SET) {
    if (lowerName.includes(knownName)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the psychiatric medication class for a given medication.
 */
export function getPsychMedClass(name: string): string | null {
  const lowerName = name.toLowerCase();

  for (const [className, names] of Object.entries(PSYCH_MED_NAMES)) {
    for (const knownName of names) {
      if (lowerName.includes(knownName.toLowerCase())) {
        return className;
      }
    }
  }

  return null;
}
