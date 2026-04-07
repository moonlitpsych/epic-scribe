'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, Check } from 'lucide-react';
import { Setting, SETTINGS, Template } from '@epic-scribe/types';
import { VISIT_TYPES_BY_SETTING as VISIT_TYPES } from '@/lib/flow/visit-types';
import PatientSelector from '../workflow/PatientSelector';
import AudioRecorder from '../workflow/AudioRecorder';
import NoteEditor from './encounter/NoteEditor';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  email?: string;
  intakeq_guid?: string;
}

interface QuickNoteModalProps {
  onClose: () => void;
}

type Step = 'setup' | 'transcript' | 'results';

export default function QuickNoteModal({ onClose }: QuickNoteModalProps) {
  const [step, setStep] = useState<Step>('setup');

  // Setup
  const [patient, setPatient] = useState<Patient | null>(null);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [visitType, setVisitType] = useState<string | undefined>(undefined);

  // Template
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Transcript
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [extractedEpicData, setExtractedEpicData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Save state
  const [saved, setSaved] = useState(false);

  // Load template when setting + visitType change
  useEffect(() => {
    if (!setting || !visitType) {
      setTemplate(null);
      return;
    }
    setLoadingTemplate(true);
    fetch(`/api/templates?setting=${encodeURIComponent(setting)}&visitType=${encodeURIComponent(visitType)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTemplate(data))
      .catch(() => {})
      .finally(() => setLoadingTemplate(false));
  }, [setting, visitType]);

  const visitTypes = setting ? VISIT_TYPES[setting] || [] : [];
  const canProceedToTranscript = !!patient && !!setting && !!visitType && !!template;
  const showPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';

  async function handleGenerate() {
    if (!transcript.trim() || !patient || !setting || !visitType) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting,
          visitType,
          transcript,
          priorNote: previousNote || undefined,
          patientId: patient.id,
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
      setStep('results');
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
        templateId,
        promptVersion: receipt.promptVersion,
        promptHash: receipt.promptHash,
        generatedContent: generatedNote,
        finalNoteContent: editedNote,
        isFinal: true,
        epicChartData: extractedEpicData || undefined,
        setting: setting || undefined,
        visitType: visitType || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to save note');
    }

    setSaved(true);
  }

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const steps: Step[] = ['setup', 'transcript', 'results'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick Note</h2>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i <= stepIndex
                    ? 'w-6 bg-[var(--accent-primary)]'
                    : 'w-1.5 bg-[var(--border-default)]'
                }`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <X size={18} />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 py-8 space-y-6">

          {/* Step 1: Setup */}
          {step === 'setup' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Patient
                </label>
                <PatientSelector
                  selectedPatient={patient}
                  onPatientSelect={setPatient as any}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Setting
                  </label>
                  <select
                    value={setting || ''}
                    onChange={(e) => {
                      const val = e.target.value as Setting;
                      setSetting(val);
                      setVisitType(undefined);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    <option value="">Select setting...</option>
                    {SETTINGS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Visit Type
                  </label>
                  <select
                    value={visitType || ''}
                    onChange={(e) => setVisitType(e.target.value)}
                    disabled={!setting}
                    className="w-full px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <option value="">Select visit type...</option>
                    {visitTypes.map((vt) => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingTemplate && (
                <div className="text-xs text-[var(--text-muted)]">Loading template...</div>
              )}

              <button
                onClick={() => setStep('transcript')}
                disabled={!canProceedToTranscript}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Step 2: Transcript + Generate */}
          {step === 'transcript' && (
            <>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{patient?.first_name} {patient?.last_name}</span>
                <span>·</span>
                <span>{setting}</span>
                <span>·</span>
                <span>{visitType}</span>
              </div>

              {/* Audio recorder */}
              <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-4">
                <AudioRecorder
                  onTranscriptReady={(text) => setTranscript((prev) => (prev ? `${prev}\n\n${text}` : text))}
                  disabled={isGenerating}
                  patientName={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
                  showInline
                />
              </div>

              {/* Transcript textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Transcript
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste or record transcript..."
                  disabled={isGenerating}
                  rows={10}
                  className="w-full px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-y font-mono"
                />
              </div>

              {/* Previous note (for TOC/Follow-up) */}
              {showPreviousNote && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Previous Note (optional)
                  </label>
                  <textarea
                    value={previousNote}
                    onChange={(e) => setPreviousNote(e.target.value)}
                    placeholder="Paste previous note for continuity..."
                    rows={6}
                    className="w-full px-3 py-2.5 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('setup')}
                  className="px-4 py-2.5 text-sm rounded-[2px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!transcript.trim() || isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={18} />
                  {isGenerating ? 'Generating...' : 'Generate Note'}
                </button>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-[var(--accent-primary)]">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                    Generating clinical note...
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <>
              {saved ? (
                <div className="py-12 text-center space-y-4">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)]">
                    <Check size={32} className="text-[var(--success-text)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Note Saved</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {patient?.first_name} {patient?.last_name} · {setting} · {visitType}
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{patient?.first_name} {patient?.last_name}</span>
                    <span>·</span>
                    <span>{setting}</span>
                    <span>·</span>
                    <span>{visitType}</span>
                  </div>

                  <NoteEditor
                    generatedNote={generatedNote}
                    editedNote={editedNote}
                    onEditedNoteChange={setEditedNote}
                    validationResult={validationResult}
                    setting={setting || ''}
                    visitType={visitType || ''}
                    patient={patient}
                    onSaveNote={handleSaveNote}
                    onRegenerate={() => {
                      setGeneratedNote('');
                      setEditedNote('');
                      setReceipt(null);
                      setValidationResult(null);
                      setExtractedEpicData(null);
                      setStep('transcript');
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
