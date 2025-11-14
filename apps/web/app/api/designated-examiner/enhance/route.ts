import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SectionEnhanceRequest, DEPresentationData } from '@/types/designated-examiner';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Section-specific enhancement prompts
const SECTION_PROMPTS = {
  one_liner: `Extract a concise one-liner summary of the patient from the transcript.
    Format: "[Age] [sex] with [primary diagnosis] admitted for [chief complaint/reason]"
    Example: "32-year-old male with schizophrenia admitted for command auditory hallucinations"`,

  demographics: `Extract the following from the transcript:
    - Age (in years)
    - Sex (male/female/other)
    - Psychiatric diagnoses (list all mentioned)
    Return as JSON: { age: "", sex: "", psychiatric_diagnoses: "" }`,

  admission: `Extract:
    1. What the patient is admitted for (current admission reason)
    2. What they are being committed for (legal/safety reason)
    Be specific and use clinical terminology.`,

  initial_presentation: `Summarize the patient's journey over the past 2-4 weeks leading to admission.
    Include: triggering events, symptom progression, concerning behaviors at home,
    path from community/ED to inpatient psychiatry. Write in paragraph form.`,

  relevant_history: `Extract the following history from the transcript:
    1. Previous psychiatric admissions (number, locations, reasons)
    2. Suicide attempts (methods, dates, severity)
    3. Violence/aggression history (targets, severity, legal consequences)
    4. Substance use (substances, frequency, last use)
    5. Social history (living situation, family conflicts, legal issues)
    Return each as a brief paragraph.`,

  medications: `Extract medication information:
    1. Prior medications (before admission)
    2. Current medications (during hospitalization)
    List each with dosage if mentioned. Return as JSON: { prior: [], current: [] }`,

  hospital_course: `Extract information about the hospital stay:
    1. Improvement observed (symptoms, behaviors, insight)
    2. Medication compliance (adherence, side effects)
    3. Special interventions (restraints, isolation, PRN medications)
    4. Activities and behavior on unit
    Write each as 1-2 sentences.`,

  interview: `Extract from the patient interview:
    Objective findings:
    - Thought process (organized, tangential, etc.)
    - Orientation (person, place, time, situation)
    Subjective findings:
    - Patient's understanding of diagnosis and insight level
    - Their stated plan for follow-up after discharge
    Be specific and use quotes when available.`,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SectionEnhanceRequest = await request.json();
    const { section, transcript, existing_data, context } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required for enhancement' },
        { status: 400 }
      );
    }

    console.log(`[POST /api/designated-examiner/enhance] Enhancing section: ${section}`);

    // Get the appropriate prompt for this section
    const sectionPrompt = SECTION_PROMPTS[section as keyof typeof SECTION_PROMPTS];

    if (!sectionPrompt) {
      return NextResponse.json(
        { error: `Unknown section: ${section}` },
        { status: 400 }
      );
    }

    // Build the full prompt
    let fullPrompt = `You are a forensic psychiatry assistant helping prepare for a mental health court hearing.

Extract relevant information from the following patient interview transcript for the "${section}" section.

${sectionPrompt}

TRANSCRIPT:
${transcript}`;

    // Add context if available
    if (context?.clinical_notes) {
      fullPrompt += `\n\nCLINICAL NOTES FOR CONTEXT:\n${context.clinical_notes}`;
    }

    if (context?.cheat_sheet_notes) {
      fullPrompt += `\n\nEXAMINER'S NOTES:\n${context.cheat_sheet_notes}`;
    }

    // Call Gemini for enhancement
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(fullPrompt);
      const enhancedContent = result.response.text();

      // Parse the response based on section type
      let parsedContent: any;

      if (section === 'demographics' || section === 'medications') {
        // Try to parse as JSON for structured sections
        try {
          // Extract JSON from the response if it's wrapped in markdown
          const jsonMatch = enhancedContent.match(/```json?\n?([\s\S]*?)\n?```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : enhancedContent;
          parsedContent = JSON.parse(jsonStr);
        } catch {
          // Fallback to text if JSON parsing fails
          parsedContent = enhancedContent;
        }
      } else if (section === 'relevant_history' || section === 'hospital_course' || section === 'interview') {
        // Parse multi-field sections
        parsedContent = parseMultiFieldResponse(enhancedContent, section);
      } else {
        // Simple text sections
        parsedContent = enhancedContent.trim();
      }

      return NextResponse.json(
        {
          section,
          enhanced_content: parsedContent,
          confidence: 0.85, // Placeholder confidence score
          suggestions: [] // Could add alternative suggestions later
        },
        { status: 200 }
      );
    } catch (geminiError) {
      console.error('[POST /api/designated-examiner/enhance] Gemini error:', geminiError);

      // Return mock data for development if Gemini fails
      const mockContent = getMockEnhancement(section);
      return NextResponse.json(
        {
          section,
          enhanced_content: mockContent,
          confidence: 0.5,
          suggestions: ['This is mock data - Gemini API may be unavailable']
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[POST /api/designated-examiner/enhance] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enhance section',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to parse multi-field responses
function parseMultiFieldResponse(text: string, section: string): any {
  const result: any = {};

  if (section === 'relevant_history') {
    result.previous_admissions = extractSection(text, 'previous', 'admissions') || '';
    result.suicide_attempts = extractSection(text, 'suicide', 'attempts') || '';
    result.violence_history = extractSection(text, 'violence', 'aggression') || '';
    result.substance_use = extractSection(text, 'substance', 'use') || '';
    result.social_history = extractSection(text, 'social', 'history') || '';
  } else if (section === 'hospital_course') {
    result.improvement = extractSection(text, 'improvement', 'observed') || '';
    result.medication_compliance = extractSection(text, 'medication', 'compliance') || '';
    result.special_interventions = extractSection(text, 'special', 'interventions') || '';
    result.activities = extractSection(text, 'activities', 'behavior') || '';
  } else if (section === 'interview') {
    result.objective = {
      thought_process: extractSection(text, 'thought', 'process') || '',
      orientation: extractSection(text, 'orientation', '') || ''
    };
    result.subjective = {
      insight: extractSection(text, 'insight', 'understanding') || '',
      follow_up_plan: extractSection(text, 'follow', 'plan') || ''
    };
  }

  return result;
}

// Helper to extract sections from text
function extractSection(text: string, ...keywords: string[]): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (keywords.every(kw => kw && line.includes(kw))) {
      // Return the next non-empty line or the rest of the section
      for (let j = i; j < lines.length; j++) {
        if (lines[j].trim() && !lines[j].includes(':')) {
          return lines[j].trim();
        }
      }
    }
  }
  return '';
}

// Mock data for development
function getMockEnhancement(section: string): any {
  const mockData: Record<string, any> = {
    one_liner: '45-year-old female with bipolar disorder admitted for manic episode with psychotic features',
    demographics: {
      age: '45',
      sex: 'female',
      psychiatric_diagnoses: 'Bipolar I Disorder, most recent episode manic with psychotic features; PTSD; Generalized Anxiety Disorder'
    },
    admission: {
      reason: 'Manic episode with grandiose delusions and aggressive behavior toward family',
      commitment_reason: 'Danger to others due to aggressive behavior and lack of insight into illness'
    },
    initial_presentation: 'Patient experienced progressive manic symptoms over 3 weeks after discontinuing lithium. Initial symptoms included decreased sleep and increased energy. Family noted increasingly erratic behavior, excessive spending, and grandiose beliefs about special powers. Brought to ED after threatening family members who challenged her delusions.',
    relevant_history: {
      previous_admissions: 'Three prior psychiatric admissions, all for manic episodes (2019, 2021, 2023)',
      suicide_attempts: 'One prior attempt by overdose in 2019 during depressive episode',
      violence_history: 'No prior violence history documented',
      substance_use: 'Denies current use, remote history of alcohol use disorder in remission',
      social_history: 'Lives alone in apartment, estranged from family due to recent conflicts'
    },
    medications: {
      prior: ['Lithium 900mg daily (discontinued 1 month ago)', 'Quetiapine 200mg qhs'],
      current: ['Lithium 900mg daily', 'Olanzapine 10mg daily', 'Lorazepam 1mg PRN']
    },
    hospital_course: {
      improvement: 'Gradual improvement in sleep and decreased grandiosity after medication restart',
      medication_compliance: 'Initially refused medications, now compliant after psychoeducation',
      special_interventions: 'Required one dose of IM Haldol on admission day for agitation',
      activities: 'Attending groups, interacting appropriately with peers'
    },
    interview: {
      objective: {
        thought_process: 'Linear and goal-directed, no longer displaying flight of ideas',
        orientation: 'Oriented to person, place, time, and situation'
      },
      subjective: {
        insight: 'Partial insight - acknowledges need for medication but minimizes severity of symptoms',
        follow_up_plan: 'Plans to follow up with outpatient psychiatrist within one week of discharge'
      }
    }
  };

  return mockData[section] || 'Unable to extract information for this section';
}