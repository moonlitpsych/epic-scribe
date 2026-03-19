/**
 * POST /api/designated-examiner/workflow/[id]/determine
 *
 * Step 4: Second Gemini call - Final determination
 * Incorporates all evidence including patient interview answers
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { createClient } from '@supabase/supabase-js';
import { getDEFinalPromptBuilder, getGeminiClient } from '@epic-scribe/note-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const ps = await requireProviderSession();

    const { id } = await params;

    // Fetch the workflow with all required data
    const { data: workflow, error: fetchError } = await supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('id', id)
      .eq('finalized_by', ps.providerId)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Validate prerequisites
    if (!workflow.initial_analysis) {
      return NextResponse.json(
        { error: 'Analysis must be completed before final determination' },
        { status: 400 }
      );
    }

    if (!workflow.clarifying_questions || workflow.clarifying_questions.length === 0) {
      return NextResponse.json(
        { error: 'No clarifying questions found' },
        { status: 400 }
      );
    }

    if (!workflow.interview_answers || Object.keys(workflow.interview_answers).length === 0) {
      return NextResponse.json(
        { error: 'Interview answers must be provided before final determination' },
        { status: 400 }
      );
    }

    console.log(`[DE Determine] Starting final determination for workflow ${id}`);
    const startTime = Date.now();

    // Build the prompt
    const promptBuilder = getDEFinalPromptBuilder();
    const prompt = promptBuilder.build({
      patientName: workflow.patient_name,
      hearingDate: workflow.hearing_date,
      commitmentType: workflow.commitment_type,
      hospital: workflow.hospital,
      cdeNote: workflow.cde_note,
      progressNotes: workflow.progress_notes,
      adhocNotes: workflow.adhoc_notes,
      initialAnalysis: workflow.initial_analysis,
      clarifyingQuestions: workflow.clarifying_questions,
      interviewAnswers: workflow.interview_answers,
    });

    console.log(`[DE Determine] Prompt built: ${prompt.length} chars`);

    // Call Gemini
    const geminiClient = getGeminiClient();
    const result = await geminiClient.generateNote(
      prompt,
      `de-final-${id}`,
      'de-final-v1'
    );

    const latencyMs = Date.now() - startTime;
    console.log(`[DE Determine] Gemini response in ${latencyMs}ms`);

    // Parse the response
    const finalOutput = promptBuilder.parseResponse(result.content);

    if (!finalOutput) {
      console.error('[DE Determine] Failed to parse response:', result.content.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    // Validate the output
    const validation = promptBuilder.validateOutput(finalOutput);
    if (!validation.valid) {
      console.error('[DE Determine] Validation errors:', validation.errors);
      // Don't fail - proceed with partial data if needed
    }

    // Convert to legacy boolean format for backwards compatibility
    const legacyCriteria = promptBuilder.toLegacyCriteria(finalOutput);

    // Update the workflow with final determination
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('designated_examiner_reports')
      .update({
        final_analysis: {
          criteria: finalOutput.criteria,
          overall_recommendation: finalOutput.overall_recommendation,
          commitment_length: finalOutput.commitment_length,
          reasoning: finalOutput.reasoning,
          generated_at: finalOutput.generated_at,
        },
        final_recommendation: finalOutput.final_recommendation,
        workflow_step: 4,
        // Also update legacy fields for compatibility
        ...legacyCriteria,
        // Set finalization timestamp
        finalized_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('finalized_by', ps.providerId)
      .select()
      .single();

    if (updateError) {
      console.error('[DE Determine] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save final determination', details: updateError.message },
        { status: 500 }
      );
    }

    const allCriteriaMet = Object.values(legacyCriteria).every(v => v === true);
    console.log(`[DE Determine] Final determination complete. Recommendation: ${finalOutput.overall_recommendation}, All criteria met: ${allCriteriaMet}`);

    return NextResponse.json({
      workflow: updatedWorkflow,
      determination: finalOutput,
      summary: {
        recommendation: finalOutput.overall_recommendation,
        commitmentLength: finalOutput.commitment_length,
        allCriteriaMet,
        criteriaStatus: legacyCriteria,
      },
      metadata: {
        latencyMs,
        modelUsed: result.modelUsed,
        promptLength: prompt.length,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[DE Determine] Error:', error);
    return NextResponse.json(
      {
        error: 'Final determination failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
