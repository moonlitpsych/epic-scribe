import { NextRequest, NextResponse } from 'next/server';
import { Setting } from '@epic-scribe/types';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import { getPromptBuilder } from '@epic-scribe/note-service/src/prompts/prompt-builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { encounterId, patientId, setting, visitType, transcript, priorNote, staffingTranscript } = body;

    // Validation
    if (!setting || !visitType || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: setting, visitType, transcript' },
        { status: 400 }
      );
    }

    // Fetch patient clinical context if available
    let patientContext: string | undefined;

    if (encounterId) {
      // Fetch encounter and then fetch patient separately
      const { getEncounterById } = await import('@/lib/db/encounters');
      const { getPatientById } = await import('@/lib/db/patients');
      try {
        const encounter = await getEncounterById(encounterId);
        if (encounter && encounter.patient_id) {
          const patient = await getPatientById(encounter.patient_id);
          if (patient && patient.notes) {
            patientContext = patient.notes;
            console.log(`[Preview] Loaded patient context from encounter ${encounterId}: ${patientContext.length} chars`);
          }
        }
      } catch (error) {
        console.warn(`[Preview] Could not fetch encounter ${encounterId}:`, error);
      }
    } else if (patientId) {
      // Fetch patient directly
      const { getPatientById } = await import('@/lib/db/patients');
      try {
        const patient = await getPatientById(patientId);
        if (patient && patient.notes) {
          patientContext = patient.notes;
          console.log(`[Preview] Loaded patient context from patient ${patientId}: ${patientContext.length} chars`);
        }
      } catch (error) {
        console.warn(`[Preview] Could not fetch patient ${patientId}:`, error);
      }
    }

    // Get template
    const template = templateService.getTemplate(setting as Setting, visitType as string);
    if (!template) {
      return NextResponse.json(
        { error: `No template found for ${setting} - ${visitType}` },
        { status: 404 }
      );
    }

    // Initialize prompt builder
    const promptBuilder = await getPromptBuilder();

    // Check visit type requirements
    const validation = promptBuilder.validateRequirements(visitType, priorNote);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    // Build the prompt
    const compiledPrompt = await promptBuilder.build({
      template,
      transcript,
      previousNote: priorNote,
      staffingTranscript, // Include staffing transcript if provided
      patientContext, // Include patient clinical context if available
      setting: setting as Setting,
      visitType
    });

    // Get prompt statistics
    const stats = promptBuilder.getPromptStats(compiledPrompt.prompt);

    return NextResponse.json({
      prompt: compiledPrompt.prompt,
      hash: compiledPrompt.hash,
      metadata: compiledPrompt.metadata,
      stats
    });

  } catch (error) {
    console.error('Error previewing prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to preview prompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}