import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getPresentation,
  updatePresentation,
  deletePresentation
} from '@/lib/db/de-presentations';

// GET - Fetch single presentation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const { id } = params;
    console.log('[GET /api/designated-examiner/presentation/[id]] Fetching presentation:', id);

    const presentation = await getPresentation(id, userId);

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(presentation, { status: 200 });
  } catch (error) {
    console.error('[GET /api/designated-examiner/presentation/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch presentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update presentation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const { id } = params;
    const body = await request.json();

    console.log('[PUT /api/designated-examiner/presentation/[id]] Updating presentation:', id);

    const {
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      presentationData,
      criteriaAssessment,
      presentationStatus,
      lastEditedSection,
      aiEnhancedSections
    } = body;

    const presentation = await updatePresentation({
      presentationId: id,
      userId,
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      presentationData,
      criteriaAssessment,
      presentationStatus,
      lastEditedSection,
      aiEnhancedSections
    });

    console.log('[PUT /api/designated-examiner/presentation/[id]] Updated presentation successfully');

    return NextResponse.json(presentation, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/designated-examiner/presentation/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update presentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete presentation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const { id } = params;
    console.log('[DELETE /api/designated-examiner/presentation/[id]] Deleting presentation:', id);

    const success = await deletePresentation(id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete presentation' },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/designated-examiner/presentation/[id]] Deleted presentation successfully');

    return NextResponse.json(
      { message: 'Presentation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DELETE /api/designated-examiner/presentation/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete presentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}