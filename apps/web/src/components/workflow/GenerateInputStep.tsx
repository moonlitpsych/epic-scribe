// apps/web/src/components/workflow/GenerateInputStep.tsx
'use client';

import { useState, useEffect } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { ChevronLeft, Sparkles, Eye, AlertCircle, Globe, Languages, CheckCircle } from 'lucide-react';
import PatientSelector from './PatientSelector';
import EncountersList from './EncountersList';
import ManualNotePanel from './ManualNotePanel';
import { CalendarEncounter } from '@/google-calendar';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string;
  notes?: string;
}

interface GenerateInputStepProps {
  setting: Setting;
  visitType: string;
  template: Template;
  onGenerate: (transcript: string, previousNote: string, patient: Patient | null, encounterId: string | null, epicChartData?: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  initialTranscript?: string;
  initialPreviousNote?: string;
  selectedPatient?: Patient | null;
  encounterId?: string | null;
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

  // Epic chart data - only needed for Intake/Consultation (no copied-forward note)
  const [epicChartData, setEpicChartData] = useState('');
  const showEpicChartInput = visitType === 'Intake' || visitType === 'Consultation Visit';

  // Check if previous note is required
  const requiresPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';

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
      onGenerate(transcript, previousNote, selectedPatient, encounterId, epicChartData || undefined);
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
      </div>

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

        {/* English Transcript Input (when in English mode or after translation) */}
        {(!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              {hasTranslated ? 'Translated English Transcript' : 'Transcript'}
              <span className="text-red-500"> *</span>
              {hasTranslated && (
                <span className="ml-2 text-green-600 text-xs">✓ Translated from Spanish</span>
              )}
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste or type the clinical encounter transcript here..."
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
        {requiresPreviousNote && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Copied-forward Last Note <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-[#5A6B7D] mb-2">
              Paste the copied-forward note from Epic. SmartLinks will already contain up-to-date chart data.
            </p>
            <textarea
              value={previousNote}
              onChange={(e) => setPreviousNote(e.target.value)}
              placeholder="Paste the copied-forward last note from Epic here (includes current chart data via SmartLinks)..."
              rows={10}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />
            {previousNote.trim().length === 0 && (
              <p className="text-sm text-red-500 mt-2">Copied-forward note is required for {visitType}</p>
            )}
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
    </div>
  );
}