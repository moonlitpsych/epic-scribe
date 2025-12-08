/**
 * Patient Chart History Database Operations
 *
 * Handles longitudinal tracking of questionnaire scores (PHQ-9, GAD-7)
 * and medication history for trend analysis in note generation.
 */

import { createClient } from '@supabase/supabase-js';
import {
  EpicChartData,
  LongitudinalChartData,
  PatientQuestionnaireHistory,
  PatientMedicationHistory,
  Medication,
} from '@epic-scribe/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculate PHQ-9 severity from score
 */
function getPHQ9Severity(score: number): string {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  if (score <= 19) return 'moderately severe';
  return 'severe';
}

/**
 * Calculate GAD-7 severity from score
 */
function getGAD7Severity(score: number): string {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}

/**
 * Calculate trend direction from scores (most recent first)
 */
function calculateTrend(
  scores: { score: number; date: string }[]
): 'improving' | 'stable' | 'worsening' | 'insufficient_data' {
  if (scores.length < 2) return 'insufficient_data';

  // Compare last two scores (most recent is first)
  const latest = scores[0].score;
  const previous = scores[1].score;
  const diff = latest - previous;

  // Use 3-point threshold for meaningful change
  if (diff <= -3) return 'improving';
  if (diff >= 3) return 'worsening';
  return 'stable';
}

/**
 * Save questionnaire scores to patient history
 */
export async function saveQuestionnaireHistory(params: {
  patientId: string;
  encounterId?: string;
  generatedNoteId?: string;
  encounterDate?: Date;
  phq9Score?: number;
  gad7Score?: number;
}): Promise<PatientQuestionnaireHistory | null> {
  const { patientId, encounterId, generatedNoteId, encounterDate, phq9Score, gad7Score } = params;

  // Skip if no scores to save
  if (phq9Score === undefined && gad7Score === undefined) {
    console.log('[saveQuestionnaireHistory] No scores to save');
    return null;
  }

  const date = encounterDate || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const insertData: any = {
    patient_id: patientId,
    encounter_date: dateStr,
  };

  if (encounterId) insertData.encounter_id = encounterId;
  if (generatedNoteId) insertData.generated_note_id = generatedNoteId;

  if (phq9Score !== undefined) {
    insertData.phq9_score = phq9Score;
    insertData.phq9_severity = getPHQ9Severity(phq9Score);
  }

  if (gad7Score !== undefined) {
    insertData.gad7_score = gad7Score;
    insertData.gad7_severity = getGAD7Severity(gad7Score);
  }

  // Use upsert to handle duplicate encounter dates
  const { data, error } = await supabase
    .from('patient_questionnaire_history')
    .upsert(insertData, { onConflict: 'patient_id,encounter_date' })
    .select()
    .single();

  if (error) {
    console.error('[saveQuestionnaireHistory] Error saving:', error);
    throw error;
  }

  console.log('[saveQuestionnaireHistory] Saved:', {
    patientId,
    date: dateStr,
    phq9: phq9Score,
    gad7: gad7Score,
  });

  return data;
}

/**
 * Save medication history to patient history
 */
export async function saveMedicationHistory(params: {
  patientId: string;
  encounterId?: string;
  generatedNoteId?: string;
  recordedDate?: Date;
  currentMedications?: Medication[];
  pastMedications?: Medication[];
}): Promise<PatientMedicationHistory | null> {
  const {
    patientId,
    encounterId,
    generatedNoteId,
    recordedDate,
    currentMedications,
    pastMedications,
  } = params;

  // Skip if no medications to save
  if (
    (!currentMedications || currentMedications.length === 0) &&
    (!pastMedications || pastMedications.length === 0)
  ) {
    console.log('[saveMedicationHistory] No medications to save');
    return null;
  }

  const date = recordedDate || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const insertData: any = {
    patient_id: patientId,
    recorded_date: dateStr,
  };

  if (encounterId) insertData.encounter_id = encounterId;
  if (generatedNoteId) insertData.generated_note_id = generatedNoteId;

  if (currentMedications && currentMedications.length > 0) {
    insertData.current_medications = currentMedications;
  }

  if (pastMedications && pastMedications.length > 0) {
    insertData.past_medications = pastMedications;
  }

  // Use upsert to handle duplicate dates
  const { data, error } = await supabase
    .from('patient_medication_history')
    .upsert(insertData, { onConflict: 'patient_id,recorded_date' })
    .select()
    .single();

  if (error) {
    console.error('[saveMedicationHistory] Error saving:', error);
    throw error;
  }

  console.log('[saveMedicationHistory] Saved:', {
    patientId,
    date: dateStr,
    currentCount: currentMedications?.length || 0,
    pastCount: pastMedications?.length || 0,
  });

  return data;
}

/**
 * Save all chart data to patient history (convenience function)
 */
