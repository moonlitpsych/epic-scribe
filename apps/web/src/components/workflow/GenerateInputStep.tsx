'use client';

import { useState, useEffect } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { ChevronLeft, Sparkles, Eye, AlertCircle } from 'lucide-react';
import PatientSelector from './PatientSelector';
import EncountersList from './EncountersList';
import { CalendarEncounter } from '@/google-calendar';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string;
  notes?: string;
}

interface GenerateInputStepProps {
  setting: Setting;
  visitType: string;
  template: Template;
  onGenerate: (transcript: string, previousNote: string, patient: Patient | null, encounterId: string | null) => void;
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

  // Encounters state
  const [encounters, setEncounters] = useState<CalendarEncounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // Check if previous note is required
  const requiresPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const canGenerate = transcript.trim().length > 0 && (!requiresPreviousNote || previousNote.trim().length > 0);

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
        // Filter encounters for this patient
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
    // Note: transcript loading would happen here if we have transcript_file_id
  };

  const handleEncounterCreated = (data: any) => {
    // Refresh encounters list
    fetchPatientEncounters();

    // Set the new encounter as selected
    if (data.calendarEncounter) {
      setSelectedEncounterId(data.calendarEncounter.id);
      setEncounterId(data.calendarEncounter.id);
    }
  };

  const handlePreviewPrompt = async () => {
    setLoadingPreview(true);
    try {
      // Build a preview of what the prompt would look like
      // For now, we'll show a simplified preview
      const preview = `SYSTEM:
You are a HIPAA-compliant clinical documentation assistant for Dr. Rufus Sweeney.

TEMPLATE: ${template.name}
Setting: ${setting}
Visit Type: ${visitType}

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
      onGenerate(transcript, previousNote, selectedPatient, encounterId);
    }
  };

  const handleCreateEncounter = async (patient: Patient, startTime: Date, endTime: Date) => {
    // This will be handled by the PatientSelector component
    // which creates the encounter and updates the encounterId
    // We'll get the encounter ID from the response
  };

  return (
    <div className="space-y-6">
      {/* Template Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#5A6B7D]">Using template:</p>
            <p className="text-lg font-semibold text-[#0A1F3D]">{template.name}</p>
            <p className="text-sm text-[#5A6B7D]">
              {setting} • {visitType} • {template.sections.length} sections
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

      {/* Patient Selection */}
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
        <EncountersList
          encounters={encounters}
          selectedEncounterId={selectedEncounterId}
          onSelectEncounter={handleSelectEncounter}
          loading={loadingEncounters}
        />
      )}

      {/* Input Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-4">Input Clinical Data</h2>

        {/* Transcript Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
            Transcript <span className="text-red-500">*</span>
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste or type the clinical encounter transcript here..."
            rows={12}
            className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-[#5A6B7D]">
              {wordCount} words
            </p>
            {transcript.trim().length === 0 && (
              <p className="text-sm text-red-500">Transcript is required</p>
            )}
          </div>
        </div>

        {/* Previous Note Input (conditional) */}
        {requiresPreviousNote && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Previous Note <span className="text-red-500">*</span>
              <span className="text-xs text-[#5A6B7D] ml-2">(Required for {visitType})</span>
            </label>
            <textarea
              value={previousNote}
              onChange={(e) => setPreviousNote(e.target.value)}
              placeholder="Paste the previous clinical note here..."
              rows={8}
              className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />
            {previousNote.trim().length === 0 && (
              <p className="text-sm text-red-500 mt-2">Previous note is required for this visit type</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
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

        {!canGenerate && (
          <div className="mt-4 p-3 bg-[#FFF4E6] border border-[#FFA500]/30 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-[#FFA500] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#8B4513]">
              Please provide {!transcript.trim() && 'a transcript'}
              {!transcript.trim() && requiresPreviousNote && !previousNote.trim() && ' and '}
              {requiresPreviousNote && !previousNote.trim() && 'a previous note'} to generate the clinical note.
            </p>
          </div>
        )}
      </div>

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#C5A882]/20">
              <h3 className="text-xl font-semibold text-[#0A1F3D]">Prompt Preview</h3>
              <p className="text-sm text-[#5A6B7D] mt-1">
                This is a simplified preview of what will be sent to the AI
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-sm font-mono bg-[#F5F1ED] p-4 rounded border border-[#C5A882]/20 whitespace-pre-wrap">
                {promptPreview}
              </pre>
            </div>
            <div className="p-6 border-t border-[#C5A882]/20 flex justify-end">
              <button
                onClick={() => setShowPromptPreview(false)}
                className="px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#E89C8A] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
