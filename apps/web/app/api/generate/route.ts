import { NextRequest, NextResponse } from 'next/server';
import { GenerateNoteRequest, GenerateNoteResponse, Setting, VisitType, PromptReceipt } from '@epic-scribe/types';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import { getPromptBuilder } from '@epic-scribe/note-service/src/prompts/prompt-builder';
import { getGeminiClient } from '@epic-scribe/note-service/src/llm/gemini-client';
import { getSmartListService } from '@epic-scribe/note-service/src/smartlists/smartlist-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNoteRequest = await request.json();
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
            console.log(`[Generate] Loaded patient context from encounter ${encounterId}: ${patientContext.length} chars`);
          }
        }
      } catch (error) {
        console.warn(`[Generate] Could not fetch encounter ${encounterId}:`, error);
      }
    } else if (patientId) {
      // Fetch patient directly
      const { getPatientById } = await import('@/lib/db/patients');
      try {
        const patient = await getPatientById(patientId);
        if (patient && patient.notes) {
          patientContext = patient.notes;
          console.log(`[Generate] Loaded patient context from patient ${patientId}: ${patientContext.length} chars`);
        }
      } catch (error) {
        console.warn(`[Generate] Could not fetch patient ${patientId}:`, error);
      }
    }

    // Load template from database (with fallback to in-memory)
    let template;
    try {
      const { getTemplateBySettingAndVisitType } = await import('@/lib/db/templates');
      template = await getTemplateBySettingAndVisitType(setting, visitType);
      console.log(`[Generate] Loaded template from database for ${setting} - ${visitType}`);
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
      model: process.env.GEMINI_MODEL
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

    // Create receipt with comprehensive validation
    const receipt: PromptReceipt & { validationResult?: any } = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      promptVersion: 1, // From manifest
      mappingVersion: 1, // From config
      templateId: template.templateId,
      permutationKey: `${setting}__${visitType}`,
      promptHash: compiledPrompt.hash,
      validationResult: comprehensiveValidation // Include comprehensive validation
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