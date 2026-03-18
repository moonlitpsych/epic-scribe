'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, FileText, Calendar, Sparkles, Brain } from 'lucide-react';
import PatientOverviewTab from '@/components/patient/PatientOverviewTab';
import PatientNotesTab from '@/components/patient/PatientNotesTab';
import PatientEncountersTab from '@/components/patient/PatientEncountersTab';
import PatientGenerateTab from '@/components/patient/PatientGenerateTab';
import PatientProfileTab from '@/components/patient/PatientProfileTab';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Encounter {
  id: string;
  calendar_event_id: string;
  setting: string;
  visit_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meet_link: string | null;
}

interface PatientNote {
  id: string;
  patient_id: string;
  note_type: 'clinical_note' | 'quick_memo';
  title: string | null;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedNote {
  id: string;
  encounter_id: string;
  template_id: string | null;
  generated_content: string | null;
  final_note_content: string | null;
  is_final: boolean;
  finalized_at: string | null;
  finalized_by: string | null;
  generated_at: string;
  encounter?: {
    setting: string;
    visit_type: string;
    scheduled_start: string;
  };
}

type TabType = 'overview' | 'notes' | 'encounters' | 'generate' | 'profile';

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <User size={18} /> },
  { key: 'notes', label: 'Notes', icon: <FileText size={18} /> },
  { key: 'encounters', label: 'Encounters', icon: <Calendar size={18} /> },
  { key: 'generate', label: 'Generate Note', icon: <Sparkles size={18} /> },
  { key: 'profile', label: 'Profile', icon: <Brain size={18} /> },
];

function PatientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL, default to 'overview'
  const activeTab = (searchParams.get('tab') as TabType) || 'overview';
  const preselectedEncounterId = searchParams.get('encounter') || null;

  // Data state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all patient data
  const fetchPatientData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient details
      const patientResponse = await fetch(`/api/patients/${id}`);
      if (!patientResponse.ok) {
        throw new Error('Failed to fetch patient');
      }
      const patientData = await patientResponse.json();
      setPatient(patientData.patient);
      setEncounters(patientData.encounters || []);

      // Fetch patient notes (manual)
      const notesResponse = await fetch(`/api/patients/${id}/notes`);
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setPatientNotes(notesData.notes || []);
      }

      // Fetch generated notes
      const generatedResponse = await fetch(`/api/patients/${id}/generated-notes`);
      if (generatedResponse.ok) {
        const generatedData = await generatedResponse.json();
        setGeneratedNotes(generatedData.notes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchPatientData(params.id as string);
    }
  }, [params.id]);

  const handleTabChange = (tab: TabType) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', tab);
    // Clear encounter param when switching tabs (unless going to generate)
    if (tab !== 'generate') {
      newParams.delete('encounter');
    }
    router.push(`/patients/${params.id}?${newParams.toString()}`);
  };

  const handleGenerateFromEncounter = (encounterId: string) => {
    router.push(`/patients/${params.id}?tab=generate&encounter=${encounterId}`);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent" />
          <p className="mt-4 text-[var(--text-secondary)]">Loading patient...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !patient) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-6">
            <p className="text-[var(--error-text)] font-medium">{error || 'Patient not found'}</p>
            <Link
              href="/patients"
              className="mt-4 inline-flex items-center gap-2 text-[var(--error-text)] hover:underline"
            >
              <ArrowLeft size={16} />
              Back to Patients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </Link>

        {/* Patient Header */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading text-[var(--text-primary)] tracking-tight">
                {patient.last_name}, {patient.first_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span>
                  <strong>DOB:</strong> {formatDate(patient.date_of_birth)} (Age {calculateAge(patient.date_of_birth)})
                </span>
                {patient.mrn && (
                  <span>
                    <strong>MRN:</strong> {patient.mrn}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                patient.active
                  ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                  : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)]'
              }`}
            >
              {patient.active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] mb-6">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[var(--accent-warm)] text-[var(--accent-warm)] bg-[var(--bg-surface-2)]/30'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <PatientOverviewTab
              patient={patient}
              encounterCount={encounters.length}
              noteCount={patientNotes.length + generatedNotes.length}
              onPatientUpdated={(updatedPatient) => setPatient(updatedPatient)}
            />
          )}

          {activeTab === 'notes' && (
            <PatientNotesTab
              patientId={patient.id}
              patientNotes={patientNotes}
              generatedNotes={generatedNotes}
              onNotesChanged={() => fetchPatientData(patient.id)}
            />
          )}

          {activeTab === 'encounters' && (
            <PatientEncountersTab
              patient={patient}
              encounters={encounters}
              onEncountersChanged={() => fetchPatientData(patient.id)}
              onGenerateNote={handleGenerateFromEncounter}
            />
          )}

          {activeTab === 'generate' && (
            <PatientGenerateTab
              patient={patient}
              encounters={encounters}
              preselectedEncounterId={preselectedEncounterId}
              onNoteGenerated={() => fetchPatientData(patient.id)}
            />
          )}

          {activeTab === 'profile' && (
            <PatientProfileTab patientId={patient.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent" />
            <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      }
    >
      <PatientDetailContent />
    </Suspense>
  );
}
