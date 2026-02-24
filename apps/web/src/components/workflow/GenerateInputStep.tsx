// apps/web/src/components/workflow/GenerateInputStep.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { ChevronLeft, Sparkles, Eye, AlertCircle, Globe, Languages, CheckCircle, CloudDownload, Mail, Save, Link2, Heart, QrCode, X, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import PatientSelector from './PatientSelector';
import EncountersList from './EncountersList';
import ManualNotePanel from './ManualNotePanel';
import TranscriptSelector from './TranscriptSelector';
import { CalendarEncounter } from '@/google-calendar';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string;
  email?: string;
  notes?: string;
}

interface GenerateInputStepProps {
  setting: Setting;
  visitType: string;
  template: Template;
  onGenerate: (transcript: string, previousNote: string, patient: Patient | null, encounterId: string | null, epicChartData?: string, questionnairesCompleted?: boolean) => void;
  onBack: () => void;
  isGenerating: boolean;
  initialTranscript?: string;
  initialPreviousNote?: string;
  selectedPatient?: Patient | null;
  encounterId?: string | null;
  companionPriorNote?: string | null;
}

export default function GenerateInputStep({
  setting,
  visitType,
  template,
  onGenerate,
  onBack,
  isGenerating,
  initialTranscript = '',
  initialPreviousNote = '',
  selectedPatient: initialPatient = null,
  encounterId: initialEncounterId = null,
  companionPriorNote,
}: GenerateInputStepProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [previousNote, setPreviousNote] = useState(initialPreviousNote);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [promptPreview, setPromptPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [encounterId, setEncounterId] = useState<string | null>(initialEncounterId);

  // Translation-related state
  const [isSpanishTranscript, setIsSpanishTranscript] = useState(false);
  const [spanishTranscript, setSpanishTranscript] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);

  // Encounters state
  const [encounters, setEncounters] = useState<CalendarEncounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // Saved note from generated_notes (highest priority prior note source)
  const [savedNote, setSavedNote] = useState<{
    id: string;
    finalizedAt: string;
    setting: string;
    visitType: string;
    encounterDate: string;
  } | null>(null);
  const [checkingSavedNotes, setCheckingSavedNotes] = useState(false);

  // Auto-imported prior note state
  const [autoImportedNote, setAutoImportedNote] = useState<{
    id: string;
    importedAt: string;
  } | null>(null);
  const [checkingPriorNotes, setCheckingPriorNotes] = useState(false);

  // IntakeQ prior note state (for Moonlit Psychiatry)
  const [intakeQEnabled, setIntakeQEnabled] = useState(true);
  const [intakeQNote, setIntakeQNote] = useState<{ content: string; date: string; noteName: string } | null>(null);
  const [intakeQLoading, setIntakeQLoading] = useState(false);
  const [intakeQError, setIntakeQError] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Companion sync state
  const [companionSynced, setCompanionSynced] = useState(false);

  // HealthKit clinical data summary
  const [clinicalDataSummary, setClinicalDataSummary] = useState<{
    hasClinicalData: boolean;
    lastSyncedAt: string | null;
    counts: Record<string, number>;
  } | null>(null);

  // Payer dropdown state
  const [payers, setPayers] = useState<{ id: string; name: string }[]>([]);
  const [patientPayerId, setPatientPayerId] = useState<string>('');
  const [savingPayer, setSavingPayer] = useState(false);

  // QR code state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const generateQrCode = useCallback(async () => {
    if (!selectedPatient) return;
    const payload = JSON.stringify({
      id: selectedPatient.id,
      name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
    });
    const url = await QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: { dark: '#0A1F3D', light: '#FFFFFF' },
    });
    setQrDataUrl(url);
    setShowQrModal(true);
  }, [selectedPatient]);

  // Fetch payers list on mount
  useEffect(() => {
    fetch('/api/payers')
      .then((res) => res.json())
      .then((data) => setPayers(data.payers || []))
      .catch(() => {});
  }, []);

  // Load patient's current payer when patient changes
  useEffect(() => {
    if (selectedPatient) {
      fetch(`/api/patients/${selectedPatient.id}`)
        .then((res) => res.json())
        .then((data) => setPatientPayerId(data.patient?.primary_payer_id || ''))
        .catch(() => setPatientPayerId(''));
    } else {
      setPatientPayerId('');
    }
  }, [selectedPatient?.id]);

  const handlePayerChange = async (payerId: string) => {
    if (!selectedPatient) return;
    setPatientPayerId(payerId);
    setSavingPayer(true);
    try {
      await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryPayerId: payerId || null }),
      });
    } catch (error) {
      console.error('Error saving payer:', error);
    } finally {
      setSavingPayer(false);
    }
  };

  // Pre-visit questionnaire state (for 96127 billing)
  const [questionnairesCompleted, setQuestionnairesCompleted] = useState(false);

  // Epic chart data - only needed for Intake/Consultation (no copied-forward note)
  const [epicChartData, setEpicChartData] = useState('');
  const showEpicChartInput = visitType === 'Intake' || visitType === 'Consultation Visit';

  // Show prior note section for Follow-up/TOC, but HealthKit data can substitute
  const hasClinicalData = clinicalDataSummary?.hasClinicalData ?? false;
  const showPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';
  const requiresPreviousNote = showPreviousNote && !hasClinicalData;

  // Word count for display
  const activeTranscript = isSpanishTranscript ? spanishTranscript : transcript;
  const wordCount = activeTranscript.trim().split(/\s+/).filter(Boolean).length;

  // Can proceed to translation or generation
  const canTranslate = isSpanishTranscript && spanishTranscript.trim().length > 0 && !hasTranslated;
  // Patient with first and last name is now required for note generation
  const hasValidPatient = selectedPatient && selectedPatient.first_name && selectedPatient.last_name;
  const canGenerate = transcript.trim().length > 0 &&
    (!requiresPreviousNote || previousNote.trim().length > 0) &&
    (!isSpanishTranscript || hasTranslated) &&
    hasValidPatient;

  // Fetch encounters when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientEncounters();
    } else {
      setEncounters([]);
      setSelectedEncounterId(null);
    }
  }, [selectedPatient]);

  // Check for HealthKit clinical data when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      fetch(`/api/clinical-data/summary?patientId=${selectedPatient.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.hasClinicalData) {
            setClinicalDataSummary(data);
          } else {
            setClinicalDataSummary(null);
          }
        })
        .catch(() => setClinicalDataSummary(null));
    } else {
      setClinicalDataSummary(null);
    }
  }, [selectedPatient]);

  // Primary: Check for saved notes from generated_notes (highest priority)
  useEffect(() => {
    if (selectedPatient && showPreviousNote && !previousNote) {
      checkForSavedNote();
    } else if (!selectedPatient) {
      setSavedNote(null);
      setAutoImportedNote(null);
    }
  }, [selectedPatient, showPreviousNote]);

  // Fallback: Check clipboard-imported prior notes when saved note check found nothing
  useEffect(() => {
    if (selectedPatient && showPreviousNote && !previousNote && !checkingSavedNotes && !savedNote) {
      checkForPriorNotes();
    }
  }, [selectedPatient, showPreviousNote, checkingSavedNotes, savedNote]);

  const checkForSavedNote = async () => {
    if (!selectedPatient) return;

    setCheckingSavedNotes(true);
    try {
      const response = await fetch(`/api/notes/most-recent?patientId=${selectedPatient.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.found) {
          setSavedNote({
            id: data.note.id,
            finalizedAt: data.note.finalizedAt,
            setting: data.note.setting,
            visitType: data.note.visitType,
            encounterDate: data.note.encounterDate,
          });
          setPreviousNote(data.note.finalNoteContent);
          setAutoImportedNote(null);
          setIntakeQNote(null);
          setCompanionSynced(false);
        }
      }
    } catch (error) {
      console.error('Error checking saved notes:', error);
    } finally {
      setCheckingSavedNotes(false);
    }
  };

  const clearSavedNote = () => {
    setSavedNote(null);
    setPreviousNote('');
  };

  const checkForPriorNotes = async () => {
    if (!selectedPatient) return;

    setCheckingPriorNotes(true);
    try {
      const response = await fetch(`/api/prior-notes/patient/${selectedPatient.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.priorNotes && data.priorNotes.length > 0) {
          const latestNote = data.priorNotes[0];
          setAutoImportedNote({
            id: latestNote.id,
            importedAt: latestNote.imported_at,
          });
          // Auto-populate the previous note field
          setPreviousNote(latestNote.note_content);
        }
      }
    } catch (error) {
      console.error('Error checking prior notes:', error);
    } finally {
      setCheckingPriorNotes(false);
    }
  };

  const clearAutoImportedNote = () => {
    setAutoImportedNote(null);
    setPreviousNote('');
  };

  // IntakeQ prior note fetching (for Moonlit Psychiatry patients with email)
  useEffect(() => {
    // Skip if saved note already loaded (higher priority source)
    if (savedNote) return;

    // Only fetch from IntakeQ for Moonlit Psychiatry patients
    if (setting !== 'Moonlit Psychiatry') {
      setIntakeQNote(null);
      setIntakeQError(null);
      setShowEmailPrompt(false);
      return;
    }

    // Reset state when patient changes
    setIntakeQNote(null);
    setIntakeQError(null);
    setShowEmailPrompt(false);

    // Check if patient has email
    if (!selectedPatient?.email) {
      if (selectedPatient && showPreviousNote && intakeQEnabled) {
        setShowEmailPrompt(true);
      }
      return;
    }

    // Fetch if enabled and visit type supports previous note
    if (intakeQEnabled && showPreviousNote && selectedPatient.email) {
      fetchIntakeQPriorNote(selectedPatient.email);
    }
  }, [selectedPatient, setting, intakeQEnabled, showPreviousNote]);

  // Auto-populate from Companion Portal prior note
  useEffect(() => {
    // Skip if saved note already loaded (higher priority source)
    if (savedNote) return;

    if (companionPriorNote && !previousNote && !companionSynced) {
      setPreviousNote(companionPriorNote);
      setCompanionSynced(true);
      setAutoImportedNote(null);
      setIntakeQNote(null);
    } else if (companionPriorNote && companionPriorNote !== previousNote && !companionSynced) {
      setPreviousNote(companionPriorNote);
      setCompanionSynced(true);
    }
  }, [companionPriorNote]);

  const fetchIntakeQPriorNote = async (email: string) => {
    setIntakeQLoading(true);
    setIntakeQError(null);

    try {
      const response = await fetch(`/api/intakeq/prior-note?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.found) {
        setIntakeQNote({
          content: data.priorNote,
          date: data.noteDate,
          noteName: data.noteName || 'IntakeQ Note',
        });
        // Auto-populate the previous note field
        setPreviousNote(data.priorNote);
        setAutoImportedNote(null); // Clear any Epic auto-import
      } else {
        // Set appropriate error message
        switch (data.reason) {
          case 'patient_not_found':
            setIntakeQError('Patient not found in IntakeQ. You can paste a note manually below.');
            break;
          case 'no_notes':
            setIntakeQError('No prior notes found in IntakeQ. You can paste a note manually below.');
            break;
          case 'not_configured':
            setIntakeQError('IntakeQ integration is not configured.');
            break;
          default:
            setIntakeQError(data.message || 'Failed to fetch from IntakeQ. You can paste a note manually below.');
        }
      }
    } catch (error) {
      console.error('Error fetching IntakeQ prior note:', error);
      setIntakeQError('Failed to connect to IntakeQ. You can paste a note manually below.');
    } finally {
      setIntakeQLoading(false);
    }
  };

  const clearIntakeQNote = () => {
    setIntakeQNote(null);
    setIntakeQError(null);
    setPreviousNote('');
  };

  const handleSavePatientEmail = async () => {
    if (!selectedPatient || !pendingEmail.trim()) return;

    setSavingEmail(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail.trim() }),
      });

      if (response.ok) {
        // Update local patient state with email
        const updatedPatient = { ...selectedPatient, email: pendingEmail.trim() };
        setSelectedPatient(updatedPatient);
        setShowEmailPrompt(false);
        setPendingEmail('');
        // Fetch from IntakeQ with new email
        fetchIntakeQPriorNote(pendingEmail.trim());
      } else {
        alert('Failed to save email. Please try again.');
      }
    } catch (error) {
      console.error('Error saving patient email:', error);
      alert('Failed to save email. Please try again.');
    } finally {
      setSavingEmail(false);
    }
  };

  const fetchPatientEncounters = async () => {
    if (!selectedPatient) return;

    setLoadingEncounters(true);
    try {
      const response = await fetch('/api/encounters');
      if (response.ok) {
        const data = await response.json();
        const patientEncounters = data.encounters.filter(
          (enc: any) => enc.patientId === selectedPatient.id
        );
        setEncounters(patientEncounters);
      }
    } catch (error) {
      console.error('Error fetching encounters:', error);
    } finally {
      setLoadingEncounters(false);
    }
  };

  const handleSelectEncounter = (encounter: CalendarEncounter) => {
    setSelectedEncounterId(encounter.id);
    setEncounterId(encounter.id);
  };

  const handleEncounterCreated = (data: any) => {
    fetchPatientEncounters();
    if (data.calendarEncounter) {
      setSelectedEncounterId(data.calendarEncounter.id);
      setEncounterId(data.calendarEncounter.id);
    }
  };

  const handleCreateEncounter = async (patient: Patient, startTime: Date, endTime: Date) => {
    // Handled by PatientSelector component
  };

  const handleTranslate = async () => {
    if (!canTranslate) return;

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spanishTranscript,
          sourceLanguage: 'Spanish',
          targetLanguage: 'English',
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranscript(data.translatedText);
      setHasTranslated(true);

      // Show success message
      console.log(`Translation completed in ${data.latencyMs}ms`);
    } catch (error) {
      console.error('Error translating transcript:', error);
      alert('Failed to translate transcript. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageToggle = () => {
    if (hasTranslated) {
      // Reset if already translated
      if (confirm('Switching language will reset the translation. Continue?')) {
        setIsSpanishTranscript(!isSpanishTranscript);
        setHasTranslated(false);
        setTranscript('');
        setSpanishTranscript('');
      }
    } else {
      setIsSpanishTranscript(!isSpanishTranscript);
    }
  };

  const handlePreviewPrompt = async () => {
    setLoadingPreview(true);
    try {
      const preview = `SYSTEM:
You are a HIPAA-compliant clinical documentation assistant for Dr. Rufus Sweeney.

TEMPLATE: ${template.name}
Setting: ${setting}
Visit Type: ${visitType}
${hasTranslated ? 'Note: Transcript was translated from Spanish' : ''}

TRANSCRIPT (${wordCount} words):
${transcript}

${previousNote ? `PREVIOUS NOTE:\n${previousNote}\n\n` : ''}

[Full prompt would include template sections and SmartTools instructions...]`;

      setPromptPreview(preview);
      setShowPromptPreview(true);
    } catch (error) {
      console.error('Error previewing prompt:', error);
      alert('Failed to preview prompt');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(transcript, previousNote, selectedPatient, encounterId, epicChartData || undefined, questionnairesCompleted || undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Summary Card - Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#5A6B7D]">Using template:</p>
            <p className="text-lg font-semibold text-[#0A1F3D]">{template.name}</p>
            <p className="text-sm text-[#5A6B7D]">
              {setting} • {visitType} • {template.sections?.length || 0} sections
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Template
          </button>
        </div>
      </div>

      {/* Patient Selection - FIRST and Prominent */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border-2 border-blue-200 p-6">
        <h2 className="text-xl font-serif text-[#0A1F3D] mb-3">Step 1: Select or Create Patient</h2>
        <p className="text-sm text-[#5A6B7D] mb-4">
          Selecting a patient enables note saving and maintains continuity across visits.
        </p>
        <PatientSelector
          selectedPatient={selectedPatient}
          onPatientSelect={setSelectedPatient}
          onCreateEncounter={handleCreateEncounter}
          onEncounterCreated={handleEncounterCreated}
          setting={setting}
          visitType={visitType}
        />

        {/* Encounters List (shown when patient is selected) */}
        {selectedPatient && (
          <div className="mt-4">
            <EncountersList
              encounters={encounters}
              selectedEncounterId={selectedEncounterId}
              onSelectEncounter={handleSelectEncounter}
              loading={loadingEncounters}
            />
          </div>
        )}

        {/* HealthKit Clinical Data Badge + QR Button */}
        {selectedPatient && (
          <div className="mt-3 flex items-center gap-2">
            {clinicalDataSummary?.hasClinicalData && (
              <div className="flex-1 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <Heart className="text-green-600 flex-shrink-0" size={16} />
                <span className="text-sm text-green-700">
                  Health Records synced
                  {clinicalDataSummary.lastSyncedAt && (
                    <> ({new Date(clinicalDataSummary.lastSyncedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })})</>
                  )}
                  {Object.keys(clinicalDataSummary.counts).length > 0 && (
                    <span className="text-green-600">
                      {' '}&mdash; {Object.entries(clinicalDataSummary.counts)
                        .map(([type, count]) => `${count} ${type}`)
                        .join(', ')}
                    </span>
                  )}
                </span>
              </div>
            )}
            <button
              onClick={generateQrCode}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0A1F3D] bg-white border border-[#C5A882]/30 rounded-lg hover:bg-[#F5F1ED] transition-colors"
              title="Show QR code for HealthKit pairing"
            >
              <QrCode size={16} />
              QR
            </button>
          </div>
        )}
      </div>

      {/* Payer Selection (shown when patient is selected) */}
      {selectedPatient && payers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#0A1F3D] whitespace-nowrap">Primary Payer</label>
            <select
              value={patientPayerId}
              onChange={(e) => handlePayerChange(e.target.value)}
              disabled={savingPayer}
              className="flex-1 px-3 py-1.5 text-sm border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent bg-white"
            >
              <option value="">No payer</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {savingPayer && (
              <span className="text-xs text-[#5A6B7D]">Saving...</span>
            )}
          </div>
        </div>
      )}

      {/* Manual Note Panel (collapsible - shown when patient is selected) */}
      {selectedPatient && (
        <ManualNotePanel
          patient={selectedPatient}
          onNoteSaved={() => {
            // Could refresh notes list if displayed elsewhere
            console.log('Manual note saved for patient:', selectedPatient.id);
          }}
        />
      )}

      {/* Document Input Section */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif text-[#0A1F3D]">Step 2: Provide Documentation</h2>
          <button
            onClick={handleLanguageToggle}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all
              ${isSpanishTranscript
                ? 'bg-[#E89C8A] text-white hover:bg-[#0A1F3D]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            <Languages size={16} />
            {isSpanishTranscript ? 'Spanish' : 'English'}
          </button>
        </div>

        {isSpanishTranscript && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Globe className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm font-semibold text-blue-900">Translation Workflow</p>
                <p className="text-sm text-blue-700 mt-1">
                  1. Paste your Spanish transcript from Google Meet<br />
                  2. Click "Translate to English" to convert the transcript<br />
                  3. Review the translation and proceed with note generation
                </p>
                {hasTranslated && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Translation completed successfully</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spanish Transcript Input (when Spanish mode is active and not yet translated) */}
        {isSpanishTranscript && !hasTranslated && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Spanish Transcript <span className="text-red-500">*</span>
            </label>
            <textarea
              value={spanishTranscript}
              onChange={(e) => setSpanishTranscript(e.target.value)}
              placeholder="Pegue aquí la transcripción en español de Google Meet..."
              rows={12}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              disabled={isTranslating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-[#5A6B7D]">
                {wordCount} palabras
              </p>
              {spanishTranscript.trim().length === 0 && (
                <p className="text-sm text-red-500">Spanish transcript is required</p>
              )}
            </div>

            {/* Translation Button */}
            <button
              onClick={handleTranslate}
              disabled={!canTranslate || isTranslating}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Globe size={20} />
              {isTranslating ? 'Translating...' : 'Translate to English'}
            </button>
          </div>
        )}

        {/* Google Drive Transcript Selector (when patient is selected and in English mode) */}
        {selectedPatient && !isSpanishTranscript && (
          <div className="mb-6">
            <TranscriptSelector
              encounterId={selectedEncounterId}
              patientName={selectedPatient ? `${selectedPatient.last_name}, ${selectedPatient.first_name}` : null}
              onTranscriptLoaded={(content) => {
                setTranscript(content);
              }}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* English Transcript Input (when in English mode or after translation) */}
        {(!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              {hasTranslated ? 'Translated English Transcript' : 'Transcript'}
              <span className="text-red-500"> *</span>
              {hasTranslated && (
                <span className="ml-2 text-green-600 text-xs">✓ Translated from Spanish</span>
              )}
              {transcript.trim().length > 0 && !hasTranslated && selectedEncounterId && (
                <span className="ml-2 text-purple-600 text-xs">✓ Loaded from Google Drive</span>
              )}
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste or type the clinical encounter transcript here, or load from Google Drive above..."
              rows={12}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-[#5A6B7D]">
                {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </p>
              {transcript.trim().length === 0 && (
                <p className="text-sm text-red-500">Transcript is required</p>
              )}
            </div>
          </div>
        )}

        {/* Previous Note / Copied-forward Last Note Input (conditional) */}
        {showPreviousNote && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              {setting === 'Moonlit Psychiatry' ? 'Prior Note' : 'Copied-forward Last Note'}{' '}
              {requiresPreviousNote ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-[#5A6B7D] font-normal">(optional — Health Records synced)</span>
              )}
            </label>

            {/* IntakeQ Integration UI (Moonlit Psychiatry only) */}
            {setting === 'Moonlit Psychiatry' && (
              <div className="mb-3">
                {/* IntakeQ Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={intakeQEnabled}
                      onChange={(e) => setIntakeQEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-[#E89C8A] focus:ring-[#E89C8A]"
                    />
                    <span className="text-sm text-[#5A6B7D]">
                      <CloudDownload size={14} className="inline mr-1" />
                      Fetch from IntakeQ
                    </span>
                  </label>
                </div>

                {/* IntakeQ Loading */}
                {intakeQLoading && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                    <span className="text-sm text-purple-700">Fetching prior note from IntakeQ...</span>
                  </div>
                )}

                {/* IntakeQ Success */}
                {intakeQNote && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <CheckCircle className="text-purple-600 flex-shrink-0" size={16} />
                    <span className="text-sm text-purple-700">
                      Loaded from IntakeQ: {intakeQNote.noteName} ({new Date(intakeQNote.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })})
                    </span>
                    <button
                      onClick={clearIntakeQNote}
                      className="ml-auto text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* IntakeQ Error */}
                {intakeQError && !intakeQLoading && (
                  <div className="flex items-start gap-2 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                    <span className="text-sm text-amber-700">{intakeQError}</span>
                  </div>
                )}

                {/* Email Prompt (if patient has no email) */}
                {showEmailPrompt && intakeQEnabled && !intakeQNote && !intakeQLoading && (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                      <span className="text-sm text-blue-700">
                        Add patient email to fetch prior notes from IntakeQ
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={pendingEmail}
                        onChange={(e) => setPendingEmail(e.target.value)}
                        placeholder="patient@email.com"
                        className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        disabled={savingEmail}
                      />
                      <button
                        onClick={handleSavePatientEmail}
                        disabled={!pendingEmail.trim() || savingEmail}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={14} />
                        {savingEmail ? 'Saving...' : 'Save & Fetch'}
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Or skip and paste a note manually below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Saved note indicator (highest priority) */}
            {savedNote && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText className="text-blue-600 flex-shrink-0" size={16} />
                <span className="text-sm text-blue-700">
                  Last Patient Note
                  {savedNote.encounterDate && (
                    <> ({new Date(savedNote.encounterDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })})</>
                  )}
                  {savedNote.setting && savedNote.visitType && (
                    <span className="text-blue-500"> &mdash; {savedNote.setting}, {savedNote.visitType}</span>
                  )}
                </span>
                <button
                  onClick={clearSavedNote}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Loading indicator for saved notes check */}
            {checkingSavedNotes && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-blue-700">Checking for saved notes...</span>
              </div>
            )}

            {/* Companion sync indicator */}
            {companionSynced && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                <Link2 className="text-indigo-600 flex-shrink-0" size={16} />
                <span className="text-sm text-indigo-700">
                  Synced from Companion Portal
                </span>
                <button
                  onClick={() => {
                    setCompanionSynced(false);
                    setPreviousNote('');
                  }}
                  className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Auto-imported note indicator (non-Moonlit settings) */}
            {setting !== 'Moonlit Psychiatry' && autoImportedNote && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                <span className="text-sm text-green-700">
                  Auto-imported from Epic ({new Date(autoImportedNote.importedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })})
                </span>
                <button
                  onClick={clearAutoImportedNote}
                  className="ml-auto text-xs text-green-600 hover:text-green-800 underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Loading indicator (non-Moonlit settings) */}
            {setting !== 'Moonlit Psychiatry' && checkingPriorNotes && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-blue-700">Checking for imported prior notes...</span>
              </div>
            )}

            {setting !== 'Moonlit Psychiatry' && !savedNote && !autoImportedNote && !checkingSavedNotes && !checkingPriorNotes && (
              <p className="text-xs text-[#5A6B7D] mb-2">
                Your last saved note will load automatically, or paste from Epic / use the clipboard watcher.
              </p>
            )}
            <textarea
              value={previousNote}
              onChange={(e) => {
                setPreviousNote(e.target.value);
                // Clear auto-import indicators if user manually edits
                if (savedNote) {
                  setSavedNote(null);
                }
                if (autoImportedNote) {
                  setAutoImportedNote(null);
                }
                if (intakeQNote) {
                  setIntakeQNote(null);
                }
              }}
              placeholder={setting === 'Moonlit Psychiatry'
                ? 'Your last saved note will load automatically, or paste manually here...'
                : 'Your last saved note will load automatically, or paste from Epic here...'}
              rows={10}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />
            {requiresPreviousNote && previousNote.trim().length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                {setting === 'Moonlit Psychiatry' ? 'Prior note' : 'Copied-forward note'} is required for {visitType}
              </p>
            )}
          </div>
        )}

        {/* Pre-visit questionnaires checkbox - Follow-up only */}
        {showPreviousNote && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={questionnairesCompleted}
                onChange={(e) => setQuestionnairesCompleted(e.target.checked)}
                className="rounded border-gray-300 text-[#E89C8A] focus:ring-[#E89C8A]"
              />
              <span className="text-sm text-[#5A6B7D]">
                Patient completed pre-visit questionnaires (PHQ-9/GAD-7)
              </span>
            </label>
          </div>
        )}

        {/* Epic Chart Data Input - Only for Intake/Consultation visits */}
        {showEpicChartInput && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Epic Chart Data <span className="text-[#5A6B7D] font-normal">(optional but recommended)</span>
            </label>
            <p className="text-xs text-[#5A6B7D] mb-2">
              Copy the raw Epic NoteWriter output or chart data. This helps extract current medications, PHQ-9/GAD-7 scores, and other clinical data.
            </p>
            <textarea
              value={epicChartData}
              onChange={(e) => setEpicChartData(e.target.value)}
              placeholder="Paste Epic chart data here (medications, PHQ-9, GAD-7, vitals, etc.)..."
              rows={6}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              disabled={isGenerating}
            />
            {epicChartData.trim().length > 0 && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Epic chart data provided ({epicChartData.length} characters)
              </p>
            )}
          </div>
        )}

        {/* Action Buttons (shown when ready to generate) */}
        {(!isSpanishTranscript || hasTranslated) && (
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviewPrompt}
              disabled={!canGenerate || loadingPreview}
              className="flex items-center gap-2 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={16} />
              {loadingPreview ? 'Loading...' : 'Preview Prompt'}
            </button>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} />
              {isGenerating ? 'Generating...' : 'Generate Note'}
            </button>
          </div>
        )}

        {!canGenerate && (!isSpanishTranscript || hasTranslated) && (
          <div className="mt-4 p-3 bg-[#FFF4E6] border border-[#FFA500]/30 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-[#FFA500] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#8B4513]">
              Please provide{' '}
              {!hasValidPatient && 'a patient (with first and last name)'}
              {!hasValidPatient && !transcript.trim() && ', '}
              {!transcript.trim() && 'a transcript'}
              {((!hasValidPatient || !transcript.trim()) && requiresPreviousNote && !previousNote.trim()) && ', and '}
              {requiresPreviousNote && !previousNote.trim() && 'a previous note'}{' '}
              to generate the clinical note.
            </p>
          </div>
        )}
      </div>

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#0A1F3D]">Prompt Preview</h3>
              <button
                onClick={() => setShowPromptPreview(false)}
                className="text-[#5A6B7D] hover:text-[#0A1F3D]"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
              {promptPreview}
            </pre>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && qrDataUrl && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0A1F3D]">HealthKit Pairing</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-[#5A6B7D] hover:text-[#0A1F3D]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Patient QR Code" width={256} height={256} />
              <p className="text-base font-medium text-[#0A1F3D]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-sm text-[#5A6B7D] text-center">
                Patient scans this with the Epic Scribe iOS app
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}