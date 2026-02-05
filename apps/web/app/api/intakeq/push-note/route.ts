/**
 * POST /api/intakeq/push-note - Push a generated note to IntakeQ
 *
 * Uses Playwright browser automation to create a note in IntakeQ.
 *
 * IMPORTANT: This endpoint requires a real browser, which means:
 * - Works locally (pnpm dev)
 * - Does NOT work on Vercel serverless functions
 * - For production, run on a server with browser support (Render, Railway, self-hosted)
 *
 * Request body:
 *   - patientId: string - Epic Scribe patient ID (used to store IntakeQ GUID)
 *   - intakeqGuid?: string - IntakeQ client GUID (if already known)
 *   - patientEmail?: string - Patient email (fallback for IntakeQ lookup if no GUID)
 *   - generatedNote: string - The full generated note text
 *   - templateName?: string - IntakeQ template name (optional, uses provider default)
 *   - signatureRequired?: boolean - Whether to sign the note (default: true)
 *
 * Returns:
 *   - success: boolean
 *   - noteId?: string
 *   - noteUrl?: string
 *   - intakeqGuid?: string - The IntakeQ GUID (for storing on patient record)
 *   - error?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { IntakeQApiClient } from '@epic-scribe/intakeq-api';
import {
  IntakeQAutomation,
  mapEpicScribeNoteToIntakeQ,
  extractDiagnosesFromNote,
} from '@epic-scribe/intakeq-playwright';
import { updatePatient } from '@/lib/db/patients';
import { getProviderByEmail } from '@/lib/db/providers';
import {
  getTemplateByName,
  convertToFieldMappings,
  buildSectionToEditableIndex,
} from '@/lib/db/intakeq-templates';

interface PushNoteRequest {
  patientId: string;
  intakeqGuid?: string;
  patientEmail?: string;
  generatedNote: string;
  templateName?: string;
  signatureRequired?: boolean;
}

export async function POST(request: NextRequest) {
  // Check if we're in a serverless environment
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    return NextResponse.json(
      {
        error: 'Browser automation not supported in serverless environment',
        hint: 'Run this endpoint locally or on a server with browser support',
      },
      { status: 501 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's provider and credentials
    const userEmail = session.user?.email;
    let intakeqEmail: string | undefined;
    let intakeqPassword: string | undefined;
    let defaultTemplateName: string | undefined;

    if (userEmail) {
      const provider = await getProviderByEmail(userEmail);

      if (provider?.intakeq_credentials) {
        console.log(`[PushNote] Using DB credentials for provider: ${provider.first_name} ${provider.last_name}`);
        intakeqEmail = provider.intakeq_credentials.login_email;
        intakeqPassword = provider.intakeq_credentials.login_password;
        defaultTemplateName = provider.intakeq_credentials.default_template_name || undefined;
      } else if (provider) {
        console.log(`[PushNote] Provider found but no IntakeQ credentials: ${provider.first_name} ${provider.last_name}`);
      }
    }

    // Fallback to environment variables if no DB credentials
    if (!intakeqEmail || !intakeqPassword) {
      console.log('[PushNote] Falling back to environment variable credentials');
      intakeqEmail = process.env.INTAKEQ_USER_EMAIL;
      intakeqPassword = process.env.INTAKEQ_USER_PASSWORD;
    }

    // Check required API key (always from env for now)
    const apiKey = process.env.INTAKEQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'INTAKEQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!intakeqEmail || !intakeqPassword) {
      return NextResponse.json(
        { error: 'IntakeQ credentials not configured. Set up in Admin or add INTAKEQ_USER_EMAIL and INTAKEQ_USER_PASSWORD environment variables.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: PushNoteRequest = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    if (!body.generatedNote) {
      return NextResponse.json(
        { error: 'generatedNote is required' },
        { status: 400 }
      );
    }

    // Need either intakeqGuid or patientEmail
    if (!body.intakeqGuid && !body.patientEmail) {
      return NextResponse.json(
        { error: 'Either intakeqGuid or patientEmail is required' },
        { status: 400 }
      );
    }

    // Determine template name (priority: request > provider default > env > hardcoded)
    const templateName = body.templateName || defaultTemplateName || process.env.INTAKEQ_NOTE_TEMPLATE_NAME || 'Kyle Roller Intake Note';
    const signatureRequired = body.signatureRequired !== false;

    let clientGuid = body.intakeqGuid;

    // If no GUID provided, look up by email
    if (!clientGuid) {
      console.log(`[PushNote] Looking up patient by email: ${body.patientEmail}`);
      const apiClient = new IntakeQApiClient({ apiKey });
      const intakeqClient = await apiClient.getClientByEmail(body.patientEmail!);

      if (!intakeqClient) {
        return NextResponse.json(
          { error: `Patient not found in IntakeQ: ${body.patientEmail}` },
          { status: 404 }
        );
      }

      console.log(`[PushNote] Found patient: ${intakeqClient.ClientName} (GUID: ${intakeqClient.Guid})`);

      if (!intakeqClient.Guid) {
        return NextResponse.json(
          { error: 'Client GUID not found - required for IntakeQ navigation' },
          { status: 500 }
        );
      }

      clientGuid = intakeqClient.Guid;

      // Store the GUID on the patient record for future use
      try {
        await updatePatient(body.patientId, { intakeq_guid: clientGuid });
        console.log(`[PushNote] Stored IntakeQ GUID on patient record: ${clientGuid}`);
      } catch (err) {
        // Non-fatal - log but continue
        console.warn('[PushNote] Failed to store IntakeQ GUID on patient:', err);
      }
    } else {
      console.log(`[PushNote] Using provided IntakeQ GUID: ${clientGuid}`);
    }

    // Try to load template field mappings from database
    let fieldMappings = undefined;
    let sectionToEditableIndex = undefined;

    console.log(`[PushNote] Loading template: ${templateName}`);
    const dbTemplate = await getTemplateByName(templateName);

    if (dbTemplate && dbTemplate.fields.length > 0) {
      console.log(`[PushNote] Using DB template mappings (${dbTemplate.fields.length} fields)`);
      fieldMappings = convertToFieldMappings(dbTemplate.fields);
      sectionToEditableIndex = buildSectionToEditableIndex(dbTemplate.fields);
    } else {
      console.log('[PushNote] No DB template found, using hardcoded mappings');
    }

    // Map Epic Scribe note to IntakeQ fields
    console.log('[PushNote] Mapping note sections...');
    const noteSections = fieldMappings
      ? mapEpicScribeNoteToIntakeQ(body.generatedNote, fieldMappings)
      : mapEpicScribeNoteToIntakeQ(body.generatedNote);
    console.log(`[PushNote] Mapped ${noteSections.length} sections`);

    // Extract diagnoses
    console.log('[PushNote] Extracting diagnoses...');
    const diagnoses = extractDiagnosesFromNote(body.generatedNote);
    console.log(`[PushNote] Found ${diagnoses.length} diagnoses`);

    // Initialize Playwright automation
    console.log('[PushNote] Initializing browser automation...');
    const automation = new IntakeQAutomation({
      headless: process.env.NODE_ENV === 'production',
      screenshotOnError: true,
      screenshotDir: '/tmp/intakeq-screenshots',
    });

    try {
      await automation.initialize();

      // Login to IntakeQ
      console.log('[PushNote] Logging in to IntakeQ...');
      await automation.login({
        email: intakeqEmail,
        password: intakeqPassword,
      });

      // Create the note
      console.log('[PushNote] Creating note...');
      const result = await automation.createNote(
        {
          clientGuid,
          templateName,
          noteContent: noteSections,
          diagnoses,
          signatureRequired,
        },
        sectionToEditableIndex
      );

      if (result.success) {
        console.log(`[PushNote] Note created successfully: ${result.noteId}`);
        return NextResponse.json({
          success: true,
          noteId: result.noteId,
          noteUrl: result.noteUrl,
          intakeqGuid: clientGuid,
          sectionsWritten: noteSections.length,
          diagnosesAdded: diagnoses.length,
          templateUsed: templateName,
          usedDbMappings: !!fieldMappings,
        });
      } else {
        console.error(`[PushNote] Note creation failed: ${result.error}`);
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        );
      }
    } finally {
      // Always close the browser
      await automation.close();
    }
  } catch (error) {
    console.error('[PushNote] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
