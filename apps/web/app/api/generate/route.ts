import { NextRequest, NextResponse } from 'next/server';
import { GenerateNoteRequest, GenerateNoteResponse, Setting, PromptReceipt, EpicChartData, LongitudinalChartData } from '@epic-scribe/types';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import { getPromptBuilder } from '@epic-scribe/note-service/src/prompts/prompt-builder';
import { getGeminiClient } from '@epic-scribe/note-service/src/llm/gemini-client';
import { getSmartListService } from '@epic-scribe/note-service/src/smartlists/smartlist-service';
import { epicChartExtractor } from '@epic-scribe/note-service/src/extractors/epic-chart-extractor';
import { getLongitudinalChartData, formatLongitudinalDataForPrompt } from '@/lib/db/chart-history';
import crypto from 'crypto';

/**
 * Format historical notes for inclusion in prompt
 */
function formatHistoricalNotes(notes: any[]): string {
  let formatted = '═══════════════════════════════════════════════════════════\n';
  formatted += `HISTORICAL NOTES (${notes.length} previous notes)\n`;
  formatted += '═══════════════════════════════════════════════════════════\n\n';
  formatted += 'Review these historical notes to maintain continuity of care and reference past diagnoses, medications, and treatment responses.\n\n';

  notes.forEach((note, index) => {
    const encounter = (note as any).encounters;
    const dateStr = encounter?.scheduled_start ? new Date(encounter.scheduled_start).toLocaleDateString() : 'Unknown date';
    const setting = encounter?.setting || 'Unknown';
    const visitType = encounter?.visit_type || 'Unknown';

    formatted += `--- Note ${index + 1} (${dateStr} - ${setting} - ${visitType}) ---\n\n`;
    formatted += note.final_note_content || note.generated_content || '[No content]';
    formatted += '\n\n';
  });

  return formatted;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNoteRequest = await request.json();
    const { encounterId, patientId, setting, visitType, transcript, priorNote, staffingTranscript, collateralTranscript, epicChartData } = body;
    // Patient demographics can be passed directly or fetched from database
    let { patientFirstName, patientLastName, patientAge } = body as any;

    // Validation
    if (!setting || !visitType || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: setting, visitType, transcript' },
        { status: 400 }
      );
    }

    // Fetch patient clinical context, historical notes, longitudinal chart data, and demographics if available
    let patientContext: string | undefined;
    let historicalNotes: string | undefined;
    let longitudinalChartData: LongitudinalChartData | null = null;
    let longitudinalChartDataPrompt: string | undefined;

    // Helper function to calculate age from DOB
    const calculateAge = (dob: string | null | undefined): number | null => {
      if (!dob) return null;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    if (encounterId) {
      // Fetch encounter and then fetch patient separately
      const { getEncounterById } = await import('@/lib/db/encounters');
      const { getPatientById } = await import('@/lib/db/patients');
      const { getPatientFinalizedNotes } = await import('@/lib/db/notes');
      try {
        const encounter = await getEncounterById(encounterId);
        if (encounter && encounter.patient_id) {
          const patient = await getPatientById(encounter.patient_id);
          if (patient) {
            // Get patient demographics if not provided in request
            if (!patientFirstName) patientFirstName = patient.first_name;
            if (!patientLastName) patientLastName = patient.last_name;
            if (patientAge === undefined) {
              // Try to get age from database or calculate from DOB
              patientAge = (patient as any).age || calculateAge((patient as any).dob);
            }

            if (patient.notes) {
              patientContext = patient.notes;
              console.log(`[Generate] Loaded patient context from encounter ${encounterId}: ${patientContext.length} chars`);
            }
          }

          // Fetch historical notes for this patient
          const notes = await getPatientFinalizedNotes(encounter.patient_id);
          if (notes && notes.length > 0) {
            historicalNotes = formatHistoricalNotes(notes);
            console.log(`[Generate] Loaded ${notes.length} historical notes for patient ${encounter.patient_id}`);
          }

          // Fetch longitudinal chart data (PHQ-9, GAD-7 trends, medication history)
          longitudinalChartData = await getLongitudinalChartData(encounter.patient_id);
          if (longitudinalChartData) {
            longitudinalChartDataPrompt = formatLongitudinalDataForPrompt(longitudinalChartData);
            console.log(`[Generate] Loaded longitudinal chart data for patient ${encounter.patient_id}:`, {
              phq9Entries: longitudinalChartData.questionnaire_trends.phq9.length,
              gad7Entries: longitudinalChartData.questionnaire_trends.gad7.length,
              phq9Trend: longitudinalChartData.summary.phq9_trend,
              gad7Trend: longitudinalChartData.summary.gad7_trend,
            });
          }
        }
      } catch (error) {
        console.warn(`[Generate] Could not fetch encounter ${encounterId}:`, error);
      }
    } else if (patientId) {
      // Fetch patient directly
      const { getPatientById } = await import('@/lib/db/patients');
      const { getPatientFinalizedNotes } = await import('@/lib/db/notes');
      try {
        const patient = await getPatientById(patientId);
        if (patient) {
          // Get patient demographics if not provided in request
          if (!patientFirstName) patientFirstName = patient.first_name;
          if (!patientLastName) patientLastName = patient.last_name;
          if (patientAge === undefined) {
            // Try to get age from database or calculate from DOB
            patientAge = (patient as any).age || calculateAge((patient as any).dob);
          }

          if (patient.notes) {
            patientContext = patient.notes;
            console.log(`[Generate] Loaded patient context from patient ${patientId}: ${patientContext.length} chars`);
          }
        }

        // Fetch historical notes for this patient
        const notes = await getPatientFinalizedNotes(patientId);
        if (notes && notes.length > 0) {
          historicalNotes = formatHistoricalNotes(notes);
          console.log(`[Generate] Loaded ${notes.length} historical notes for patient ${patientId}`);
        }

        // Fetch longitudinal chart data (PHQ-9, GAD-7 trends, medication history)
        longitudinalChartData = await getLongitudinalChartData(patientId);
        if (longitudinalChartData) {
          longitudinalChartDataPrompt = formatLongitudinalDataForPrompt(longitudinalChartData);
          console.log(`[Generate] Loaded longitudinal chart data for patient ${patientId}:`, {
            phq9Entries: longitudinalChartData.questionnaire_trends.phq9.length,
            gad7Entries: longitudinalChartData.questionnaire_trends.gad7.length,
            phq9Trend: longitudinalChartData.summary.phq9_trend,
            gad7Trend: longitudinalChartData.summary.gad7_trend,
          });
        }
      } catch (error) {
        console.warn(`[Generate] Could not fetch patient ${patientId}:`, error);
      }
    }

    console.log(`[Generate] Patient demographics: ${patientFirstName} ${patientLastName}, age: ${patientAge ?? 'not provided'}`);

    // Process Epic chart data if provided
    let extractedEpicData: EpicChartData | null = null;
    if (epicChartData?.trim()) {
      console.log(`[Generate] Processing Epic chart data: ${epicChartData.length} chars`);
      extractedEpicData = epicChartExtractor.extract(epicChartData);
      console.log(`[Generate] Extracted Epic data:`, {
        phq9: extractedEpicData.questionnaires?.phq9?.score,
        gad7: extractedEpicData.questionnaires?.gad7?.score,
        currentMeds: extractedEpicData.medications?.current?.length || 0,
        pastMeds: extractedEpicData.medications?.past?.length || 0,
      });
    }

    // Load template from database (with fallback to in-memory)
    let template;
    try {
      const { getTemplateBySettingAndVisitType } = await import('@/lib/db/templates');
      template = await getTemplateBySettingAndVisitType(setting, visitType);
      if (template) {
        console.log(`[Generate] Loaded template from database for ${setting} - ${visitType}`);
      } else {
        // Database didn't have it, try in-memory
        console.log(`[Generate] Template not in database for ${setting} - ${visitType}, trying in-memory`);
        template = templateService.getTemplate(setting as Setting, visitType as string);
      }
    } catch (dbError) {
      console.log('[Generate] Database not available, using in-memory template:', dbError);
      template = templateService.getTemplate(setting as Setting, visitType as string);
    }

    if (!template) {
      return NextResponse.json(
        { error: `No template found for ${setting} - ${visitType}` },
        { status: 404 }
      );
    }

    // Initialize services
    const promptBuilder = await getPromptBuilder();
    const geminiClient = getGeminiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-pro'
    });
    const smartListService = await getSmartListService();

    // Check visit type requirements
    const validation = promptBuilder.validateRequirements(visitType, priorNote);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    // Build the prompt with patient demographics
    const compiledPrompt = await promptBuilder.build({
      template,
      transcript,
      previousNote: priorNote,
      staffingTranscript, // Include staffing transcript if provided
      collateralTranscript, // Include collateral transcript for Teenscope
      epicChartData: epicChartData?.trim() || undefined, // Include raw Epic chart data for AI to use
      longitudinalChartData: longitudinalChartDataPrompt, // Include PHQ-9/GAD-7 trends and medication history
      patientContext, // Include patient clinical context if available
      historicalNotes, // Include all previous finalized notes for continuity
      setting: setting as Setting,
      visitType,
      // Patient demographics - used directly in note instead of dotphrases
      patientFirstName,
      patientLastName,
      patientAge
    });

    console.log(`[Generate] Compiled prompt: ${compiledPrompt.hash}, ${compiledPrompt.metadata.wordCount} words`);
    console.log(`[Generate] SmartList definitions length: ${compiledPrompt.sections.smartlistDefinitions?.length || 0} chars`);
    if (compiledPrompt.sections.smartlistDefinitions) {
      console.log(`[Generate] SmartList section preview: ${compiledPrompt.sections.smartlistDefinitions.substring(0, 200)}...`);
    } else {
      console.log(`[Generate] WARNING: No SmartList definitions included in prompt!`);
    }

    // Generate note using Gemini
    const generationResult = await geminiClient.generateNote(
      compiledPrompt.prompt,
      compiledPrompt.hash,
      template.templateId
    );

    console.log(`[Generate] Generated note in ${generationResult.latencyMs}ms using ${generationResult.modelUsed}`);

    // Use comprehensive validation from the NoteValidator (already done in Gemini client)
    const comprehensiveValidation = generationResult.validationResult;

    // Also do SmartTools-specific validation
    const smartListValidation = smartListService.validateSelections(generationResult.content);

    // Combine validation issues for backward compatibility
    const validationIssues = geminiClient.validateNote(generationResult.content);

    if (!smartListValidation.valid) {
      smartListValidation.errors.forEach(error => {
        validationIssues.push({
          type: 'smartlist_invalid',
          location: 'Generated note',
          message: error,
          suggestion: 'Check SmartList options in catalog'
        });
      });
    }

    // Create receipt with comprehensive validation and Epic chart data
    const receipt: PromptReceipt & { validationResult?: any; epicChartData?: EpicChartData } = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      promptVersion: 1, // From manifest
      mappingVersion: 1, // From config
      templateId: template.templateId,
      permutationKey: `${setting}__${visitType}`,
      promptHash: compiledPrompt.hash,
      validationResult: comprehensiveValidation, // Include comprehensive validation
      epicChartData: extractedEpicData || undefined, // Include extracted Epic data for saving
    };

    const response: GenerateNoteResponse = {
      note: generationResult.content,
      receipt,
      validationIssues: validationIssues.length > 0 ? validationIssues : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating note:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate note',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}