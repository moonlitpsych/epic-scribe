'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { TodayEncounter } from '@/lib/flow/types';
import { STATUS_META } from '@/lib/flow/status';

interface ScheduleWeekViewProps {
  /** The start of the week (Monday YYYY-MM-DD) */
  weekStart: string;
  encounters: TodayEncounter[];
  onSelectEncounter: (encounter: TodayEncounter) => void;
  onNavigateToDay: (date: string) => void;
}

const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_HEIGHT = 48;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ScheduleWeekView({
  weekStart,
  encounters,
  onSelectEncounter,
  onNavigateToDay,
}: ScheduleWeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  // Build 7 day columns starting from weekStart (Monday)
  const days = useMemo(() => {
    const start = new Date(weekStart + 'T12:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return toDateStr(d);
    });
  }, [weekStart]);

  // Group encounters by date
  const encountersByDate = useMemo(() => {
    const map: Record<string, TodayEncounter[]> = {};
    for (const day of days) map[day] = [];
    for (const e of encounters) {
      if (!e.scheduledStart) continue;
      const d = e.scheduledStart.split('T')[0];
      if (map[d]) map[d].push(e);
    }
    return map;
  }, [days, encounters]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && days.includes(today)) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const startMins = START_HOUR * 60;
      const pxFromTop = ((mins - startMins) / 30) * SLOT_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, pxFromTop - 200);
    }
  }, [today, days]);

  // Time labels
  const timeLabels = useMemo(() => {
    const labels: { label: string; top: number }[] = [];
    for (let slot = 0; slot <= TOTAL_SLOTS; slot++) {
      const totalMins = START_HOUR * 60 + slot * 30;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      labels.push({
        label: m === 0 ? `${h12} ${ampm}` : '',
        top: slot * SLOT_HEIGHT,
      });
    }
    return labels;
  }, []);

  // Now indicator
  const nowIndicatorTop = useMemo(() => {
    if (!days.includes(today)) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = START_HOUR * 60;
    const endMins = END_HOUR * 60;
    if (mins < startMins || mins > endMins) return null;
    return ((mins - startMins) / 30) * SLOT_HEIGHT;
  }, [today, days]);

  const startMins = START_HOUR * 60;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Column headers */}
      <div className="grid shrink-0 border-b border-[#1e2130]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div /> {/* gutter spacer */}
        {days.map((day) => {
          const d = new Date(day + 'T12:00:00');
          const isCurrentDay = day === today;
          return (
            <button
              key={day}
              onClick={() => onNavigateToDay(day)}
              className={`py-2 text-center transition-colors hover:bg-white/[0.03] ${
                isCurrentDay ? 'bg-[var(--flow-accent-bg)]' : ''
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-[#4b5563]">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-[15px] font-semibold ${
                  isCurrentDay ? 'text-[var(--flow-accent-light)]' : 'text-[#d1d5db]'
                }`}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: '60px repeat(7, 1fr)',
            height: TOTAL_SLOTS * SLOT_HEIGHT + 20,
          }}
        >
          {/* Time gutter */}
          <div className="relative">
            {timeLabels.map(({ label, top }, i) => (
              <div
                key={i}
                className="absolute right-2 text-[11px] text-[#4b5563]"
                style={{ top: top - 7 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIdx) => {
            const isCurrentDay = day === today;
            const dayEncounters = encountersByDate[day] || [];

            return (
              <div
                key={day}
                className={`relative border-l border-[#1e2130] ${isCurrentDay ? 'bg-[var(--flow-accent-bg)]/30' : ''}`}
              >
                {/* Grid lines */}
                {timeLabels.map(({ top }, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-[#1e2130]/60"
                    style={{ top }}
                  />
                ))}

                {/* Encounter blocks */}
                {dayEncounters.map((e) => {
                  const sMins = timeToMinutes(e.scheduledStart);
                  const eMins = e.scheduledEnd ? timeToMinutes(e.scheduledEnd) : sMins + 30;
                  const top = ((sMins - startMins) / 30) * SLOT_HEIGHT;
                  const height = Math.max(((eMins - sMins) / 30) * SLOT_HEIGHT, 28);
                  const meta = STATUS_META[e.status];

                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectEncounter(e)}
                      className="absolute inset-x-1 overflow-hidden rounded border text-left transition-all hover:brightness-110"
                      style={{
                        top,
                        height,
                        background: meta.bg,
                        borderColor: meta.color + '33',
                        borderLeftWidth: 2,
                        borderLeftColor: meta.color,
                      }}
                    >
                      <div className="px-1.5 py-0.5">
                        <div className="truncate text-[10px] font-medium text-[#a0a4b4]">
                          {formatTime(e.scheduledStart)}
                        </div>
                        <div className="truncate text-[11px] font-semibold text-[#f4f4f5]">
                          {e.patientName}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Now indicator for today's column */}
                {isCurrentDay && nowIndicatorTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: nowIndicatorTop }}
                  >
                    <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                    <div className="h-[2px] flex-1 bg-[#ef4444]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
