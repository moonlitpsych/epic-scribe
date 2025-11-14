import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  createPresentation,
  getUserPresentations
} from '@/lib/db/de-presentations';

// POST - Create new presentation
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    console.log('[POST /api/designated-examiner/presentation] Creating presentation for user:', userId);

    const {
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      presentationData,
      criteriaAssessment,
      transcript,
      cheatSheetNotes,
      clinicalNotes
    } = body;

    // Validate required fields
    if (!presentationData) {
      return NextResponse.json(
        { error: 'presentationData is required' },
        { status: 400 }
      );
    }

    const presentation = await createPresentation({
      userId,
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      presentationData,
      criteriaAssessment,
      transcript,
      cheatSheetNotes,
      clinicalNotes
    });

    console.log('[POST /api/designated-examiner/presentation] Created presentation:', presentation.id);

    return NextResponse.json(presentation, { status: 201 });
  } catch (error) {
    console.error('[POST /api/designated-examiner/presentation] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create presentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - List user's presentations
export async function GET(request: NextRequest) {
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

    console.log('[GET /api/designated-examiner/presentation] Fetching presentations for user:', userId);

    const presentations = await getUserPresentations(userId);

    console.log('[GET /api/designated-examiner/presentation] Found presentations:', presentations.length);

    return NextResponse.json(presentations, { status: 200 });
  } catch (error) {
    console.error('[GET /api/designated-examiner/presentation] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch presentations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}