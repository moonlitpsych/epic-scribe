/**
 * POST /api/actions/staged/[id]/execute — Execute an approved staged action
 *
 * Generic dispatcher. Currently supports: lab.
 * Future: rx_new, referral, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireProviderSession,
  unauthorizedResponse,
  UnauthorizedError,
} from '@/lib/auth/get-provider-session';
import { getSupabaseClient } from '@/lib/supabase';
import { stageLabOrder } from '@/lib/action-resolver/stagers/lab-stager';
import { stageRxOrder } from '@/lib/action-resolver/stagers/rx-stager';
import { createLabRequisition } from '@/lib/db/lab-orders';
import type { StagedAction } from '@/lib/db/staged-actions';

async function getStagedAction(
  id: string,
  providerId: string
): Promise<StagedAction | null> {
  const supabase = getSupabaseClient(true);
  const { data, error } = await (supabase as any)
    .from('staged_actions')
    .select('*')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single();

  if (error) return null;
  return data as StagedAction;
}

async function updateActionStatus(
  id: string,
  providerId: string,
  status: string,
  extra: Record<string, any> = {}
) {
  const supabase = getSupabaseClient(true);
  await (supabase as any)
    .from('staged_actions')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', id)
    .eq('provider_id', providerId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    const actionId = params.id;

    // Fetch and validate
    const action = await getStagedAction(actionId, ps.providerId);
    if (!action) {
      return NextResponse.json(
        { error: 'Staged action not found' },
        { status: 404 }
      );
    }

    if (action.status !== 'approved') {
      return NextResponse.json(
        { error: `Action must be approved before execution (current: ${action.status})` },
        { status: 400 }
      );
    }

    // Set executing status
    await updateActionStatus(actionId, ps.providerId, 'executing');

    try {
      switch (action.action_type) {
        case 'lab': {
          // Enrich with patient/insurance/test data
          const payload = await stageLabOrder(action, ps.providerId);

          // Create requisition
          const result = await createLabRequisition({
            providerId: ps.providerId,
            encounterId: action.encounter_id,
            stagedActionId: action.id,
            patientName: payload.patient.name,
            patientDob: payload.patient.dob,
            patientPhone: payload.patient.phone,
            medicaidId: payload.patient.medicaidId,
            insuranceProvider: payload.insurance?.payer_name || null,
            labLocationId: payload.collectionSite?.id || null,
            specialInstructions: payload.specialInstructions,
            tests: payload.matchedTests.map((t) => ({
              labTestId: t.labTest?.id || null,
              testCode: t.testCode,
              testName: t.testName,
            })),
            diagnoses: payload.diagnoses,
          });

          const executionResult = {
            requisitionId: result.requisition.id,
            requisitionNumber: result.requisitionNumber,
            testsOrdered: result.requisitionTests.length,
            unmatchedTests: payload.unmatchedTests,
            fastingRequired: payload.fastingRequired,
            collectionSite: payload.collectionSite
              ? `${payload.collectionSite.name} · ${payload.collectionSite.address}, ${payload.collectionSite.city} ${payload.collectionSite.state}`
              : null,
          };

          await updateActionStatus(actionId, ps.providerId, 'completed', {
            execution_result: executionResult,
            executed_at: new Date().toISOString(),
          });

          return NextResponse.json({
            status: 'completed',
            execution_result: executionResult,
          });
        }

        case 'rx_new':
        case 'rx_change':
        case 'rx_refill':
        case 'rx_discontinue': {
          // Enrich with patient/profile data
          const rxPayload = await stageRxOrder(action, ps.providerId);

          const rxExecutionResult = {
            medication: rxPayload.medication,
            dose: rxPayload.dose,
            frequency: rxPayload.frequency,
            quantity: rxPayload.quantity,
            refills: rxPayload.refills,
            indication: rxPayload.indication,
            isControlled: rxPayload.isControlled,
            patient: rxPayload.patient,
            currentMedications: rxPayload.currentMedications,
            ...(rxPayload.previousDose && { previousDose: rxPayload.previousDose }),
            ...(rxPayload.changeReason && { changeReason: rxPayload.changeReason }),
            ...(rxPayload.taperInstructions && { taperInstructions: rxPayload.taperInstructions }),
            ...(rxPayload.discontinueReason && { discontinueReason: rxPayload.discontinueReason }),
          };

          await updateActionStatus(actionId, ps.providerId, 'completed', {
            execution_result: rxExecutionResult,
            executed_at: new Date().toISOString(),
          });

          return NextResponse.json({
            status: 'completed',
            execution_result: rxExecutionResult,
          });
        }

        default:
          await updateActionStatus(actionId, ps.providerId, 'approved');
          return NextResponse.json(
            { error: `Execution not supported for action type: ${action.action_type}` },
            { status: 400 }
          );
      }
    } catch (execError: any) {
      console.error(`[execute] Error executing ${action.action_type}:`, execError);
      await updateActionStatus(actionId, ps.providerId, 'failed', {
        error_message: execError.message || 'Execution failed',
      });

      return NextResponse.json(
        {
          status: 'failed',
          error: execError.message || 'Execution failed',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return unauthorizedResponse(error.message);
    console.error('[POST /api/actions/staged/[id]/execute] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}
