'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Pill,
  Heart,
  Users,
  Wine,
  AlertTriangle,
  Stethoscope,
  Target,
  RefreshCw,
  Save,
  Pencil,
  X,
  Check,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import type { StructuredPatientProfile } from '@epic-scribe/types';

interface PatientProfileTabProps {
  patientId: string;
}

type SectionKey =
  | 'diagnoses'
  | 'currentMedications'
  | 'pastMedications'
  | 'psychiatricHistory'
  | 'familyHistory'
  | 'socialHistory'
  | 'substanceUse'
  | 'allergies'
  | 'medicalHistory'
  | 'treatmentThemes';

export default function PatientProfileTab({ patientId }: PatientProfileTabProps) {
  const [profile, setProfile] = useState<StructuredPatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/patient-profile/${patientId}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const saveProfile = async (updated: StructuredPatientProfile) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/patient-profile/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updated }),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      const data = await res.json();
      setProfile(data.profile);
      setEditingSection(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (section: SectionKey) => {
    if (!profile) return;
    setEditingSection(section);
    setEditBuffer(JSON.stringify((profile as any)[section], null, 2));
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditBuffer('');
  };

  const saveEditing = () => {
    if (!profile || !editingSection) return;
    try {
      const parsed = JSON.parse(editBuffer);
      const updated = { ...profile, [editingSection]: parsed };
      saveProfile(updated);
    } catch {
      alert('Invalid JSON. Please check your edits.');
    }
  };

  // --- Quick-edit helpers for common operations ---
  const removeDiagnosis = (index: number) => {
    if (!profile) return;
    const updated = { ...profile, diagnoses: profile.diagnoses.filter((_, i) => i !== index) };
    saveProfile(updated);
  };

  const removeMedication = (list: 'currentMedications' | 'pastMedications', index: number) => {
    if (!profile) return;
    const updated = { ...profile, [list]: (profile[list] as any[]).filter((_, i) => i !== index) };
    saveProfile(updated);
  };

  const removeAllergy = (index: number) => {
    if (!profile) return;
    const updated = { ...profile, allergies: profile.allergies.filter((_, i) => i !== index) };
    saveProfile(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--text-primary)] border-r-transparent" />
          <p className="mt-4 text-[var(--text-secondary)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-6 text-center">
        <p className="text-[var(--error-text)]">{error}</p>
        <button onClick={fetchProfile} className="mt-3 text-sm text-[var(--error-text)] underline">Retry</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-8 text-center">
        <Brain className="mx-auto text-[var(--text-secondary)] mb-4" size={48} />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Profile Yet</h3>
        <p className="text-[var(--text-secondary)] mb-4">
          A structured profile will be built automatically after saving notes for this patient.
          You can also run the backfill script to process existing notes.
        </p>
        <code className="block bg-[var(--bg-surface-2)] rounded-[2px] p-3 text-xs text-[var(--text-secondary)] font-mono">
          npx tsx scripts/backfill-patient-profiles.ts {patientId}
        </code>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title, section }: { icon: any; title: string; section: SectionKey }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-[var(--text-primary)]" />
        <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {editingSection === section ? (
        <div className="flex items-center gap-2">
          <button onClick={cancelEditing} className="p-1 text-[var(--text-secondary)] hover:text-red-600" title="Cancel">
            <X size={16} />
          </button>
          <button onClick={saveEditing} disabled={saving} className="p-1 text-green-600 hover:text-green-700" title="Save">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
        </div>
      ) : (
        <button onClick={() => startEditing(section)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Edit">
          <Pencil size={14} />
        </button>
      )}
    </div>
  );

  const EditOverlay = () => (
    editingSection ? (
      <div className="mt-2 border border-[var(--border-default)] rounded-[2px] overflow-hidden">
        <textarea
          value={editBuffer}
          onChange={(e) => setEditBuffer(e.target.value)}
          className="w-full h-64 p-3 text-xs font-mono bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] resize-y"
          spellCheck={false}
        />
      </div>
    ) : null
  );

  const EmptyState = ({ text }: { text: string }) => (
    <p className="text-sm text-[var(--text-secondary)] italic">{text}</p>
  );

  return (
    <div className="space-y-6">
      {/* Metadata bar */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] px-5 py-3">
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            Updated {new Date(profile.lastUpdated).toLocaleDateString()}
          </span>
          <span>v{profile.sourceNoteCount} ({profile.sourceNoteCount} note{profile.sourceNoteCount !== 1 ? 's' : ''})</span>
          {profile.lastNoteDate && <span>Last note: {profile.lastNoteDate}</span>}
        </div>
        <button onClick={fetchProfile} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Diagnoses */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <SectionHeader icon={Brain} title="Diagnoses" section="diagnoses" />
        {editingSection === 'diagnoses' ? <EditOverlay /> : (
          profile.diagnoses.length > 0 ? (
            <div className="space-y-2">
              {profile.diagnoses.map((dx, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full ${dx.status === 'active' ? 'bg-green-500' : dx.status === 'resolved' ? 'bg-gray-400' : 'bg-yellow-500'}`} />
                    <span className="text-[var(--text-primary)] font-medium">{dx.name}</span>
                    {dx.icd10Code && <span className="text-[var(--text-secondary)]">({dx.icd10Code})</span>}
                    <span className="text-xs text-[var(--text-secondary)] capitalize">{dx.status}</span>
                  </div>
                  <button onClick={() => removeDiagnosis(i)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity" title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : <EmptyState text="No diagnoses documented" />
        )}
      </div>

      {/* Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Medications */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={Pill} title="Current Medications" section="currentMedications" />
          {editingSection === 'currentMedications' ? <EditOverlay /> : (
            profile.currentMedications.length > 0 ? (
              <div className="space-y-3">
                {profile.currentMedications.map((med, i) => (
                  <div key={i} className="group border-b border-[var(--border-default)] last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {med.name} {med.dose && <span className="font-normal text-[var(--text-secondary)]">{med.dose}</span>} {med.frequency && <span className="font-normal text-[var(--text-secondary)]">{med.frequency}</span>}
                      </span>
                      <button onClick={() => removeMedication('currentMedications', i)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity" title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {med.indication && <p className="text-xs text-[var(--text-secondary)]">for {med.indication}</p>}
                    {med.response && <p className="text-xs text-green-600">Response: {med.response}</p>}
                    {med.sideEffects && med.sideEffects.length > 0 && <p className="text-xs text-orange-600">Side effects: {med.sideEffects.join(', ')}</p>}
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No current medications" />
          )}
        </div>

        {/* Past Medications */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={Pill} title="Past Medications" section="pastMedications" />
          {editingSection === 'pastMedications' ? <EditOverlay /> : (
            profile.pastMedications.length > 0 ? (
              <div className="space-y-3">
                {profile.pastMedications.map((med, i) => (
                  <div key={i} className="group border-b border-[var(--border-default)] last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {med.name} {med.dose && <span className="font-normal text-[var(--text-secondary)]">{med.dose}</span>}
                      </span>
                      <button onClick={() => removeMedication('pastMedications', i)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity" title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {med.response && <p className="text-xs text-[var(--text-secondary)]">Response: {med.response}</p>}
                    {med.reasonDiscontinued && <p className="text-xs text-orange-600">D/C: {med.reasonDiscontinued}</p>}
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No past medications" />
          )}
        </div>
      </div>

      {/* Psychiatric History */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <SectionHeader icon={AlertTriangle} title="Psychiatric History" section="psychiatricHistory" />
        {editingSection === 'psychiatricHistory' ? <EditOverlay /> : (
          <div className="space-y-3">
            {profile.psychiatricHistory.hospitalizations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Hospitalizations</p>
                {profile.psychiatricHistory.hospitalizations.map((h, i) => <p key={i} className="text-sm text-[var(--text-primary)]">{h}</p>)}
              </div>
            )}
            {profile.psychiatricHistory.suicideAttempts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Suicide Attempts</p>
                {profile.psychiatricHistory.suicideAttempts.map((a, i) => <p key={i} className="text-sm text-[var(--text-primary)]">{a}</p>)}
              </div>
            )}
            {profile.psychiatricHistory.selfHarm.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Self-Harm</p>
                {profile.psychiatricHistory.selfHarm.map((s, i) => <p key={i} className="text-sm text-[var(--text-primary)]">{s}</p>)}
              </div>
            )}
            {profile.psychiatricHistory.priorTreatments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Prior Treatments</p>
                {profile.psychiatricHistory.priorTreatments.map((t, i) => <p key={i} className="text-sm text-[var(--text-primary)]">{t}</p>)}
              </div>
            )}
            {profile.psychiatricHistory.priorDiagnoses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Prior Diagnoses</p>
                <p className="text-sm text-[var(--text-primary)]">{profile.psychiatricHistory.priorDiagnoses.join(', ')}</p>
              </div>
            )}
            {profile.psychiatricHistory.traumaHistory && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Trauma History</p>
                <p className="text-sm text-[var(--text-primary)]">{profile.psychiatricHistory.traumaHistory}</p>
              </div>
            )}
            {!profile.psychiatricHistory.hospitalizations.length &&
             !profile.psychiatricHistory.suicideAttempts.length &&
             !profile.psychiatricHistory.selfHarm.length &&
             !profile.psychiatricHistory.priorTreatments.length &&
             !profile.psychiatricHistory.priorDiagnoses.length &&
             !profile.psychiatricHistory.traumaHistory &&
             <EmptyState text="No psychiatric history documented" />
            }
          </div>
        )}
      </div>

      {/* Family History + Social History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family History */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={Users} title="Family History" section="familyHistory" />
          {editingSection === 'familyHistory' ? <EditOverlay /> : (
            profile.familyHistory.entries.length > 0 ? (
              <div className="space-y-2">
                {profile.familyHistory.entries.map((e, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-[var(--text-primary)]">{e.relation}:</span>{' '}
                    <span className="text-[var(--text-secondary)]">{e.condition}</span>
                    {e.details && <span className="text-[var(--text-secondary)]"> ({e.details})</span>}
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No family history documented" />
          )}
        </div>

        {/* Social History */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={Heart} title="Social History" section="socialHistory" />
          {editingSection === 'socialHistory' ? <EditOverlay /> : (
            <div className="space-y-2 text-sm">
              {profile.socialHistory.livingSituation && <p><span className="font-medium text-[var(--text-primary)]">Living:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.livingSituation}</span></p>}
              {profile.socialHistory.employment && <p><span className="font-medium text-[var(--text-primary)]">Employment:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.employment}</span></p>}
              {profile.socialHistory.relationships && <p><span className="font-medium text-[var(--text-primary)]">Relationships:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.relationships}</span></p>}
              {profile.socialHistory.education && <p><span className="font-medium text-[var(--text-primary)]">Education:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.education}</span></p>}
              {profile.socialHistory.legal && <p><span className="font-medium text-[var(--text-primary)]">Legal:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.legal}</span></p>}
              {profile.socialHistory.supportSystem && <p><span className="font-medium text-[var(--text-primary)]">Support:</span> <span className="text-[var(--text-secondary)]">{profile.socialHistory.supportSystem}</span></p>}
              {!profile.socialHistory.livingSituation && !profile.socialHistory.employment &&
               !profile.socialHistory.relationships && !profile.socialHistory.education &&
               !profile.socialHistory.legal && !profile.socialHistory.supportSystem &&
               <EmptyState text="No social history documented" />
              }
            </div>
          )}
        </div>
      </div>

      {/* Substance Use + Allergies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Substance Use */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={Wine} title="Substance Use" section="substanceUse" />
          {editingSection === 'substanceUse' ? <EditOverlay /> : (
            profile.substanceUse.substances.length > 0 ? (
              <div className="space-y-2">
                {profile.substanceUse.substances.map((s, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-[var(--text-primary)]">{s.substance}:</span>{' '}
                    <span className="text-[var(--text-secondary)]">{s.pattern}</span>
                    {s.frequency && <span className="text-[var(--text-secondary)]"> ({s.frequency})</span>}
                    {s.sobrietyDate && <span className="text-green-600"> — sober since {s.sobrietyDate}</span>}
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No substance use documented" />
          )}
        </div>

        {/* Allergies */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <SectionHeader icon={AlertTriangle} title="Allergies" section="allergies" />
          {editingSection === 'allergies' ? <EditOverlay /> : (
            profile.allergies.length > 0 ? (
              <div className="space-y-2">
                {profile.allergies.map((a, i) => (
                  <div key={i} className="flex items-center justify-between group text-sm">
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{a.substance}</span>
                      {a.reaction && <span className="text-[var(--text-secondary)]">: {a.reaction}</span>}
                      {a.severity && <span className="text-orange-600"> ({a.severity})</span>}
                    </div>
                    <button onClick={() => removeAllergy(i)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No allergies documented" />
          )}
        </div>
      </div>

      {/* Medical History */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <SectionHeader icon={Stethoscope} title="Medical History" section="medicalHistory" />
        {editingSection === 'medicalHistory' ? <EditOverlay /> : (
          profile.medicalHistory.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.medicalHistory.conditions.map((c, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--bg-surface-2)] text-sm text-[var(--text-primary)]">{c}</span>
              ))}
            </div>
          ) : <EmptyState text="No medical history documented" />
        )}
      </div>

      {/* Treatment Themes */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
        <SectionHeader icon={Target} title="Treatment Themes" section="treatmentThemes" />
        {editingSection === 'treatmentThemes' ? <EditOverlay /> : (
          <div className="space-y-3">
            {profile.treatmentThemes.formulation && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Formulation</p>
                <p className="text-sm text-[var(--text-primary)]">{profile.treatmentThemes.formulation}</p>
              </div>
            )}
            {profile.treatmentThemes.keyThemes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Key Themes</p>
                <div className="flex flex-wrap gap-2">
                  {profile.treatmentThemes.keyThemes.map((t, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--bg-surface-2)] text-sm text-[var(--text-primary)]">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.treatmentThemes.standingPlanItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Standing Plan Items</p>
                {profile.treatmentThemes.standingPlanItems.map((item, i) => (
                  <p key={i} className="text-sm text-[var(--text-primary)]">{item}</p>
                ))}
              </div>
            )}
            {!profile.treatmentThemes.formulation &&
             !profile.treatmentThemes.keyThemes.length &&
             !profile.treatmentThemes.standingPlanItems.length &&
             <EmptyState text="No treatment themes documented" />
            }
          </div>
        )}
      </div>
    </div>
  );
}
