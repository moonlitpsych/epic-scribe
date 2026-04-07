export type EncounterStatus =
  | 'pending_confirmation'
  | 'scheduled'
  | 'ready'
  | 'in-visit'
  | 'note-pending'
  | 'note-ready'
  | 'signed';

export interface TodayEncounter {
  id: string;
  calendarEventId: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetLink?: string;
  patientId?: string;
  patientName: string;
  patientAge?: number;
  setting?: string;
  visitType?: string;
  payerName?: string;
  primaryDx?: string;
  diagnoses: string[];
  status: EncounterStatus;
  hasNote: boolean;
  noteId?: string;
  isNoteFinal: boolean;
}

export interface TodayResponse {
  encounters: TodayEncounter[];
  date: string;
  providerName: string;
}