export async function saveChartDataToHistory(params: {
  patientId: string;
  encounterId?: string;
  generatedNoteId?: string;
  epicChartData: EpicChartData;
}): Promise<void> {
  const { patientId, encounterId, generatedNoteId, epicChartData } = params;

  // Save questionnaire scores
  if (epicChartData.questionnaires) {
    await saveQuestionnaireHistory({
      patientId,
      encounterId,
      generatedNoteId,
      phq9Score: epicChartData.questionnaires.phq9?.score,
      gad7Score: epicChartData.questionnaires.gad7?.score,
    });
  }

  // Save medications
  if (epicChartData.medications) {
    await saveMedicationHistory({
      patientId,
      encounterId,
      generatedNoteId,
      currentMedications: epicChartData.medications.current,
      pastMedications: epicChartData.medications.past,
    });
  }
}

/**
 * Get questionnaire history for a patient (most recent first)
 */
export async function getQuestionnaireHistory(
  patientId: string,
  limit: number = 10
): Promise<PatientQuestionnaireHistory[]> {
  const { data, error } = await supabase
    .from('patient_questionnaire_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('encounter_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getQuestionnaireHistory] Error fetching:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get medication history for a patient (most recent first)
 */
export async function getMedicationHistory(
  patientId: string,
  limit: number = 10
): Promise<PatientMedicationHistory[]> {
  const { data, error } = await supabase
    .from('patient_medication_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getMedicationHistory] Error fetching:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get longitudinal chart data for a patient with trend analysis
 * This is the main function used by the prompt builder
 */
export async function getLongitudinalChartData(
  patientId: string
): Promise<LongitudinalChartData | null> {
  // Fetch both histories in parallel
  const [questionnaireHistory, medicationHistory] = await Promise.all([
    getQuestionnaireHistory(patientId, 12), // Last 12 data points (~1 year of monthly visits)
    getMedicationHistory(patientId, 6), // Last 6 medication snapshots
  ]);

  // If no data, return null
  if (questionnaireHistory.length === 0 && medicationHistory.length === 0) {
    return null;
  }

  // Build PHQ-9 trend data
  const phq9Data = questionnaireHistory
    .filter((q) => q.phq9_score !== null && q.phq9_score !== undefined)
    .map((q) => ({
      date: q.encounter_date,
      score: q.phq9_score!,
      severity: q.phq9_severity || getPHQ9Severity(q.phq9_score!),
    }));

  // Build GAD-7 trend data
  const gad7Data = questionnaireHistory
    .filter((q) => q.gad7_score !== null && q.gad7_score !== undefined)
    .map((q) => ({
      date: q.encounter_date,
      score: q.gad7_score!,
      severity: q.gad7_severity || getGAD7Severity(q.gad7_score!),
    }));

  // Build medication change timeline
  const medicationChanges = medicationHistory.map((m) => ({
    date: m.recorded_date,
    current: (m.current_medications as Medication[]) || [],
    past: (m.past_medications as Medication[]) || [],
  }));

  // Calculate trends
  const phq9Trend = calculateTrend(phq9Data);
  const gad7Trend = calculateTrend(gad7Data);

  return {
    questionnaire_trends: {
      phq9: phq9Data,
      gad7: gad7Data,
    },
    medication_changes: medicationChanges,
    summary: {
      phq9_trend: phq9Trend,
      gad7_trend: gad7Trend,
      last_phq9: phq9Data[0],
      last_gad7: gad7Data[0],
    },
  };
}

/**
 * Format longitudinal data for AI prompt inclusion
 */
export function formatLongitudinalDataForPrompt(data: LongitudinalChartData): string {
  let output = 'PATIENT LONGITUDINAL CHART DATA:\n\n';

  // PHQ-9 Trend
  if (data.questionnaire_trends.phq9.length > 0) {
    output += '=== PHQ-9 Depression Scores (Most Recent First) ===\n';
    data.questionnaire_trends.phq9.forEach((entry) => {
      output += `  ${entry.date}: ${entry.score}/27 (${entry.severity})\n`;
    });
    output += `  Trend: ${data.summary.phq9_trend.toUpperCase()}\n\n`;
  }

  // GAD-7 Trend
  if (data.questionnaire_trends.gad7.length > 0) {
    output += '=== GAD-7 Anxiety Scores (Most Recent First) ===\n';
    data.questionnaire_trends.gad7.forEach((entry) => {
      output += `  ${entry.date}: ${entry.score}/21 (${entry.severity})\n`;
    });
    output += `  Trend: ${data.summary.gad7_trend.toUpperCase()}\n\n`;
  }

  // Medication History
  if (data.medication_changes.length > 0) {
    output += '=== Medication History ===\n';
    data.medication_changes.forEach((entry) => {
      output += `\n${entry.date}:\n`;
      if (entry.current.length > 0) {
        output += '  Current: ';
        output += entry.current.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}`).join(', ');
        output += '\n';
      }
      if (entry.past.length > 0) {
        output += '  Past trials: ';
        output += entry.past
          .map((m) => `${m.name}${m.reason_stopped ? ` (${m.reason_stopped})` : ''}`)
          .join(', ');
        output += '\n';
      }
    });
  }

  return output;
}
