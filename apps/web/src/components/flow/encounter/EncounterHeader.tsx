'use client';

import type { TodayEncounter } from '@/lib/flow/types';
import StatusBadge from '../StatusBadge';
import PayerTag from '../PayerTag';

interface EncounterHeaderProps {
  encounter: TodayEncounter;
}

export default function EncounterHeader({ encounter }: EncounterHeaderProps) {
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
            {encounter.patientName}
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
            {encounter.setting && (
              <>
                <span>·</span>
                <span>{encounter.setting}</span>
              </>
            )}
            {encounter.visitType && (
              <>
                <span>·</span>
                <span>{encounter.visitType}</span>
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
    </div>
  );
}
