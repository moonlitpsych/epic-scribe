/**
 * PUT /api/designated-examiner/workflow/[id]/interview
 *
 * Step 3: Save interview answers from patient conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { interview_answers, advance_step = false } = body;

    // Validate interview_answers is an object
    if (!interview_answers || typeof interview_answers !== 'object') {
      return NextResponse.json(
        { error: 'interview_answers must be an object' },
        { status: 400 }
      );
    }

    // Fetch the workflow to verify it exists and is at step 2 or 3
    const { data: workflow, error: fetchError } = await supabase
      .from('designated_examiner_reports')
      .select('workflow_step, clarifying_questions')
      .eq('id', id)
      .eq('finalized_by', session.user.id)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (workflow.workflow_step < 2) {
      return NextResponse.json(
        { error: 'Cannot save interview answers before analysis is complete' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      interview_answers,
    };

    // If advance_step is true and we're at step 2 or 3, advance to step 3
    if (advance_step && workflow.workflow_step < 4) {
      updateData.workflow_step = 3;
    }

    // Update the workflow
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('designated_examiner_reports')
      .update(updateData)
      .eq('id', id)
      .eq('finalized_by', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[DE Interview] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save interview answers', details: updateError.message },
        { status: 500 }
      );
    }

    // Check completeness - how many questions have answers?
    const questions = workflow.clarifying_questions || [];
    const answeredCount = questions.filter(
      (q: { id: string }) => interview_answers[q.id]?.trim()
    ).length;

    return NextResponse.json({
      workflow: updatedWorkflow,
      completeness: {
        totalQuestions: questions.length,
        answeredQuestions: answeredCount,
        isComplete: answeredCount === questions.length,
      },
    });
  } catch (error) {
    console.error('[DE Interview] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
