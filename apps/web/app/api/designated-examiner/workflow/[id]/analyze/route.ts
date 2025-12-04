/**
 * POST /api/designated-examiner/workflow/[id]/analyze
 *
 * Step 2: First Gemini call - Analyze documentation against Utah's 5 criteria
 * Generates criteria assessment, clarifying questions, and preliminary recommendation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { getDEAnalysisPromptBuilder, getGeminiClient } from '@epic-scribe/note-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('id', id)
      .eq('finalized_by', session.user.id)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Validate we have the required documentation
    if (!workflow.cde_note?.trim()) {
      return NextResponse.json(
        { error: 'CDE note is required for analysis' },
        { status: 400 }
      );
    }

    console.log(`[DE Analyze] Starting analysis for workflow ${id}`);
    const startTime = Date.now();

    // Build the prompt
    const promptBuilder = getDEAnalysisPromptBuilder();
    const prompt = promptBuilder.build({
      patientName: workflow.patient_name,
      hearingDate: workflow.hearing_date,
      commitmentType: workflow.commitment_type,
      hospital: workflow.hospital,
      cdeNote: workflow.cde_note,
      progressNotes: workflow.progress_notes,
      adhocNotes: workflow.adhoc_notes,
    });

    console.log(`[DE Analyze] Prompt built: ${prompt.length} chars`);

    // Call Gemini
    const geminiClient = getGeminiClient();
    const result = await geminiClient.generateNote(
      prompt,
      `de-analysis-${id}`,
      'de-analysis-v1'
    );

    const latencyMs = Date.now() - startTime;
    console.log(`[DE Analyze] Gemini response in ${latencyMs}ms`);

    // Parse the response
    const analysisOutput = promptBuilder.parseResponse(result.content);

    if (!analysisOutput) {
      console.error('[DE Analyze] Failed to parse response:', result.content.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    // Validate the output
    const validation = promptBuilder.validateOutput(analysisOutput);
    if (!validation.valid) {
      console.error('[DE Analyze] Validation errors:', validation.errors);
      // Don't fail - proceed with partial data if needed
    }

    // Update the workflow with analysis results
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('designated_examiner_reports')
      .update({
        initial_analysis: {
          criteria: analysisOutput.criteria,
          preliminary_recommendation: analysisOutput.preliminary_recommendation,
          generated_at: analysisOutput.generated_at,
        },
        clarifying_questions: analysisOutput.clarifying_questions,
        workflow_step: 2,
      })
      .eq('id', id)
      .eq('finalized_by', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[DE Analyze] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save analysis results', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[DE Analyze] Analysis complete. Questions generated: ${analysisOutput.clarifying_questions.length}`);

    return NextResponse.json({
      workflow: updatedWorkflow,
      analysis: analysisOutput,
      metadata: {
        latencyMs,
        modelUsed: result.modelUsed,
        promptLength: prompt.length,
        questionsGenerated: analysisOutput.clarifying_questions.length,
      },
    });
  } catch (error) {
    console.error('[DE Analyze] Error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
