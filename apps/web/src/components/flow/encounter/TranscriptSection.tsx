'use client';

import { useState, useEffect, useRef } from 'react';
import { Setting } from '@epic-scribe/types';
import { Globe, CheckCircle, CloudDownload, AlertCircle, FileText, Mail, Save } from 'lucide-react';
import AudioRecorder from '@/components/workflow/AudioRecorder';
import { useRecentTranscripts } from '@/hooks/useRecentTranscripts';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface TranscriptSectionProps {
  patient: Patient | null;
  setting?: string;
  visitType?: string;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  previousNote: string;
  onPreviousNoteChange: (text: string) => void;
  disabled?: boolean;
}

export default function TranscriptSection({
  patient,
  setting,
  visitType,
  transcript,
  onTranscriptChange,
  previousNote,
  onPreviousNoteChange,
  disabled,
}: TranscriptSectionProps) {
  // Translation
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);

  // Prior note sources
  const [savedNote, setSavedNote] = useState<{
    id: string;
    finalizedAt: string;
    setting: string;
    visitType: string;
    encounterDate: string;
  } | null>(null);
  const [checkingSavedNotes, setCheckingSavedNotes] = useState(false);
  const [autoImportedNote, setAutoImportedNote] = useState<{ id: string; importedAt: string } | null>(null);
  const [checkingPriorNotes, setCheckingPriorNotes] = useState(false);

  // IntakeQ
  const [intakeQEnabled, setIntakeQEnabled] = useState(true);
  const [intakeQNote, setIntakeQNote] = useState<{ content: string; date: string; noteName: string } | null>(null);
  const [intakeQLoading, setIntakeQLoading] = useState(false);
  const [intakeQError, setIntakeQError] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // HealthKit
  const [hasClinicalData, setHasClinicalData] = useState(false);

  // Phone transcripts
  const { transcripts: phoneTranscripts, markUsed } = useRecentTranscripts();

  const showPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';
  const requiresPreviousNote = showPreviousNote && !hasClinicalData;

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  const prevPatientIdRef = useRef(patient?.id || null);

  // Clear prior note state on patient change
  useEffect(() => {
    const currentId = patient?.id || null;
    if (currentId !== prevPatientIdRef.current) {
      onPreviousNoteChange('');
      setSavedNote(null);
      setAutoImportedNote(null);
      setIntakeQNote(null);
      setIntakeQError(null);
      prevPatientIdRef.current = currentId;
    }
  }, [patient?.id, onPreviousNoteChange]);

  // HealthKit check
  useEffect(() => {
    if (patient) {
      fetch(`/api/clinical-data/summary?patientId=${patient.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setHasClinicalData(data?.hasClinicalData ?? false))
        .catch(() => setHasClinicalData(false));
    }
  }, [patient]);

  // Saved note check (highest priority)
  useEffect(() => {
    if (patient && showPreviousNote && !previousNote) {
      checkForSavedNote();
    }
  }, [patient, showPreviousNote]);

  // Clipboard-imported fallback
  useEffect(() => {
    if (patient && showPreviousNote && !previousNote && !checkingSavedNotes && !savedNote) {
      checkForPriorNotes();
    }
  }, [patient, showPreviousNote, checkingSavedNotes, savedNote]);

  // IntakeQ
  useEffect(() => {
    if (savedNote) return;
    if (setting !== 'Moonlit Psychiatry') {
      setIntakeQNote(null);
      setIntakeQError(null);
      setShowEmailPrompt(false);
      return;
    }
    setIntakeQNote(null);
    setIntakeQError(null);
    setShowEmailPrompt(false);
    if (!patient?.email) {
      if (patient && showPreviousNote && intakeQEnabled) setShowEmailPrompt(true);
      return;
    }
    if (intakeQEnabled && showPreviousNote && patient.email) {
      fetchIntakeQPriorNote(patient.email);
    }
  }, [patient, setting, intakeQEnabled, showPreviousNote]);

  async function checkForSavedNote() {
    if (!patient) return;
    setCheckingSavedNotes(true);
    try {
      const res = await fetch(`/api/notes/most-recent?patientId=${patient.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          setSavedNote({
            id: data.note.id,
            finalizedAt: data.note.finalizedAt,
            setting: data.note.setting,
            visitType: data.note.visitType,
            encounterDate: data.note.encounterDate,
          });
          onPreviousNoteChange(data.note.finalNoteContent);
          setAutoImportedNote(null);
          setIntakeQNote(null);
        }
      }
    } catch (err) {
      console.error('Error checking saved notes:', err);
    } finally {
      setCheckingSavedNotes(false);
    }
  }

  async function checkForPriorNotes() {
    if (!patient) return;
    setCheckingPriorNotes(true);
    try {
      const res = await fetch(`/api/prior-notes/patient/${patient.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.priorNotes?.length > 0) {
          setAutoImportedNote({ id: data.priorNotes[0].id, importedAt: data.priorNotes[0].imported_at });
          onPreviousNoteChange(data.priorNotes[0].note_content);
        }
      }
    } catch (err) {
      console.error('Error checking prior notes:', err);
    } finally {
      setCheckingPriorNotes(false);
    }
  }

  async function fetchIntakeQPriorNote(email: string) {
    setIntakeQLoading(true);
    setIntakeQError(null);
    try {
      const res = await fetch(`/api/intakeq/prior-note?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.found) {
        setIntakeQNote({ content: data.priorNote, date: data.noteDate, noteName: data.noteName || 'IntakeQ Note' });
        onPreviousNoteChange(data.priorNote);
        setAutoImportedNote(null);
      } else {
        const msgs: Record<string, string> = {
          patient_not_found: 'Patient not found in IntakeQ. You can paste a note manually below.',
          no_notes: 'No prior notes found in IntakeQ. You can paste a note manually below.',
          not_configured: 'IntakeQ integration is not configured.',
        };
        setIntakeQError(msgs[data.reason] || data.message || 'Failed to fetch from IntakeQ.');
      }
    } catch {
      setIntakeQError('Failed to connect to IntakeQ. You can paste a note manually below.');
    } finally {
      setIntakeQLoading(false);
    }
  }

  async function handleTranslateInPlace() {
    if (!transcript.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript, sourceLanguage: 'Spanish', targetLanguage: 'English' }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      onTranscriptChange(data.translatedText);
      setHasTranslated(true);
    } catch {
      alert('Failed to translate transcript. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSavePatientEmail() {
    if (!patient || !pendingEmail.trim()) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail.trim() }),
      });
      if (res.ok) {
        setShowEmailPrompt(false);
        setPendingEmail('');
        fetchIntakeQPriorNote(pendingEmail.trim());
      }
    } catch {
      alert('Failed to save email.');
    } finally {
      setSavingEmail(false);
    }
  }

  function handlePhoneTranscriptSelect(t: { id: string; transcript: string; patient_id: string | null }) {
    onTranscriptChange(transcript ? transcript + '\n\n' + t.transcript : t.transcript);
    markUsed(t.id, patient?.id);
  }

  return (
    <div className="space-y-5">
      {/* Audio Recorder */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Record</h3>
        <AudioRecorder
          onTranscriptReady={(text) => onTranscriptChange(transcript ? transcript + '\n\n' + text : text)}
          disabled={disabled}
          patientName={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
        />
      </div>

      {/* Phone transcripts */}
      {phoneTranscripts.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Recent Recordings
          </h4>
          <div className="space-y-1.5">
            {phoneTranscripts.slice(0, 3).map((t) => (
              <button
                key={t.id}
                onClick={() => handlePhoneTranscriptSelect(t)}
                className="w-full text-left rounded border border-[var(--border-default)] bg-[var(--bg-surface-2)] px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="font-medium text-[var(--text-primary)]">{t.patient_name || 'Unknown'}</span>
                <span className="ml-2 text-[var(--text-muted)]">
                  {t.word_count ?? '?'} words · {new Date(t.recorded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcript textarea */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Transcript <span className="text-red-500">*</span>
        </label>
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Record above, or paste a transcript here..."
          rows={10}
          className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          disabled={disabled || isTranslating}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">{wordCount} words</span>
            {transcript.trim().length > 0 && !hasTranslated && !isTranslating && (
              <button
                onClick={handleTranslateInPlace}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1 text-sm text-[var(--info-text)] bg-[var(--info-bg)] border border-[var(--info-border)] rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              >
                <Globe size={14} />
                Translate to English
              </button>
            )}
            {isTranslating && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--info-text)]">
                <Globe size={14} className="animate-pulse" />
                Translating...
              </span>
            )}
            {hasTranslated && (
              <span className="flex items-center gap-1 text-xs text-[var(--success-text)]">
                <CheckCircle size={12} />
                Translated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prior Note (Follow-up / TOC only) */}
      {showPreviousNote && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {setting === 'Moonlit Psychiatry' ? 'Prior Note' : 'Copied-forward Last Note'}{' '}
            {requiresPreviousNote ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-[var(--text-secondary)] font-normal">(optional — Health Records synced)</span>
            )}
          </label>

          {/* IntakeQ (Moonlit only) */}
          {setting === 'Moonlit Psychiatry' && (
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={intakeQEnabled}
                  onChange={(e) => setIntakeQEnabled(e.target.checked)}
                  className="rounded border-[var(--border-default)] text-[var(--accent-warm)] focus:ring-[var(--accent-warm)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  <CloudDownload size={14} className="inline mr-1" />
                  Fetch from IntakeQ
                </span>
              </label>
              {intakeQLoading && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-[#13101f] border border-[#2a2050] rounded-[2px]">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#c084fc] border-t-transparent" />
                  <span className="text-sm text-[#c084fc]">Fetching prior note from IntakeQ...</span>
                </div>
              )}
              {intakeQNote && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-[#13101f] border border-[#2a2050] rounded-[2px]">
                  <CheckCircle className="text-[#c084fc] flex-shrink-0" size={16} />
                  <span className="text-sm text-[#c084fc]">
                    Loaded from IntakeQ: {intakeQNote.noteName} ({new Date(intakeQNote.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                  </span>
                  <button onClick={() => { setIntakeQNote(null); onPreviousNoteChange(''); }} className="ml-auto text-xs text-[#c084fc] hover:text-[#e9d5ff] underline">Clear</button>
                </div>
              )}
              {intakeQError && !intakeQLoading && (
                <div className="flex items-start gap-2 mb-2 p-2 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px]">
                  <AlertCircle className="text-[var(--warning-text)] flex-shrink-0 mt-0.5" size={16} />
                  <span className="text-sm text-[var(--warning-text)]">{intakeQError}</span>
                </div>
              )}
              {showEmailPrompt && intakeQEnabled && !intakeQNote && !intakeQLoading && (
                <div className="mb-2 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
                  <div className="flex items-start gap-2 mb-2">
                    <Mail className="text-[var(--info-text)] flex-shrink-0 mt-0.5" size={16} />
                    <span className="text-sm text-[var(--info-text)]">Add patient email to fetch prior notes from IntakeQ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={pendingEmail}
                      onChange={(e) => setPendingEmail(e.target.value)}
                      placeholder="patient@email.com"
                      className="flex-1 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      disabled={savingEmail}
                    />
                    <button
                      onClick={handleSavePatientEmail}
                      disabled={!pendingEmail.trim() || savingEmail}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--info-text)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[#4b8fdb] transition-colors disabled:opacity-50"
                    >
                      <Save size={14} />
                      {savingEmail ? 'Saving...' : 'Save & Fetch'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saved note indicator */}
          {savedNote && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
              <FileText className="text-[var(--info-text)] flex-shrink-0" size={16} />
              <span className="text-sm text-[var(--info-text)]">
                Last Patient Note
                {savedNote.encounterDate && (
                  <> ({new Date(savedNote.encounterDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</>
                )}
              </span>
              <button onClick={() => { setSavedNote(null); onPreviousNoteChange(''); }} className="ml-auto text-xs text-[var(--info-text)] hover:text-[var(--text-primary)] underline">Clear</button>
            </div>
          )}

          {checkingSavedNotes && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--info-text)] border-t-transparent" />
              <span className="text-sm text-[var(--info-text)]">Checking for saved notes...</span>
            </div>
          )}

          {setting !== 'Moonlit Psychiatry' && autoImportedNote && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[2px]">
              <CheckCircle className="text-[var(--success-text)] flex-shrink-0" size={16} />
              <span className="text-sm text-[var(--success-text)]">
                Auto-imported from Epic ({new Date(autoImportedNote.importedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })})
              </span>
              <button onClick={() => { setAutoImportedNote(null); onPreviousNoteChange(''); }} className="ml-auto text-xs text-[var(--success-text)] hover:text-[var(--text-primary)] underline">Clear</button>
            </div>
          )}

          {setting !== 'Moonlit Psychiatry' && checkingPriorNotes && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--info-text)] border-t-transparent" />
              <span className="text-sm text-[var(--info-text)]">Checking for imported prior notes...</span>
            </div>
          )}

          <textarea
            value={previousNote}
            onChange={(e) => {
              onPreviousNoteChange(e.target.value);
              if (savedNote) setSavedNote(null);
              if (autoImportedNote) setAutoImportedNote(null);
              if (intakeQNote) setIntakeQNote(null);
            }}
            placeholder={setting === 'Moonlit Psychiatry'
              ? 'Your last saved note will load automatically, or paste manually here...'
              : 'Your last saved note will load automatically, or paste from Epic here...'}
            rows={8}
            className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          {requiresPreviousNote && previousNote.trim().length === 0 && (
            <p className="text-sm text-red-500 mt-2">
              {setting === 'Moonlit Psychiatry' ? 'Prior note' : 'Copied-forward note'} is required for {visitType}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
