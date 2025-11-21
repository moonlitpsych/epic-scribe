/**
 * POST /api/designated-examiner/generate
 *
 * Generates a designated examiner report from an interview transcript.
 * Returns the generated report and parsed criteria assessments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getDEPromptBuilder } from '@epic-scribe/note-service';
import { getGeminiClient } from '@epic-scribe/note-service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      patientId,
      encounterId,
      transcript,
      hearingDate,
      commitmentType = '30-day',
      hospital = 'Huntsman Mental Health Institute',
      cheatSheetNotes,
      clinicalNotes,
      patientName,
    } = body;

    // Validate required fields
    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (!patientName?.trim()) {
      return NextResponse.json(
        { error: 'Patient name is required' },
        { status: 400 }
      );
    }

    console.log('[DE Generate] Starting generation...');
    console.log(`[DE Generate] Transcript length: ${transcript.length} chars`);
    console.log(`[DE Generate] Commitment type: ${commitmentType}`);

    // Build specialized prompt
    const promptBuilder = getDEPromptBuilder();
    const prompt = promptBuilder.build({
      transcript,
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      cheatSheetNotes,
      clinicalNotes,
    });

    console.log(`[DE Generate] Compiled prompt: ${prompt.length} chars`);

    // Generate with Gemini
    const geminiClient = getGeminiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview',
    });

    const startTime = Date.now();
    const result = await geminiClient.generateNote(
      prompt,
      `de-${Date.now()}`,
      'designated-examiner-v1'
    );
    const latencyMs = Date.now() - startTime;

    console.log(`[DE Generate] Generated report in ${latencyMs}ms`);
    console.log(`[DE Generate] Report length: ${result.content.length} chars`);

    // Parse criteria assessments from generated report
    const criteriaAssessment = promptBuilder.parseCriteriaFromReport(
      result.content
    );

    console.log('[DE Generate] Parsed criteria:', criteriaAssessment);

    // Validate sections are present
    const validation = promptBuilder.validateSections(result.content);
    if (!validation.valid) {
      console.warn('[DE Generate] Missing sections:', validation.missingSections);
    }

    // Count words in report
    const wordCount = promptBuilder.countWords(result.content);
    console.log(`[DE Generate] Word count: ${wordCount}`);

    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user ID from session
    // Note: This assumes session.user.id exists and is a valid UUID
    // If using NextAuth with Supabase, you may need to map the user
    const userId = (session.user as any).id || session.user.email;

    const { data: report, error: dbError } = await supabase
      .from('designated_examiner_reports')
      .insert({
        patient_id: patientId || null,
        encounter_id: encounterId || null,
        transcript,
        cheat_sheet_notes: cheatSheetNotes || null,
        clinical_notes: clinicalNotes || null,
        hearing_date: hearingDate || null,
        commitment_type: commitmentType,
        hospital,
        generated_argument: result.content,
        final_argument: result.content, // Initialize with generated version
        ...criteriaAssessment,
        finalized_by: userId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DE Generate] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`[DE Generate] Saved report: ${report.id}`);

    // Return response
    return NextResponse.json({
      report: result.content,
      reportId: report.id,
      criteriaAssessment,
      metadata: {
        modelUsed: result.modelUsed,
        latencyMs,
        wordCount,
        promptLength: prompt.length,
        sectionsValid: validation.valid,
        missingSections: validation.missingSections,
      },
    });
  } catch (error) {
    console.error('[DE Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
