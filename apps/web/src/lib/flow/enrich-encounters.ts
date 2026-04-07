/**
 * Shared encounter enrichment logic.
 *
 * Takes raw CalendarEncounter[] from Google Calendar and enriches each
 * with patient data, payer, diagnoses, note status, and computed status.
 */

import type { CalendarEncounter } from '@/google-calendar';
import type { TodayEncounter, EncounterStatus } from './types';
import { getEncounterByCalendarEventId } from '@/lib/db/encounters';
import { getSupabaseClient } from '@/lib/supabase';

function calculateAge(dob: string | null): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function enrichCalendarEvents(
  calendarEvents: CalendarEncounter[],
  providerId: string
): Promise<TodayEncounter[]> {
  const supabase = getSupabaseClient(true);
  const encounters: TodayEncounter[] = [];

  for (const event of calendarEvents) {
    // Look up DB encounter by calendar event ID
    let dbEncounter;
    try {
      dbEncounter = await getEncounterByCalendarEventId(event.id);
    } catch {
      dbEncounter = null;
    }

    // Try to match patient by name from calendar event title
    let patientId: string | undefined;
    let patientAge: number | undefined;
    let payerName: string | undefined;
    let diagnoses: string[] = [];
    let primaryDx: string | undefined;

    if (dbEncounter?.patient_id) {
      patientId = dbEncounter.patient_id;
    }

    // If we have a patient name from calendar, try to find them in DB
    if (!patientId && event.patient) {
      const nameParts = event.patient.split(',').map(s => s.trim());
      if (nameParts.length === 2) {
        const [lastName, firstName] = nameParts;
        const { data: patients } = await supabase
          .from('patients')
          .select('id, date_of_birth, age')
          .eq('provider_id', providerId)
          .ilike('last_name', lastName)
          .ilike('first_name', `${firstName}%`)
          .limit(1);

        if (patients && patients.length > 0) {
          patientId = patients[0].id;
          patientAge = patients[0].age ?? calculateAge(patients[0].date_of_birth);
        }
      }
    }

    // If we found a patient, enrich with payer and diagnoses
    if (patientId) {
      if (!patientAge) {
        const { data: patient } = await supabase
          .from('patients')
          .select('age, date_of_birth')
          .eq('id', patientId)
          .single();
        if (patient) {
          patientAge = patient.age ?? calculateAge(patient.date_of_birth);
        }
      }

      // Get payer name
      const { data: patientWithPayer } = await supabase
        .from('patients')
        .select('primary_payer_id')
        .eq('id', patientId)
        .single();

      if (patientWithPayer?.primary_payer_id) {
        const { data: payer } = await (supabase as any)
          .from('payers')
          .select('name')
          .eq('id', patientWithPayer.primary_payer_id)
          .single();
        if (payer) payerName = payer.name;
      }

      // Get diagnoses from patient profile
      const { data: profile } = await (supabase as any)
        .from('patient_profiles')
        .select('profile_data')
        .eq('patient_id', patientId)
        .single();

      if (profile?.profile_data?.diagnoses) {
        diagnoses = profile.profile_data.diagnoses
          .slice(0, 5)
          .map((d: any) => {
            const code = d.icd10Code || d.code || '';
            const name = d.name || d.description || '';
            return code ? `${code} ${name}` : name;
          })
          .filter(Boolean);
        primaryDx = diagnoses[0];
      }
    }

    // Check for notes
    let hasNote = false;
    let noteId: string | undefined;
    let isNoteFinal = false;

    if (dbEncounter?.id) {
      const { data: notes } = await supabase
        .from('notes')
        .select('id, is_final')
        .eq('encounter_id', dbEncounter.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (notes && notes.length > 0) {
        hasNote = true;
        noteId = notes[0].id;
        isNoteFinal = notes[0].is_final ?? false;
      }
    }

    // Compute status
    let status: EncounterStatus = 'scheduled';
    if (dbEncounter?.status) {
      const dbStatus = dbEncounter.status as string;
      if (['pending_confirmation', 'scheduled', 'ready', 'in-visit', 'note-pending', 'note-ready', 'signed'].includes(dbStatus)) {
        status = dbStatus as EncounterStatus;
      }
    } else if (isNoteFinal) {
      status = 'signed';
    } else if (hasNote) {
      status = 'note-ready';
    }

    encounters.push({
      id: dbEncounter?.id || event.id,
      calendarEventId: event.id,
      scheduledStart: event.start,
      scheduledEnd: event.end,
      meetLink: event.meetLink,
      patientId,
      patientName: event.patient || event.summary,
      patientAge,
      setting: event.setting,
      visitType: event.visitType,
      payerName,
      primaryDx,
      diagnoses,
      status,
      hasNote,
      noteId,
      isNoteFinal,
    });
  }

  return encounters;
}
