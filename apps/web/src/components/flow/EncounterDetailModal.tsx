'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { TodayEncounter } from '@/lib/flow/types';
import StatusBadge from './StatusBadge';
import PayerTag from './PayerTag';

interface EncounterDetailModalProps {
  encounter: TodayEncounter;
  onClose: () => void;
}

export default function EncounterDetailModal({ encounter, onClose }: EncounterDetailModalProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Format times
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
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
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

  async function saveNotes() {
    if (!notesRef.current) return;
    setSaving(true);
    try {
      await fetch(`/api/encounters/${encounter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerNotes: notesRef.current }),
      });
    } catch (err) {
      console.error('[EncounterDetailModal] Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-[#2a2d3a] bg-[#141720] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] hover:text-[#d1d5db]"
        >
          ✕
        </button>

        {/* Patient name */}
        <h2 className="mb-1 pr-8 font-flow-heading text-xl font-semibold text-[#f4f4f5]">
          {encounter.patientName}
        </h2>

        {/* Date/time */}
        <p className="mb-4 text-[13px] text-[#6b7280]">
          {dateStr} · {startTime} – {endTime}
          {durationMin ? ` (${durationMin}m)` : ''}
        </p>

        {/* Tags row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={encounter.status} />
          {encounter.payerName && <PayerTag payer={encounter.payerName} />}
        </div>

        {/* Setting + Visit Type */}
        {(encounter.setting || encounter.visitType) && (
          <div className="mb-3 text-[13px] text-[#a0a4b4]">
            {encounter.setting}
            {encounter.setting && encounter.visitType && ' · '}
            {encounter.visitType}
          </div>
        )}

        {/* Diagnoses */}
        {encounter.diagnoses.length > 0 && (
          <div className="mb-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">
              Diagnoses
            </div>
            <ul className="space-y-0.5">
              {encounter.diagnoses.map((dx, i) => (
                <li key={i} className="text-[12px] text-[#a0a4b4]">
                  {dx}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Meet link */}
        {encounter.meetLink && (
          <a
            href={encounter.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-[#10b981]/10 px-3 py-1.5 text-[12px] font-semibold text-[#10b981] hover:bg-[#10b981]/20"
          >
            Join Meet ↗
          </a>
        )}

        {/* Notes textarea */}
        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes for this encounter..."
            rows={3}
            className="w-full resize-none rounded-lg border border-[#2a2d3a] bg-[#0f1117] px-3 py-2 text-[13px] text-[#e8eaf0] placeholder-[#4b5563] outline-none focus:border-[var(--flow-accent)]"
          />
          {saving && (
            <span className="text-[10px] text-[#4b5563]">Saving...</span>
          )}
        </div>

        {/* Go to encounter button */}
        {encounter.patientId && (
          <Link
            href={`/flow/encounter/${encounter.id}`}
            className="block w-full rounded-lg bg-[var(--flow-accent)] px-4 py-2.5 text-center text-[13px] font-bold text-[#0a0b0f] hover:opacity-90"
          >
            Go to Encounter
          </Link>
        )}
      </div>
    </div>
  );
}
