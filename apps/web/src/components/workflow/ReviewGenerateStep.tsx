'use client';

import { useState, useEffect, useRef } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { ChevronLeft, Sparkles, Eye, AlertCircle, Globe, Languages, CheckCircle, CloudDownload, Mail, Save, Link2, FileText } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import TranscriptSelector from './TranscriptSelector';

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

interface ReviewGenerateStepProps {
  setting: Setting;
  visitType: string;
  template: Template;
  patient: Patient;
  encounterId: string | null;
  initialTranscript: string;
  companionPriorNote?: string | null;
  onGenerate: (transcript: string, previousNote: string, patient: Patient, encounterId: string | null, epicChartData?: string, questionnairesCompleted?: boolean) => void;
  onBack: () => void;
  isGenerating: boolean;
}

export default function ReviewGenerateStep({
  setting,
  visitType,
  template,
  patient,
  encounterId,
  initialTranscript,
  companionPriorNote,
  onGenerate,
  onBack,
  isGenerating,
}: ReviewGenerateStepProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [previousNote, setPreviousNote] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [promptPreview, setPromptPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Translation
  const [isSpanishTranscript, setIsSpanishTranscript] = useState(false);
  const [spanishTranscript, setSpanishTranscript] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);

  // Saved note (highest priority prior note source)
  const [savedNote, setSavedNote] = useState<{
    id: string;
    finalizedAt: string;
    setting: string;
    visitType: string;
    encounterDate: string;
  } | null>(null);
  const [checkingSavedNotes, setCheckingSavedNotes] = useState(false);

  // Clipboard-imported prior note
  const [autoImportedNote, setAutoImportedNote] = useState<{
    id: string;
    importedAt: string;
  } | null>(null);
  const [checkingPriorNotes, setCheckingPriorNotes] = useState(false);

  // IntakeQ
  const [intakeQEnabled, setIntakeQEnabled] = useState(true);
  const [intakeQNote, setIntakeQNote] = useState<{ content: string; date: string; noteName: string } | null>(null);
  const [intakeQLoading, setIntakeQLoading] = useState(false);
  const [intakeQError, setIntakeQError] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Companion sync
  const [companionSynced, setCompanionSynced] = useState(false);

  // HealthKit
  const [clinicalDataSummary, setClinicalDataSummary] = useState<{
    hasClinicalData: boolean;
    lastSyncedAt: string | null;
    counts: Record<string, number>;
  } | null>(null);

  // Questionnaires + Epic chart data
  const [questionnairesCompleted, setQuestionnairesCompleted] = useState(false);
  const [epicChartData, setEpicChartData] = useState('');
  const showEpicChartInput = visitType === 'Intake' || visitType === 'Consultation Visit';

  // Prior note section visibility
  const hasClinicalData = clinicalDataSummary?.hasClinicalData ?? false;
  const showPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';
  const requiresPreviousNote = showPreviousNote && !hasClinicalData;

  // Word count
  const activeTranscript = isSpanishTranscript ? spanishTranscript : transcript;
  const wordCount = activeTranscript.trim().split(/\s+/).filter(Boolean).length;

  // Validation
  const canTranslate = isSpanishTranscript && spanishTranscript.trim().length > 0 && !hasTranslated;
  const hasValidPatient = patient && patient.first_name && patient.last_name;
  const canGenerate = transcript.trim().length > 0 &&
    (!requiresPreviousNote || previousNote.trim().length > 0) &&
    (!isSpanishTranscript || hasTranslated) &&
    hasValidPatient;

  // Track patient ID changes
  const prevPatientIdRef = useRef(patient?.id || null);

  // Clear prior note state when patient changes
  useEffect(() => {
    const currentId = patient?.id || null;
    const prevId = prevPatientIdRef.current;
    if (currentId !== prevId) {
      setPreviousNote('');
      setSavedNote(null);
      setAutoImportedNote(null);
      setIntakeQNote(null);
      setIntakeQError(null);
      setCompanionSynced(false);
      prevPatientIdRef.current = currentId;
    }
  }, [patient?.id]);

  // ─── HealthKit check ───
  useEffect(() => {
    if (patient) {
      fetch(`/api/clinical-data/summary?patientId=${patient.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.hasClinicalData) setClinicalDataSummary(data);
          else setClinicalDataSummary(null);
        })
        .catch(() => setClinicalDataSummary(null));
    }
  }, [patient]);

  // ─── Saved note check (highest priority) ───
  useEffect(() => {
    if (patient && showPreviousNote && !previousNote) {
      checkForSavedNote();
    }
  }, [patient, showPreviousNote]);

  // ─── Clipboard-imported fallback ───
  useEffect(() => {
    if (patient && showPreviousNote && !previousNote && !checkingSavedNotes && !savedNote) {
      checkForPriorNotes();
    }
  }, [patient, showPreviousNote, checkingSavedNotes, savedNote]);

  const checkForSavedNote = async () => {
    if (!patient) return;
    setCheckingSavedNotes(true);
    try {
      const response = await fetch(`/api/notes/most-recent?patientId=${patient.id}`);
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
    if (!patient) return;
    setCheckingPriorNotes(true);
    try {
      const response = await fetch(`/api/prior-notes/patient/${patient.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.priorNotes && data.priorNotes.length > 0) {
          const latestNote = data.priorNotes[0];
          setAutoImportedNote({ id: latestNote.id, importedAt: latestNote.imported_at });
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

  // ─── IntakeQ prior note ───
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

  // ─── Companion sync ───
  useEffect(() => {
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
        setIntakeQNote({ content: data.priorNote, date: data.noteDate, noteName: data.noteName || 'IntakeQ Note' });
        setPreviousNote(data.priorNote);
        setAutoImportedNote(null);
      } else {
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
    if (!patient || !pendingEmail.trim()) return;
    setSavingEmail(true);
    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail.trim() }),
      });
      if (response.ok) {
        setShowEmailPrompt(false);
        setPendingEmail('');
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

  // ─── Translation ───
  const handleTranslate = async () => {
    if (!canTranslate) return;
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spanishTranscript, sourceLanguage: 'Spanish', targetLanguage: 'English' }),
      });
      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      setTranscript(data.translatedText);
      setHasTranslated(true);
    } catch (error) {
      console.error('Error translating transcript:', error);
      alert('Failed to translate transcript. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageToggle = () => {
    if (hasTranslated) {
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
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(transcript, previousNote, patient, encounterId, epicChartData || undefined, questionnairesCompleted || undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Compact Summary Header ─── */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {patient.first_name} {patient.last_name}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {setting} &middot; {visitType} &middot; {template.sections?.length || 0} sections
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Setup
          </button>
        </div>
      </div>

      {/* ─── Transcript Section ─── */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading text-[var(--text-primary)]">Transcript</h2>
          <button
            onClick={handleLanguageToggle}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-[2px] transition-all ${
              isSpanishTranscript
                ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)]'
                : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Languages size={16} />
            {isSpanishTranscript ? 'Spanish' : 'English'}
          </button>
        </div>

        {isSpanishTranscript && (
          <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px] p-4 mb-4">
            <div className="flex items-start gap-2">
              <Globe className="text-[var(--info-text)] mt-1" size={20} />
              <div>
                <p className="text-sm font-semibold text-[var(--info-text)]">Translation Workflow</p>
                <p className="text-sm text-[var(--info-text)] mt-1">
                  1. Paste your Spanish transcript<br />
                  2. Click &quot;Translate to English&quot;<br />
                  3. Review and proceed
                </p>
                {hasTranslated && (
                  <div className="flex items-center gap-2 mt-2 text-[var(--success-text)]">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Translation completed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spanish input */}
        {isSpanishTranscript && !hasTranslated && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Spanish Transcript <span className="text-red-500">*</span>
            </label>
            <textarea
              value={spanishTranscript}
              onChange={(e) => setSpanishTranscript(e.target.value)}
              placeholder="Pegue aqui la transcripcion en espanol..."
              rows={12}
              className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              disabled={isTranslating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-[var(--text-secondary)]">{wordCount} palabras</p>
            </div>
            <button
              onClick={handleTranslate}
              disabled={!canTranslate || isTranslating}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-[var(--info-text)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[#4b8fdb] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Globe size={20} />
              {isTranslating ? 'Translating...' : 'Translate to English'}
            </button>
          </div>
        )}

        {/* Google Drive Transcript Selector */}
        {!isSpanishTranscript && (
          <div className="mb-6">
            <TranscriptSelector
              encounterId={encounterId}
              patientName={`${patient.last_name}, ${patient.first_name}`}
              onTranscriptLoaded={(content) => setTranscript(content)}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Audio recorder — compact re-record option */}
        {!isSpanishTranscript && (
          <AudioRecorder
            onTranscriptReady={(text) => setTranscript(text)}
            disabled={isGenerating}
            patientName={`${patient.first_name} ${patient.last_name}`}
          />
        )}

        {/* English transcript textarea */}
        {(!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {hasTranslated ? 'Translated English Transcript' : 'Transcript'}
              <span className="text-red-500"> *</span>
              {hasTranslated && (
                <span className="ml-2 text-[var(--success-text)] text-xs">Translated from Spanish</span>
              )}
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Record with Whisper above, or paste a transcript here..."
              rows={12}
              className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-[var(--text-secondary)]">
                {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </p>
              {transcript.trim().length === 0 && (
                <p className="text-sm text-red-500">Transcript is required</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Prior Note cascade (Follow-up/TOC only) ─── */}
        {showPreviousNote && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
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
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
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
                </div>
                {intakeQLoading && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-[#13101f] border border-[#2a2050] rounded-[2px]">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#c084fc] border-t-transparent"></div>
                    <span className="text-sm text-[#c084fc]">Fetching prior note from IntakeQ...</span>
                  </div>
                )}
                {intakeQNote && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-[#13101f] border border-[#2a2050] rounded-[2px]">
                    <CheckCircle className="text-[#c084fc] flex-shrink-0" size={16} />
                    <span className="text-sm text-[#c084fc]">
                      Loaded from IntakeQ: {intakeQNote.noteName} ({new Date(intakeQNote.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                    </span>
                    <button onClick={clearIntakeQNote} className="ml-auto text-xs text-[#c084fc] hover:text-[#e9d5ff] underline">Clear</button>
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
                      <span className="text-sm text-[var(--info-text)]">
                        Add patient email to fetch prior notes from IntakeQ
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={pendingEmail}
                        onChange={(e) => setPendingEmail(e.target.value)}
                        placeholder="patient@email.com"
                        className="flex-1 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        disabled={savingEmail}
                      />
                      <button
                        onClick={handleSavePatientEmail}
                        disabled={!pendingEmail.trim() || savingEmail}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--info-text)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[#4b8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={14} />
                        {savingEmail ? 'Saving...' : 'Save & Fetch'}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--info-text)] mt-1">Or skip and paste a note manually below.</p>
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
                  {savedNote.setting && savedNote.visitType && (
                    <span className="text-[var(--info-text)]"> &mdash; {savedNote.setting}, {savedNote.visitType}</span>
                  )}
                </span>
                <button onClick={clearSavedNote} className="ml-auto text-xs text-[var(--info-text)] hover:text-[var(--text-primary)] underline">Clear</button>
              </div>
            )}

            {/* Loading saved notes */}
            {checkingSavedNotes && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--info-text)] border-t-transparent"></div>
                <span className="text-sm text-[var(--info-text)]">Checking for saved notes...</span>
              </div>
            )}

            {/* Companion sync indicator */}
            {companionSynced && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-[#13101f] border border-[#2a2050] rounded-[2px]">
                <Link2 className="text-[#a78bfa] flex-shrink-0" size={16} />
                <span className="text-sm text-[#a78bfa]">Synced from Companion Portal</span>
                <button
                  onClick={() => { setCompanionSynced(false); setPreviousNote(''); }}
                  className="ml-auto text-xs text-[#a78bfa] hover:text-[#e9d5ff] underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Auto-imported note (non-Moonlit) */}
            {setting !== 'Moonlit Psychiatry' && autoImportedNote && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[2px]">
                <CheckCircle className="text-[var(--success-text)] flex-shrink-0" size={16} />
                <span className="text-sm text-[var(--success-text)]">
                  Auto-imported from Epic ({new Date(autoImportedNote.importedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })})
                </span>
                <button onClick={clearAutoImportedNote} className="ml-auto text-xs text-[var(--success-text)] hover:text-[var(--text-primary)] underline">Clear</button>
              </div>
            )}

            {/* Loading prior notes (non-Moonlit) */}
            {setting !== 'Moonlit Psychiatry' && checkingPriorNotes && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--info-text)] border-t-transparent"></div>
                <span className="text-sm text-[var(--info-text)]">Checking for imported prior notes...</span>
              </div>
            )}

            {setting !== 'Moonlit Psychiatry' && !savedNote && !autoImportedNote && !checkingSavedNotes && !checkingPriorNotes && (
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Your last saved note will load automatically, or paste from Epic / use the clipboard watcher.
              </p>
            )}

            <textarea
              value={previousNote}
              onChange={(e) => {
                setPreviousNote(e.target.value);
                if (savedNote) setSavedNote(null);
                if (autoImportedNote) setAutoImportedNote(null);
                if (intakeQNote) setIntakeQNote(null);
              }}
              placeholder={setting === 'Moonlit Psychiatry'
                ? 'Your last saved note will load automatically, or paste manually here...'
                : 'Your last saved note will load automatically, or paste from Epic here...'
              }
              rows={10}
              className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {requiresPreviousNote && previousNote.trim().length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                {setting === 'Moonlit Psychiatry' ? 'Prior note' : 'Copied-forward note'} is required for {visitType}
              </p>
            )}
          </div>
        )}

        {/* Questionnaires checkbox */}
        {showPreviousNote && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={questionnairesCompleted}
                onChange={(e) => setQuestionnairesCompleted(e.target.checked)}
                className="rounded border-[var(--border-default)] text-[var(--accent-warm)] focus:ring-[var(--accent-warm)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Patient completed pre-visit questionnaires (PHQ-9/GAD-7)
              </span>
            </label>
          </div>
        )}

        {/* Epic Chart Data (Intake/Consultation) */}
        {showEpicChartInput && (!isSpanishTranscript || hasTranslated) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Epic Chart Data <span className="text-[var(--text-secondary)] font-normal">(optional but recommended)</span>
            </label>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Copy the raw Epic NoteWriter output or chart data. This helps extract current medications, PHQ-9/GAD-7 scores, and other clinical data.
            </p>
            <textarea
              value={epicChartData}
              onChange={(e) => setEpicChartData(e.target.value)}
              placeholder="Paste Epic chart data here (medications, PHQ-9, GAD-7, vitals, etc.)..."
              rows={6}
              className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              disabled={isGenerating}
            />
            {epicChartData.trim().length > 0 && (
              <p className="text-sm text-[var(--success-text)] mt-2">
                Epic chart data provided ({epicChartData.length} characters)
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(!isSpanishTranscript || hasTranslated) && (
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviewPrompt}
              disabled={!canGenerate || loadingPreview}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] rounded-[2px] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={16} />
              {loadingPreview ? 'Loading...' : 'Preview Prompt'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} />
              {isGenerating ? 'Generating...' : 'Generate Note'}
            </button>
          </div>
        )}

        {!canGenerate && (!isSpanishTranscript || hasTranslated) && (
          <div className="mt-4 p-3 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px] flex items-start gap-2">
            <AlertCircle size={16} className="text-[var(--warning-text)] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[var(--warning-text)]">
              Please provide{' '}
              {!transcript.trim() && 'a transcript'}
              {(!transcript.trim() && requiresPreviousNote && !previousNote.trim()) && ', and '}
              {requiresPreviousNote && !previousNote.trim() && 'a previous note'}{' '}
              to generate the clinical note.
            </p>
          </div>
        )}
      </div>

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--bg-surface)] rounded-[2px] max-w-4xl max-h-[80vh] overflow-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Prompt Preview</h3>
              <button
                onClick={() => setShowPromptPreview(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] p-4 rounded-[2px]">
              {promptPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
