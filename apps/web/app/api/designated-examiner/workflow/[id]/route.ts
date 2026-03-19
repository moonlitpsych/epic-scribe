/**
 * GET /api/designated-examiner/workflow/[id] - Get workflow by ID
 * PUT /api/designated-examiner/workflow/[id] - Update workflow fields
 * DELETE /api/designated-examiner/workflow/[id] - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Fetch a specific workflow
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ps = await requireProviderSession();

    const { id } = await params;

    const { data: workflow, error } = await supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('id', id)
      .eq('finalized_by', ps.providerId)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[DE Workflow] GET by ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update workflow fields
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const ps = await requireProviderSession();

    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'patient_name',
      'hearing_date',
      'commitment_type',
      'hospital',
      'cde_note',
      'progress_notes',
      'adhoc_notes',
      'workflow_step',
      'workflow_status',
      'interview_answers',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: workflow, error } = await supabase
      .from('designated_examiner_reports')
      .update(updateData)
      .eq('id', id)
      .eq('finalized_by', ps.providerId)
      .select()
      .single();

    if (error) {
      console.error('[DE Workflow] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow', details: error.message },
        { status: 500 }
      );
    }

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[DE Workflow] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a workflow
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ps = await requireProviderSession();

    const { id } = await params;

    const { error } = await supabase
      .from('designated_examiner_reports')
      .delete()
      .eq('id', id)
      .eq('finalized_by', ps.providerId);

    if (error) {
      console.error('[DE Workflow] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete workflow', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[DE Workflow] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
