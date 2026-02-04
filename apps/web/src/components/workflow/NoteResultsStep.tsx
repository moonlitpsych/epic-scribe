'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Template, Setting } from '@epic-scribe/types';
import { Copy, RefreshCw, RotateCcw, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle, Info, Save, UserPlus, Upload, Loader2 } from 'lucide-react';
import PatientSelector from './PatientSelector';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string;
  notes?: string;
  email?: string;
  intakeq_guid?: string;
}

interface NoteResultsStepProps {
  template: Template;
  generatedNote: string;
  editedNote: string;
  onEditedNoteChange: (note: string) => void;
  validationResult: ValidationResult | null;
  onRegenerate: () => void;
  onStartOver: () => void;
  onSaveNote?: () => Promise<void>;
  setting: Setting;
  visitType: string;
  selectedPatient?: Patient | null;
  onPatientSelect?: (patient: Patient) => void;
}

export default function NoteResultsStep({
  template,
  generatedNote,
  editedNote,
  onEditedNoteChange,
  validationResult,
  onRegenerate,
  onStartOver,
  onSaveNote,
  setting,
  visitType,
  selectedPatient,
  onPatientSelect,
}: NoteResultsStepProps) {
  const { data: session, status } = useSession();
  const [copySuccess, setCopySuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  // IntakeQ push state
  const [pushingToIntakeQ, setPushingToIntakeQ] = useState(false);
  const [intakeQPushSuccess, setIntakeQPushSuccess] = useState(false);
  const [intakeQPushError, setIntakeQPushError] = useState<string | null>(null);

  // Check if this is a Moonlit Psychiatry patient eligible for IntakeQ push
  const isMoonlitPatient = setting === 'Moonlit Psychiatry';
  // Can push if we have intakeq_guid (preferred) or email (fallback for first-time lookup)
  const canPushToIntakeQ = isMoonlitPatient && selectedPatient && (selectedPatient.intakeq_guid || selectedPatient.email);

  // Save note data to sessionStorage whenever it changes (auto-backup)
  useEffect(() => {
    if (editedNote) {
      const noteBackup = {
        editedNote,
        generatedNote,
        timestamp: new Date().toISOString(),
        setting,
        visitType,
      };
      sessionStorage.setItem('epic-scribe-note-backup', JSON.stringify(noteBackup));
      console.log('[NoteBackup] Auto-saved note to sessionStorage');
    }
  }, [editedNote, generatedNote, setting, visitType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedNote);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleSave = async () => {
    if (!onSaveNote) return;

    // Check authentication status
    if (status === 'unauthenticated') {
      setShowAuthWarning(true);
      return;
    }

    if (status === 'loading') {
      alert('Please wait while we verify your session...');
      return;
    }

    setSaving(true);
    try {
      await onSaveNote();
      setSaveSuccess(true);
      // Clear backup after successful save
      sessionStorage.removeItem('epic-scribe-note-backup');
      console.log('[NoteBackup] Cleared backup after successful save');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save note';

      // Check if it's an auth error
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        setShowAuthWarning(true);
      } else if (errorMessage.includes('Database schema') || errorMessage.includes('missing required columns')) {
        // Database migration needed
        alert(
          'Database Migration Required:\n\n' +
          'The database is missing required columns for saving notes.\n\n' +
          'Please run the following migration in your Supabase dashboard:\n' +
          'supabase/migrations/010_add_note_content_fields.sql\n\n' +
          'Your note has been automatically backed up and won\'t be lost.'
        );
      } else {
        alert(`Failed to save note: ${errorMessage}\n\nYour note is automatically backed up and won't be lost.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const hasModifications = editedNote !== generatedNote;

  const handlePushToIntakeQ = async () => {
    if (!selectedPatient || !editedNote) return;
    if (!selectedPatient.intakeq_guid && !selectedPatient.email) return;

    setPushingToIntakeQ(true);
    setIntakeQPushError(null);

    try {
      const response = await fetch('/api/intakeq/push-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          intakeqGuid: selectedPatient.intakeq_guid,
          patientEmail: selectedPatient.email,
          generatedNote: editedNote,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to push note to IntakeQ');
      }

      if (result.success) {
        setIntakeQPushSuccess(true);
        setTimeout(() => setIntakeQPushSuccess(false), 5000);
        console.log('[IntakeQ] Note pushed successfully:', result);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[IntakeQ] Push failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to push note';
      setIntakeQPushError(errorMessage);
    } finally {
      setPushingToIntakeQ(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Warning */}
      {showAuthWarning && (
        <div className="bg-[#FEF2F2] border-2 border-[#EF4444] rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-[#DC2626] flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#991B1B] mb-2">
                Sign In Required to Save Notes
              </h3>
              <p className="text-[#DC2626] mb-4">
                You must be signed in to save notes to your account. Don't worry—your note has been automatically
                backed up and won't be lost!
              </p>
              <div className="flex gap-3">
                <a
                  href="/api/auth/signin?callbackUrl=/workflow"
                  className="px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold"
                >
                  Sign In Now
                </a>
                <button
                  onClick={() => setShowAuthWarning(false)}
                  className="px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
                >
                  Continue Without Saving
                </button>
              </div>
              <p className="text-xs text-[#DC2626] mt-3">
                💾 Your note is auto-saved in your browser and will persist across page refreshes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* IntakeQ Push Error */}
      {intakeQPushError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                IntakeQ Push Failed
              </h3>
              <p className="text-red-700 mb-4">
                {intakeQPushError}
              </p>
              <button
                onClick={() => setIntakeQPushError(null)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Selection (if not selected) */}
      {!selectedPatient && onPatientSelect && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <UserPlus size={24} className="text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Select a Patient to Enable Saving
              </h3>
              <p className="text-amber-700 mb-4">
                To save this note and maintain patient history, please select or create a patient.
                Once selected, you'll be able to save this note and it will be automatically included
                in future visits for this patient.
              </p>
              <PatientSelector
                selectedPatient={selectedPatient}
                onPatientSelect={onPatientSelect}
                setting={setting}
                visitType={visitType}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-[#0A1F3D] mb-1">Generated Note</h2>
            <p className="text-sm text-[#5A6B7D]">
              {template.name} • {setting} • {visitType}
            </p>
            {hasModifications && (
              <p className="text-xs text-[#E89C8A] mt-1">
                ✓ Note has been modified
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onSaveNote && (
              <div className="relative group">
                <button
                  onClick={handleSave}
                  disabled={saving || status === 'loading'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                    status === 'unauthenticated'
                      ? 'bg-[#FFA500] text-white hover:bg-[#FF8C00]'
                      : 'bg-[#10B981] text-white hover:bg-[#059669]'
                  }`}
                  title={status === 'unauthenticated' ? 'Click to sign in and save' : 'Save note to database'}
                >
                  {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saving
                    ? 'Saving...'
                    : saveSuccess
                    ? 'Saved!'
                    : status === 'unauthenticated'
                    ? 'Sign In to Save'
                    : 'Save Note'}
                </button>
                {status === 'authenticated' && (
                  <span className="hidden group-hover:block absolute top-full left-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                    Signed in as {session?.user?.email}
                  </span>
                )}
              </div>
            )}

            {/* Push to IntakeQ button - only for Moonlit Psychiatry patients with email */}
            {isMoonlitPatient && (
              <div className="relative group">
                <button
                  onClick={handlePushToIntakeQ}
                  disabled={pushingToIntakeQ || !canPushToIntakeQ || intakeQPushSuccess}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                    intakeQPushSuccess
                      ? 'bg-[#10B981] text-white'
                      : intakeQPushError
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
                  }`}
                  title={
                    !canPushToIntakeQ
                      ? 'Patient email or IntakeQ link required'
                      : intakeQPushSuccess
                      ? 'Note pushed to IntakeQ'
                      : selectedPatient?.intakeq_guid
                      ? 'Push note to IntakeQ (linked)'
                      : 'Push note to IntakeQ (will link via email)'
                  }
                >
                  {pushingToIntakeQ ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : intakeQPushSuccess ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  {pushingToIntakeQ
                    ? 'Pushing...'
                    : intakeQPushSuccess
                    ? 'Pushed to IntakeQ!'
                    : 'Push to IntakeQ'}
                </button>
                {!canPushToIntakeQ && selectedPatient && (
                  <span className="hidden group-hover:block absolute top-full left-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                    Add patient email or IntakeQ link to enable push
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold"
            >
              {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copySuccess ? 'Copied!' : 'Copy Note'}
            </button>

            <button
              onClick={onRegenerate}
              className="flex items-center gap-2 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
            >
              <RefreshCw size={16} />
              Regenerate
            </button>

            <button
              onClick={onStartOver}
              className="flex items-center gap-2 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
            >
              <RotateCcw size={16} />
              Start Over
            </button>

            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              <ExternalLink size={14} />
              Edit Template
            </a>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {validationResult && (
        <div className="space-y-3">
          {validationResult.valid && (
            <div className="bg-[#ECFDF5] border border-[#10B981]/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#065F46]">All Validations Passed</p>
                <p className="text-sm text-[#047857] mt-1">
                  The note meets all structure and content requirements. Review for clinical accuracy before copying to Epic.
                </p>
              </div>
            </div>
          )}

          {Array.isArray(validationResult.errors) && validationResult.errors.length > 0 && (
            <div className="bg-[#FEF2F2] border border-[#EF4444]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#991B1B]">Structure Errors ({validationResult.errors.length})</p>
                  <ul className="text-sm text-[#DC2626] mt-2 space-y-1 list-disc list-inside">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {Array.isArray(validationResult.warnings) && validationResult.warnings.length > 0 && (
            <div className="bg-[#FFF4E6] border border-[#FFA500]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#FFA500] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#8B4513]">Warnings ({validationResult.warnings.length})</p>
                  <ul className="text-sm text-[#8B4513] mt-2 space-y-1 list-disc list-inside">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Instructions */}
      <div className="bg-[#E8F4FD] border border-[#3B82F6]/30 rounded-lg p-4 flex items-start gap-3">
        <Info size={18} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#1E40AF]">
          The note below is editable. Make any necessary changes before copying to Epic.
        </p>
      </div>

      {/* Side-by-Side View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template Used */}
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
          <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4 flex items-center gap-2">
            <span className="text-xs bg-[#E89C8A] text-white px-2 py-1 rounded">Reference</span>
            Template Used
          </h3>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {(template.sections || [])
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div
                  key={section.order}
                  className="border border-[#C5A882]/20 rounded-lg p-3 bg-[#F5F1ED]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#E89C8A] bg-white px-2 py-0.5 rounded">
                      {section.order}
                    </span>
                    <h4 className="text-sm font-semibold text-[#0A1F3D]">
                      {section.name}
                    </h4>
                  </div>
                  <pre className="text-xs font-mono bg-white p-2 rounded border border-[#C5A882]/20 whitespace-pre-wrap overflow-x-auto">
                    {section.content.substring(0, 200)}
                    {section.content.length > 200 && '...'}
                  </pre>
                </div>
              ))}
          </div>
        </div>

        {/* Right: Editable Note */}
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
          <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4 flex items-center gap-2">
            <span className="text-xs bg-[#E89C8A] text-white px-2 py-1 rounded">Editable</span>
            Generated Note
          </h3>

          <textarea
            value={editedNote}
            onChange={(e) => onEditedNoteChange(e.target.value)}
            className="w-full h-[800px] px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
            placeholder="Your generated note will appear here..."
          />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[#5A6B7D]">
              {editedNote.split(/\s+/).filter(Boolean).length} words
            </p>
            {hasModifications && (
              <button
                onClick={() => onEditedNoteChange(generatedNote)}
                className="text-xs text-[#E89C8A] hover:text-[#0A1F3D] transition-colors"
              >
                Reset to original
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
