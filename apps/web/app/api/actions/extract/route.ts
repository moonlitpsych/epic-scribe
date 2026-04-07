/**
 * POST /api/actions/extract — Trigger action extraction for an encounter transcript
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { extractActionsFromTranscript } from '@/lib/action-resolver/extractor';
import { createStagedActions, clearStagedActionsForEncounter } from '@/lib/db/staged-actions';
import { getPatientProfile } from '@/lib/db/patient-profiles';
import { getPatientById } from '@/lib/db/patients';

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();
    const body = await request.json();

    const { encounterId, transcript, patientId, visitType, payerName } = body;

    if (!encounterId || !transcript?.trim()) {
      return NextResponse.json(
        { error: 'encounterId and transcript are required' },
        { status: 400 }
      );
    }

    // Load patient context for better extraction
    let patientName: string | undefined;
    let currentMeds: string[] = [];
    let diagnoses: string[] = [];

    if (patientId) {
      const [patient, profile] = await Promise.all([
        getPatientById(patientId, ps.providerId).catch(() => null),
        getPatientProfile(patientId, ps.providerId).catch(() => null),
      ]);

      if (patient) {
        patientName = `${patient.first_name} ${patient.last_name}`;
      }

      if (profile) {
        currentMeds = (profile.currentMedications || [])
          .filter((m: any) => m.status === 'active')
          .map((m: any) => [m.name, m.dose, m.frequency].filter(Boolean).join(' '));
        diagnoses = (profile.diagnoses || [])
          .filter((d: any) => d.status === 'active')
          .map((d: any) => d.name);
      }
    }

    // Extract actions from transcript
    const { actions, metadata } = await extractActionsFromTranscript({
      transcript,
      patientName,
      visitType,
      currentMeds,
      diagnoses,
      payerName,
    });

    // Clear previous staged actions (idempotent re-extraction)
    await clearStagedActionsForEncounter(encounterId, ps.providerId);

    // Bulk insert
    const staged = await createStagedActions(
      actions.map((a) => ({
        encounterId,
        patientId,
        providerId: ps.providerId,
        actionType: a.type,
        urgency: a.urgency,
        summary: a.summary,
        details: a.details,
        transcriptExcerpt: a.transcript_excerpt,
        extractionModel: metadata.model,
        extractionLatencyMs: metadata.latencyMs,
      }))
    );

    console.log(`[POST /api/actions/extract] Extracted ${staged.length} actions for encounter ${encounterId}`);

    return NextResponse.json({ actions: staged, count: staged.length });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[POST /api/actions/extract] Error:', error);
    return NextResponse.json({ error: 'Failed to extract actions' }, { status: 500 });
  }
}
