'use client';

import { useState, useEffect } from 'react';
import { Template, Setting, EpicChartData, PromptReceipt } from '@epic-scribe/types';
import { Sparkles, AlertCircle } from 'lucide-react';
import type { TodayEncounter } from '@/lib/flow/types';
import TranscriptSection from './TranscriptSection';
import NoteEditor from './NoteEditor';

interface ExistingNote {
  id: string;
  encounter_id: string;
  template_id: string;
  prompt_version: string;
  prompt_hash: string;
  generated_content: string;
  final_note_content?: string;
  is_final: boolean;
  epic_chart_data?: any;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  intakeq_guid?: string;
}

interface NoteTabProps {
  encounter: TodayEncounter;
  existingNote: ExistingNote | null;
  onNoteSaved: () => void;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function NoteTab({ encounter, existingNote, onNoteSaved }: NoteTabProps) {
  // Template
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Patient data (loaded separately for email/intakeq_guid fields)
  const [patient, setPatient] = useState<Patient | null>(null);

  // Transcript + prior note
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [receipt, setReceipt] = useState<PromptReceipt | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [extractedEpicData, setExtractedEpicData] = useState<EpicChartData | null>(null);

  // If there's an existing note, pre-populate
  const hasNote = !!existingNote || !!generatedNote;

  // Load template on mount
  useEffect(() => {
    if (encounter.setting && encounter.visitType) {
      loadTemplate(encounter.setting, encounter.visitType);
    }
  }, [encounter.setting, encounter.visitType]);

  // Load patient details
  useEffect(() => {
    if (encounter.patientId) {
      fetch(`/api/patients/${encounter.patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.patient) setPatient(data.patient);
          else if (data) setPatient(data);
        })
        .catch(() => {});
    }
  }, [encounter.patientId]);

  // Pre-populate from existing note
  useEffect(() => {
    if (existingNote) {
      setGeneratedNote(existingNote.generated_content);
      setEditedNote(existingNote.final_note_content || existingNote.generated_content);
      if (existingNote.epic_chart_data) {
        setExtractedEpicData(existingNote.epic_chart_data);
      }
    }
  }, [existingNote]);

  async function loadTemplate(setting: string, visitType: string) {
    setLoadingTemplate(true);
    try {
      const res = await fetch(`/api/templates?setting=${encodeURIComponent(setting)}&visitType=${encodeURIComponent(visitType)}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
      }
    } catch (err) {
      console.error('Error loading template:', err);
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleGenerate() {
    if (!transcript.trim()) return;
    setIsGenerating(true);

    // Fire-and-forget: extract actions in parallel with note generation
    if (encounter.id) {
      fetch('/api/actions/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: encounter.id,
          transcript,
          patientId: encounter.patientId,
          visitType: encounter.visitType,
          payerName: encounter.payerName,
        }),
      }).catch(err => console.warn('[NoteTab] Action extraction failed (non-fatal):', err));
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting: encounter.setting,
          visitType: encounter.visitType,
          transcript,
          priorNote: previousNote || undefined,
          patientId: encounter.patientId,
          encounterId: encounter.id,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      setGeneratedNote(data.note);
      setEditedNote(data.note);
      setReceipt(data.receipt);
      setValidationResult(data.receipt?.validationResult || null);
      if (data.receipt?.epicChartData) {
        setExtractedEpicData(data.receipt.epicChartData);
      }
    } catch (err) {
      console.error('Error generating note:', err);
      alert('Failed to generate note. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveNote() {
    if (!template || !receipt || !patient) {
      throw new Error('Missing required data to save note');
    }

    const templateId = (template as any).template_id || (template as any).templateId;
    if (!templateId) throw new Error('Template ID is missing');

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        encounterId: encounter.id,
        templateId,
        promptVersion: receipt.promptVersion,
        promptHash: receipt.promptHash,
        generatedContent: generatedNote,
        finalNoteContent: editedNote,
        isFinal: true,
        epicChartData: extractedEpicData || undefined,
        setting: encounter.setting || undefined,
        visitType: encounter.visitType || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to save note');
    }

    onNoteSaved();
  }

  // Validation for generate button
  const hasClinicalData = false; // will be set by TranscriptSection internally
  const showPreviousNote = encounter.visitType === 'Transfer of Care' || encounter.visitType === 'Follow-up';
  const requiresPreviousNote = showPreviousNote && !hasClinicalData;
  const canGenerate =
    transcript.trim().length > 0 &&
    (!requiresPreviousNote || previousNote.trim().length > 0) &&
    !!template &&
    !isGenerating;

  return (
    <div className="space-y-5">
      {/* Template loading indicator */}
      {loadingTemplate && (
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
          Loading template...
        </div>
      )}

      {/* If no generated note yet, show transcript input + generate button */}
      {!hasNote && (
        <>
          <TranscriptSection
            patient={patient}
            setting={encounter.setting}
            visitType={encounter.visitType}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            previousNote={previousNote}
            onPreviousNoteChange={setPreviousNote}
            disabled={isGenerating}
          />

          {/* Generate button */}
          <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={20} />
                {isGenerating ? 'Generating...' : 'Generate Note'}
              </button>

              {!canGenerate && transcript.trim().length === 0 && (
                <span className="text-sm text-[var(--text-muted)]">Add a transcript to generate</span>
              )}
              {!canGenerate && transcript.trim().length > 0 && !template && (
                <span className="text-sm text-[var(--warning-text)]">Template not loaded</span>
              )}
            </div>

            {isGenerating && (
              <div className="mt-4 flex items-center gap-3 text-[var(--accent-primary)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                <span className="text-sm">Generating clinical note...</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* If note exists, show editor */}
      {hasNote && (
        <>
          <NoteEditor
            generatedNote={generatedNote}
            editedNote={editedNote}
            onEditedNoteChange={setEditedNote}
            validationResult={validationResult}
            setting={encounter.setting || ''}
            visitType={encounter.visitType || ''}
            patient={patient}
            onSaveNote={handleSaveNote}
            onRegenerate={() => {
              setGeneratedNote('');
              setEditedNote('');
              setReceipt(null);
              setValidationResult(null);
              setExtractedEpicData(null);
            }}
          />

          {/* Transcript collapse — show transcript below editor for reference */}
          <details className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)]">
            <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Transcript ({transcript.trim().split(/\s+/).filter(Boolean).length} words)
            </summary>
            <div className="px-5 pb-4">
              <TranscriptSection
                patient={patient}
                setting={encounter.setting}
                visitType={encounter.visitType}
                transcript={transcript}
                onTranscriptChange={setTranscript}
                previousNote={previousNote}
                onPreviousNoteChange={setPreviousNote}
                disabled={false}
              />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
