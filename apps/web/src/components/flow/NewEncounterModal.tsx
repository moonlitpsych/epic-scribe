'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Setting, SETTINGS } from '@epic-scribe/types';
import { VISIT_TYPES_BY_SETTING as VISIT_TYPES } from '@/lib/flow/visit-types';
import PatientSelector from '../workflow/PatientSelector';

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
}

interface NewEncounterModalProps {
  onClose: () => void;
  onCreated: (encounterId: string) => void;
  defaultDate?: string;
}

function roundToNext15(d: Date): Date {
  const ms = 1000 * 60 * 15;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NewEncounterModal({ onClose, onCreated, defaultDate }: NewEncounterModalProps) {
  const now = roundToNext15(new Date());

  const [patient, setPatient] = useState<Patient | null>(null);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [visitType, setVisitType] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(defaultDate || toLocalDateStr(now));
  const [time, setTime] = useState(toLocalTimeStr(now));
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visitTypes = setting ? VISIT_TYPES[setting] || [] : [];
  const canCreate = !!patient && !!setting && !!visitType && !creating;

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleCreate() {
    if (!canCreate || !patient) return;
    setCreating(true);
    setError(null);

    try {
      const startTime = new Date(`${date}T${time}:00`);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const res = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          setting,
          visitType,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create encounter');
      }

      const data = await res.json();
      const encounterId = data.dbEncounter?.id || data.encounter?.id;

      if (encounterId) {
        onCreated(encounterId);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating encounter:', err);
      setError(err.message || 'Failed to create encounter');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-[520px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Encounter</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Patient
            </label>
            <PatientSelector
              selectedPatient={patient}
              onPatientSelect={setPatient as any}
            />
          </div>

          {/* Setting + Visit Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Setting
              </label>
              <select
                value={setting || ''}
                onChange={(e) => {
                  setSetting(e.target.value as Setting);
                  setVisitType(undefined);
                }}
                className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
              >
                <option value="">Select...</option>
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
                className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)] disabled:opacity-50"
              >
                <option value="">Select...</option>
                {visitTypes.map((vt) => (
                  <option key={vt} value={vt}>{vt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-[var(--error-text)] bg-[var(--error-bg)] border border-[var(--error-border)] rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-[2px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={14} />
                Create Encounter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
