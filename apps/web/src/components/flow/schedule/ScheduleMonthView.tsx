'use client';

import { useMemo } from 'react';
import type { TodayEncounter } from '@/lib/flow/types';
import { STATUS_META } from '@/lib/flow/status';

interface ScheduleMonthViewProps {
  year: number;
  month: number; // 0-indexed
  encounters: TodayEncounter[];
  onSelectEncounter: (encounter: TodayEncounter) => void;
  onNavigateToDay: (date: string) => void;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const MAX_PILLS = 3;

export default function ScheduleMonthView({
  year,
  month,
  encounters,
  onSelectEncounter,
  onNavigateToDay,
}: ScheduleMonthViewProps) {
  const today = new Date().toISOString().split('T')[0];

  // Build calendar grid
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const w: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [year, month]);

  // Group encounters by date
  const encountersByDate = useMemo(() => {
    const map: Record<string, TodayEncounter[]> = {};
    for (const e of encounters) {
      if (!e.scheduledStart) continue;
      const d = e.scheduledStart.split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    }
    return map;
  }, [encounters]);

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Day headers */}
      <div className="grid shrink-0 grid-cols-7 border-b border-[#1e2130]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium uppercase text-[#4b5563]">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[#1e2130]">
            {week.map((dateStr, di) => {
              if (!dateStr) {
                return <div key={di} className="min-h-[100px] border-r border-[#1e2130] bg-[#0a0b0f]/30" />;
              }

              const dayNum = parseInt(dateStr.split('-')[2]);
              const isToday = dateStr === today;
              const dayEncounters = encountersByDate[dateStr] || [];
              const visibleCount = Math.min(dayEncounters.length, MAX_PILLS);
              const overflowCount = dayEncounters.length - MAX_PILLS;

              return (
                <div
                  key={di}
                  className={`min-h-[100px] border-r border-[#1e2130] p-1 ${
                    isToday ? 'bg-[var(--flow-accent-bg)]/30' : ''
                  }`}
                >
                  {/* Day number */}
                  <button
                    onClick={() => onNavigateToDay(dateStr)}
                    className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px] transition-colors hover:bg-white/[0.08] ${
                      isToday
                        ? 'bg-[var(--flow-accent)] font-bold text-[#0a0b0f]'
                        : 'text-[#9ca3af]'
                    }`}
                  >
                    {dayNum}
                  </button>

                  {/* Encounter pills */}
                  <div className="flex flex-col gap-0.5">
                    {dayEncounters.slice(0, visibleCount).map((e) => {
                      const meta = STATUS_META[e.status];
                      const timeStr = formatTime(e.scheduledStart);
                      // Shorten name: "Kopinski, Melissa" → "Kopinski"
                      const shortName = e.patientName.split(',')[0];

                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSelectEncounter(e);
                          }}
                          className="truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition-all hover:brightness-125"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {timeStr.replace(' ', '').toLowerCase()} {shortName}
                        </button>
                      );
                    })}
                    {overflowCount > 0 && (
                      <button
                        onClick={() => onNavigateToDay(dateStr)}
                        className="px-1.5 text-left text-[10px] font-medium text-[#6b7280] hover:text-[#a0a4b4]"
                      >
                        +{overflowCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
