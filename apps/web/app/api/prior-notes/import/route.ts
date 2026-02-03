/**
 * POST /api/prior-notes/import - Import a prior note from Epic
 *
 * Receives parsed note data from the clipboard watcher,
 * matches or creates a patient, and saves the prior note.
 *
 * Note: No auth required for single-user MVP (clipboard watcher uses anon key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatient } from '@/lib/db';
import { savePriorNote, findPatientByNameAndDob } from '@/lib/db/prior-notes';

interface ImportRequest {
  noteContent: string;
  patientFirstName: string;
  patientLastName: string;
  dateOfBirth?: string | null;
  age?: number | null;
  setting?: string | null;
  noteDate?: string | null;
  providerName?: string | null;
  importSource?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();

    // Validate required fields
    if (!body.noteContent) {
      return NextResponse.json(
        { error: 'noteContent is required' },
        { status: 400 }
      );
    }

    if (!body.patientFirstName || !body.patientLastName) {
      return NextResponse.json(
        { error: 'patientFirstName and patientLastName are required' },
        { status: 400 }
      );
    }

    // Step 1: Find or create patient
    let patient = await findPatientByNameAndDob(
      body.patientFirstName,
      body.patientLastName,
      body.dateOfBirth
    );

    let isNewPatient = false;

    if (!patient) {
      // Create new patient
      const newPatient = await createPatient({
        first_name: body.patientFirstName,
        last_name: body.patientLastName,
        date_of_birth: body.dateOfBirth || null,
        age: body.age || null,
      });

      patient = {
        id: newPatient.id,
        first_name: newPatient.first_name,
        last_name: newPatient.last_name,
        date_of_birth: newPatient.date_of_birth,
      };
      isNewPatient = true;
    }

    // Step 2: Save prior note
    const { priorNote, isDuplicate } = await savePriorNote({
      patientId: patient.id,
      noteContent: body.noteContent,
      noteDate: body.noteDate,
      setting: body.setting,
      providerName: body.providerName,
      importSource: body.importSource || 'clipboard_watcher',
    });

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        isNewPatient,
      },
      priorNote: {
        id: priorNote.id,
        isDuplicate,
      },
      message: isDuplicate
        ? 'Note already imported for this patient'
        : isNewPatient
        ? 'Created new patient and imported note'
        : 'Imported note for existing patient',
    });
  } catch (error) {
    console.error('Error importing prior note:', error);
    return NextResponse.json(
      { error: 'Failed to import prior note' },
      { status: 500 }
    );
  }
}
