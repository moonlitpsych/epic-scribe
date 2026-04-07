'use client';

import { useState } from 'react';
import { SETTINGS, type Setting } from '@epic-scribe/types';
import { VISIT_TYPES_BY_SETTING } from '@/lib/flow/visit-types';
import type { TodayEncounter } from '@/lib/flow/types';
import StatusBadge from '../StatusBadge';
import PayerTag from '../PayerTag';
import PatientSelector from '../../workflow/PatientSelector';

interface EncounterHeaderProps {
  encounter: TodayEncounter;
  editable?: boolean;
  onEncounterUpdated?: () => void;
}

export default function EncounterHeader({ encounter, editable, onEncounterUpdated }: EncounterHeaderProps) {
  const [editingSetting, setEditingSetting] = useState(false);
  const [localSetting, setLocalSetting] = useState(encounter.setting || '');
  const [localVisitType, setLocalVisitType] = useState(encounter.visitType || '');
  const [saving, setSaving] = useState(false);
  const [showPatientLink, setShowPatientLink] = useState(false);

  const visitTypes = localSetting ? VISIT_TYPES_BY_SETTING[localSetting as Setting] || [] : [];

  async function handleSettingChange(newSetting: string) {
    setLocalSetting(newSetting);
    setLocalVisitType('');
  }

  async function handleVisitTypeChange(newVisitType: string) {
    setLocalVisitType(newVisitType);
    // Auto-save when both are set
    if (localSetting && newVisitType) {
      setSaving(true);
      try {
        await fetch(`/api/encounters/${encounter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting: localSetting, visitType: newVisitType }),
        });
        setEditingSetting(false);
        onEncounterUpdated?.();
      } catch {
        // Revert on error
        setLocalSetting(encounter.setting || '');
        setLocalVisitType(encounter.visitType || '');
      } finally {
        setSaving(false);
      }
    }
  }

  async function handlePatientLink(patient: any) {
    setSaving(true);
    try {
      await fetch(`/api/encounters/${encounter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id }),
      });
      setShowPatientLink(false);
      onEncounterUpdated?.();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }
  const startTime = encounter.scheduledStart
    ? new Date(encounter.scheduledStart).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const endTime = encounter.scheduledEnd
    ? new Date(encounter.scheduledEnd).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const dateStr = encounter.scheduledStart
    ? new Date(encounter.scheduledStart).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const durationMin =
    encounter.scheduledStart && encounter.scheduledEnd
      ? Math.round(
          (new Date(encounter.scheduledEnd).getTime() -
            new Date(encounter.scheduledStart).getTime()) /
            60000
        )
      : undefined;

  return (
    <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-flow-heading text-xl font-semibold text-[var(--text-primary)] truncate">
            {encounter.patientName || (
              editable ? (
                <span className="text-[var(--text-muted)] font-normal">
                  <button
                    onClick={() => setShowPatientLink(true)}
                    className="text-[var(--accent-primary)] hover:underline text-base"
                  >
                    Link Patient
                  </button>
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">No patient</span>
              )
            )}
            {encounter.patientAge != null && (
              <span className="ml-2 text-base font-normal text-[var(--text-secondary)]">
                {encounter.patientAge}y
              </span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--text-muted)]">
            <span>{dateStr}</span>
            <span>·</span>
            <span>
              {startTime} – {endTime}
              {durationMin ? ` (${durationMin}m)` : ''}
            </span>
            {editable && editingSetting ? (
              <>
                <span>·</span>
                <select
                  value={localSetting}
                  onChange={(e) => handleSettingChange(e.target.value)}
                  className="px-1.5 py-0.5 text-[13px] border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                >
                  <option value="">Setting...</option>
                  {SETTINGS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={localVisitType}
                  onChange={(e) => handleVisitTypeChange(e.target.value)}
                  disabled={!localSetting}
                  className="px-1.5 py-0.5 text-[13px] border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] disabled:opacity-50"
                >
                  <option value="">Visit type...</option>
                  {visitTypes.map((vt) => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
                {saving && <span className="text-[11px] text-[var(--text-muted)]">Saving...</span>}
              </>
            ) : (
              <>
                {encounter.setting && (
                  <>
                    <span>·</span>
                    <span
                      className={editable ? 'cursor-pointer hover:text-[var(--text-primary)] transition-colors' : ''}
                      onClick={() => editable && setEditingSetting(true)}
                    >
                      {encounter.setting}
                    </span>
                  </>
                )}
                {encounter.visitType && (
                  <>
                    <span>·</span>
                    <span
                      className={editable ? 'cursor-pointer hover:text-[var(--text-primary)] transition-colors' : ''}
                      onClick={() => editable && setEditingSetting(true)}
                    >
                      {encounter.visitType}
                    </span>
                  </>
                )}
                {editable && !encounter.setting && !encounter.visitType && (
                  <>
                    <span>·</span>
                    <button
                      onClick={() => setEditingSetting(true)}
                      className="text-[var(--accent-primary)] hover:underline"
                    >
                      Set setting/visit type
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={encounter.status} />
          {encounter.payerName && <PayerTag payer={encounter.payerName} />}
          {encounter.meetLink && (
            <a
              href={encounter.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-[#10b981]/10 px-2.5 py-1 text-[11px] font-semibold text-[#10b981] hover:bg-[#10b981]/20"
            >
              Meet ↗
            </a>
          )}
        </div>
      </div>

      {encounter.diagnoses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-[var(--text-secondary)]">
          {encounter.diagnoses.map((dx, i) => (
            <span key={i}>{dx}</span>
          ))}
        </div>
      )}

      {/* Patient link popup */}
      {showPatientLink && (
        <div className="mt-3 border-t border-[var(--border-default)] pt-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Link Patient to Encounter
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <PatientSelector
                selectedPatient={null}
                onPatientSelect={handlePatientLink}
              />
            </div>
            <button
              onClick={() => setShowPatientLink(false)}
              className="px-3 py-2 text-xs border border-[var(--border-default)] rounded-[2px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
