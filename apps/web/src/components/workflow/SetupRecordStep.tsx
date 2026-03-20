'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Setting, SETTINGS, Template } from '@epic-scribe/types';
import { Heart, QrCode, X, ChevronDown, ChevronRight, ExternalLink, ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { useRecentTranscripts, PhoneTranscript } from '@/hooks/useRecentTranscripts';
import QRCode from 'qrcode';
import PatientSelector from './PatientSelector';
import EncountersList from './EncountersList';
import ManualNotePanel from './ManualNotePanel';
import AudioRecorder, { RecordingState } from './AudioRecorder';
import SmartListExpander from './SmartListExpander';
import { SmartToolsParser } from '@epic-scribe/note-service/src/smarttools';
import { CalendarEncounter } from '@/google-calendar';

const parser = new SmartToolsParser();

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

const VISIT_TYPES: Record<Setting, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
  'Teenscope South': ['Intake', 'Follow-up'],
  'Psycho-oncology (HCI)': ['Intake', 'Follow-up'],
};

export interface SetupData {
  patient: Patient;
  setting: Setting;
  visitType: string;
  template: Template;
  transcript: string;
  encounterId: string | null;
}

interface SetupRecordStepProps {
  onSetupComplete: (data: SetupData) => void;
  onSkipRecording: (data: Omit<SetupData, 'transcript'>) => void;
  initialPatient?: Patient | null;
  initialSetting?: Setting;
  initialVisitType?: string;
  initialEncounterId?: string | null;
}

