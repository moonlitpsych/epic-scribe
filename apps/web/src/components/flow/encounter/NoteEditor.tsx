'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Setting } from '@epic-scribe/types';
import { Copy, RefreshCw, Save, CheckCircle2, AlertCircle, AlertTriangle, Info, Upload, Loader2 } from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  intakeq_guid?: string;
}

interface NoteEditorProps {
  generatedNote: string;
  editedNote: string;
  onEditedNoteChange: (note: string) => void;
  validationResult: ValidationResult | null;
  setting: string;
  visitType: string;
  patient: Patient | null;
  onSaveNote: () => Promise<void>;
  onRegenerate: () => void;
}

export default function NoteEditor({
  generatedNote,
  editedNote,
  onEditedNoteChange,
  validationResult,
  setting,
  visitType,
  patient,
  onSaveNote,
  onRegenerate,
}: NoteEditorProps) {
  const { status } = useSession();
  const [copySuccess, setCopySuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // IntakeQ push
  const [pushingToIntakeQ, setPushingToIntakeQ] = useState(false);
  const [intakeQPushSuccess, setIntakeQPushSuccess] = useState(false);
  const [intakeQPushError, setIntakeQPushError] = useState<string | null>(null);

  const isMoonlitPatient = setting === 'Moonlit Psychiatry';
  const canPushToIntakeQ = isMoonlitPatient && patient && (patient.intakeq_guid || patient.email);
  const hasModifications = editedNote !== generatedNote;

  // Auto-backup to sessionStorage
  useEffect(() => {
    if (editedNote) {
      sessionStorage.setItem(
        'epic-scribe-note-backup',
        JSON.stringify({ editedNote, generatedNote, timestamp: new Date().toISOString(), setting, visitType })
      );
    }
  }, [editedNote, generatedNote, setting, visitType]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editedNote);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveNote();
      setSaveSuccess(true);
      sessionStorage.removeItem('epic-scribe-note-backup');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save note';
      alert(`Failed to save note: ${msg}\n\nYour note is automatically backed up.`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePushToIntakeQ() {
    if (!patient || !editedNote) return;
    setPushingToIntakeQ(true);
    setIntakeQPushError(null);
    try {
      const res = await fetch('/api/intakeq/push-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          intakeqGuid: patient.intakeq_guid,
          patientEmail: patient.email,
          generatedNote: editedNote,
          visitType,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to push note');
      setIntakeQPushSuccess(true);
      setTimeout(() => setIntakeQPushSuccess(false), 5000);
    } catch (err) {
      setIntakeQPushError(err instanceof Error ? err.message : 'Failed to push note');
    } finally {
      setPushingToIntakeQ(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Validation alerts */}
      {validationResult && (
        <div className="space-y-2">
          {validationResult.valid && (
            <div className="bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[2px] p-3 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[var(--success-text)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--success-text)]">All validations passed. Review for clinical accuracy.</p>
            </div>
          )}
          {validationResult.errors?.length > 0 && (
            <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[var(--error-text)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--error-text)]">Structure Errors ({validationResult.errors.length})</p>
                  <ul className="text-sm text-[var(--error-text)] mt-1 list-disc list-inside">
                    {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {validationResult.warnings?.length > 0 && (
            <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-[var(--warning-text)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--warning-text)]">Warnings ({validationResult.warnings.length})</p>
                  <ul className="text-sm text-[var(--warning-text)] mt-1 list-disc list-inside">
                    {validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IntakeQ push error */}
      {intakeQPushError && (
        <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-[var(--error-text)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-[var(--error-text)]">{intakeQPushError}</p>
          </div>
          <button onClick={() => setIntakeQPushError(null)} className="text-xs text-[var(--error-text)] underline">Dismiss</button>
        </div>
      )}

      {/* Note edit info */}
      <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px] p-3 flex items-start gap-2">
        <Info size={16} className="text-[var(--info-text)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--info-text)]">
          The note below is editable. Make any necessary changes before saving.
        </p>
      </div>

      {/* Editable note */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <textarea
          value={editedNote}
          onChange={(e) => onEditedNoteChange(e.target.value)}
          className="w-full h-[600px] px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm resize-none bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">
            {editedNote.split(/\s+/).filter(Boolean).length} words
          </span>
          {hasModifications && (
            <button
              onClick={() => onEditedNoteChange(generatedNote)}
              className="text-xs text-[var(--accent-warm)] hover:text-[var(--text-primary)] transition-colors"
            >
              Reset to original
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !patient}
          className={`flex items-center gap-2 px-4 py-2 rounded-[2px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            saveSuccess
              ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]'
              : 'bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)]'
          }`}
        >
          {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Note'}
        </button>

        {isMoonlitPatient && (
          <button
            onClick={handlePushToIntakeQ}
            disabled={pushingToIntakeQ || !canPushToIntakeQ || intakeQPushSuccess}
            className={`flex items-center gap-2 px-4 py-2 rounded-[2px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              intakeQPushSuccess
                ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)]'
                : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
            }`}
          >
            {pushingToIntakeQ ? <Loader2 size={16} className="animate-spin" /> : intakeQPushSuccess ? <CheckCircle2 size={16} /> : <Upload size={16} />}
            {pushingToIntakeQ ? 'Pushing...' : intakeQPushSuccess ? 'Pushed!' : 'Push to IntakeQ'}
          </button>
        )}

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-semibold"
        >
          {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copySuccess ? 'Copied!' : 'Copy Note'}
        </button>

        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] rounded-[2px] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw size={16} />
          Regenerate
        </button>
      </div>
    </div>
  );
}