export default function SetupRecordStep({
  onSetupComplete,
  onSkipRecording,
  initialPatient = null,
  initialSetting,
  initialVisitType,
  initialEncounterId = null,
}: SetupRecordStepProps) {
  // Patient
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [encounterId, setEncounterId] = useState<string | null>(initialEncounterId);

  // Setting / Visit Type / Template
  const [setting, setSetting] = useState<Setting | undefined>(initialSetting);
  const [visitType, setVisitType] = useState<string | undefined>(initialVisitType);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // Encounters
  const [encounters, setEncounters] = useState<CalendarEncounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // HealthKit
  const [clinicalDataSummary, setClinicalDataSummary] = useState<{
    hasClinicalData: boolean;
    lastSyncedAt: string | null;
    counts: Record<string, number>;
  } | null>(null);

  // Payer
  const [payers, setPayers] = useState<{ id: string; name: string }[]>([]);
  const [patientPayerId, setPatientPayerId] = useState<string>('');
  const [savingPayer, setSavingPayer] = useState(false);

  // QR
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Recording
  const [transcript, setTranscript] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phone transcripts
  const { transcripts: phoneTranscripts, markUsed: markPhoneTranscriptUsed } = useRecentTranscripts();

  const isReady = !!selectedPatient && !!setting && !!visitType && !!template && !loadingTemplate;

  // ─── Template loading ───
  useEffect(() => {
    if (setting && visitType) {
      loadTemplate(setting, visitType);
    } else {
      setTemplate(null);
    }
  }, [setting, visitType]);

  const loadTemplate = async (s: Setting, vt: string) => {
    setLoadingTemplate(true);
    try {
      const response = await fetch(`/api/templates?setting=${encodeURIComponent(s)}&visitType=${encodeURIComponent(vt)}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();
      setTemplate(data);
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // ─── Payers ───
  useEffect(() => {
    fetch('/api/payers')
      .then((res) => res.json())
      .then((data) => setPayers(data.payers || []))
      .catch(() => {});
  }, []);

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

  // ─── Encounters ───
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

  const handleCreateEncounter = async () => {
    // Handled by PatientSelector
  };

  // ─── HealthKit ───
  useEffect(() => {
    if (selectedPatient) {
      fetch(`/api/clinical-data/summary?patientId=${selectedPatient.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
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

  // ─── QR Code ───
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

  // ─── Setting/Visit Type handlers ───
  const handleSettingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSetting = e.target.value as Setting;
    setSetting(newSetting);
    const firstVisitType = VISIT_TYPES[newSetting]?.[0];
    setVisitType(firstVisitType);
  };

  const handleVisitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVisitType(e.target.value);
  };

  // ─── Auto-advance after transcription completes ───
  useEffect(() => {
    if (recordingState === 'completed' && transcript && isReady && selectedPatient && setting && visitType && template) {
      autoAdvanceRef.current = setTimeout(() => {
        onSetupComplete({
          patient: selectedPatient,
          setting,
          visitType,
          template,
          transcript,
          encounterId,
        });
      }, 2000);
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [recordingState, transcript, isReady, selectedPatient, setting, visitType, template, encounterId, onSetupComplete]);

  // ─── Phone transcript selected ───
  const handlePhoneTranscript = (pt: PhoneTranscript) => {
    setTranscript(pt.transcript);
    setRecordingState('completed');
    markPhoneTranscriptUsed(pt.id, pt.patient_id || undefined);
  };

  // ─── Skip recording (paste manually) ───
  const handleSkipRecording = () => {
    if (!selectedPatient || !setting || !visitType || !template) return;
    onSkipRecording({
      patient: selectedPatient,
      setting,
      visitType,
      template,
      encounterId,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── Patient Selection ─── */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <h2 className="text-xl font-heading text-[var(--text-primary)] mb-3 tracking-tight">Patient</h2>
        <PatientSelector
          selectedPatient={selectedPatient}
          onPatientSelect={setSelectedPatient}
          onCreateEncounter={handleCreateEncounter}
          onEncounterCreated={handleEncounterCreated}
          setting={setting}
          visitType={visitType}
        />

        {/* Encounters */}
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

        {/* HealthKit Badge + QR */}
        {selectedPatient && (
          <div className="mt-3 flex items-center gap-2">
            {clinicalDataSummary?.hasClinicalData && (
              <div className="flex-1 flex items-center gap-2 p-2 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[2px]">
                <Heart className="text-[var(--success-text)] flex-shrink-0" size={16} />
                <span className="text-sm text-[var(--success-text)]">
                  Health Records synced
                  {clinicalDataSummary.lastSyncedAt && (
                    <> ({new Date(clinicalDataSummary.lastSyncedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })})</>
                  )}
                  {Object.keys(clinicalDataSummary.counts).length > 0 && (
                    <span className="text-[var(--success-text)]">
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-[2px] hover:bg-[var(--bg-hover)] transition-colors"
              title="Show QR code for HealthKit pairing"
            >
              <QrCode size={16} />
              QR
            </button>
          </div>
        )}
      </div>

      {/* ─── Payer Selection ─── */}
      {selectedPatient && payers.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">Primary Payer</label>
            <select
              value={patientPayerId}
              onChange={(e) => handlePayerChange(e.target.value)}
              disabled={savingPayer}
              className="flex-1 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
            >
              <option value="">No payer</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {savingPayer && (
              <span className="text-xs text-[var(--text-secondary)]">Saving...</span>
            )}
          </div>
        </div>
      )}

      {/* ─── Manual Note Panel ─── */}
      {selectedPatient && (
        <ManualNotePanel
          patient={selectedPatient}
          onNoteSaved={() => {
            console.log('Manual note saved for patient:', selectedPatient.id);
          }}
        />
      )}

      {/* ─── Setting + Visit Type ─── */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <h2 className="text-xl font-heading text-[var(--text-primary)] mb-4 tracking-tight">Setting &amp; Visit Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Setting</label>
            <select
              value={setting || ''}
              onChange={handleSettingChange}
              className="w-full px-4 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
            >
              <option value="">Select a setting...</option>
              {SETTINGS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Visit Type</label>
            <select
              value={visitType || ''}
              onChange={handleVisitTypeChange}
              disabled={!setting}
              className="w-full px-4 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent disabled:bg-[var(--bg-surface)] disabled:text-[var(--text-muted)]"
            >
              <option value="">Select visit type...</option>
              {setting && VISIT_TYPES[setting]?.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template loaded indicator */}
        {template && (
          <div className="mt-4 p-3 bg-[var(--bg-surface-2)] rounded-[2px]">
            <p className="text-sm text-[var(--text-primary)]">
              <span className="font-semibold">Template:</span> {template.name}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {template.sections?.length || 0} sections - Version {template.version}
            </p>
          </div>
        )}
        {loadingTemplate && (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading template...</p>
        )}

        {/* Optional template preview (collapsible) */}
        {template && !loadingTemplate && (
          <div className="mt-4 border border-[var(--border-default)] rounded-[2px] overflow-hidden">
            <button
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {showTemplatePreview ? (
                  <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight size={16} className="text-[var(--text-secondary)]" />
                )}
                <span className="text-sm text-[var(--text-secondary)]">
                  {showTemplatePreview ? 'Hide template preview' : 'Show template preview'}
                </span>
              </div>
              <a
                href="/templates"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-[var(--accent-warm)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ExternalLink size={14} />
                Edit
              </a>
            </button>
            {showTemplatePreview && (
              <div className="px-3 pb-3 border-t border-[var(--border-default)]">
                <div className="space-y-3 mt-3">
                  {(template.sections || [])
                    .sort((a, b) => a.order - b.order)
                    .map((section) => {
                      const parsed = parser.parse(section.content);
                      const hasSmartLists = parsed.smartLists && parsed.smartLists.length > 0;
                      return (
                        <div
                          key={section.order}
                          className="border border-[var(--border-default)] rounded-[2px] p-3 bg-[var(--bg-surface-2)]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-[var(--accent-warm)] bg-[var(--bg-surface)] px-2 py-0.5 rounded">
                              {section.order}
                            </span>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.name}</h3>
                          </div>
                          <pre className="text-xs font-mono bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-default)] whitespace-pre-wrap overflow-x-auto text-[var(--text-secondary)]">
                            {section.content}
                          </pre>
                          {hasSmartLists && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-[var(--text-primary)]">SmartLists:</p>
                              {parsed.smartLists.map((sl, idx) => (
                                <SmartListExpander key={`${sl.epicId}-${idx}`} epicId={sl.epicId} displayText={sl.text} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Phone Recordings ─── */}
      {phoneTranscripts.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={18} className="text-[var(--accent-warm)]" />
            <h2 className="text-xl font-heading text-[var(--text-primary)] tracking-tight">Phone Recordings</h2>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-[var(--accent-warm)] text-[var(--bg-base)]">
              {phoneTranscripts.length}
            </span>
          </div>
          <div className="space-y-2">
            {phoneTranscripts.map((pt) => {
              const recordedDate = new Date(pt.recorded_at);
              const now = new Date();
              const diffMs = now.getTime() - recordedDate.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              const timeAgo = diffMin < 60
                ? `${diffMin}m ago`
                : diffMin < 1440
                  ? `${Math.floor(diffMin / 60)}h ago`
                  : recordedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <button
                  key={pt.id}
                  onClick={() => handlePhoneTranscript(pt)}
                  disabled={!isReady}
                  className="w-full flex items-center gap-3 p-3 rounded-[2px] border border-[var(--border-default)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-hover)] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {pt.patient_name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {pt.word_count && (
                        <span className="text-xs text-[var(--text-secondary)]">{pt.word_count} words</span>
                      )}
                      {pt.recording_duration_seconds && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {Math.floor(pt.recording_duration_seconds / 60)}m {pt.recording_duration_seconds % 60}s
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                </button>
              );
            })}
          </div>
          {!isReady && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Select a patient, setting, and visit type to use phone recordings.
            </p>
          )}
        </div>
      )}

      {/* ─── Record Encounter ─── */}
      <AudioRecorder
        showInline={true}
        autoTranscribe={true}
        disabled={!isReady}
        onTranscriptReady={(text) => setTranscript(text)}
        onRecordingStateChange={setRecordingState}
        patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : undefined}
      />

      {/* Disabled hint */}
      {!isReady && (
        <p className="text-xs text-[var(--text-muted)] -mt-4">
          Select a patient, setting, and visit type to enable recording.
        </p>
      )}

      {/* Auto-advance indicator */}
      {recordingState === 'completed' && transcript && isReady && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--accent-primary)]">
          <Loader2 size={14} className="animate-spin" />
          Advancing to review...
        </div>
      )}

      {/* Skip / paste manually link */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleSkipRecording}
          disabled={!isReady}
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          or paste a transcript manually
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ─── QR Code Modal ─── */}
      {showQrModal && qrDataUrl && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--bg-surface)] rounded-[2px] p-6 mx-4 max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">HealthKit Pairing</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-2 rounded-[2px]">
                <img src={qrDataUrl} alt="Patient QR Code" width={256} height={256} />
              </div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-sm text-[var(--text-secondary)] text-center">
                Patient scans this with the Epic Scribe iOS app
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
