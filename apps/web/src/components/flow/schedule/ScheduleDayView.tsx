'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { TodayEncounter } from '@/lib/flow/types';
import { STATUS_META } from '@/lib/flow/status';
import PayerTag from '../PayerTag';

interface ScheduleDayViewProps {
  date: string; // YYYY-MM-DD
  encounters: TodayEncounter[];
  onSelectEncounter: (encounter: TodayEncounter) => void;
}

const START_HOUR = 7;
const END_HOUR = 19; // 7 PM
const SLOT_HEIGHT = 48; // px per 30 min
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

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

export default function ScheduleDayView({ date, encounters, onSelectEncounter }: ScheduleDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;

  // Scroll to current time on mount if today
  useEffect(() => {
    if (isToday && scrollRef.current) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const startMins = START_HOUR * 60;
      const pxFromTop = ((mins - startMins) / 30) * SLOT_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, pxFromTop - 200);
    }
  }, [isToday]);

  // Current time indicator position
  const nowIndicator = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = START_HOUR * 60;
    const endMins = END_HOUR * 60;
    if (mins < startMins || mins > endMins) return null;
    return ((mins - startMins) / 30) * SLOT_HEIGHT;
  }, [isToday]);

  // Position encounters on the grid
  const blocks = useMemo(() => {
    const startMins = START_HOUR * 60;
    return encounters
      .filter((e) => e.scheduledStart)
      .map((e) => {
        const sMins = timeToMinutes(e.scheduledStart);
        const eMins = e.scheduledEnd ? timeToMinutes(e.scheduledEnd) : sMins + 30;
        const top = ((sMins - startMins) / 30) * SLOT_HEIGHT;
        const height = Math.max(((eMins - sMins) / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.8);
        return { encounter: e, top, height };
      });
  }, [encounters]);

  // Generate time labels
  const timeLabels = useMemo(() => {
    const labels: { label: string; top: number }[] = [];
    for (let slot = 0; slot <= TOTAL_SLOTS; slot++) {
      const totalMins = START_HOUR * 60 + slot * 30;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      labels.push({
        label: m === 0 ? `${h12} ${ampm}` : `${h12}:30`,
        top: slot * SLOT_HEIGHT,
      });
    }
    return labels;
  }, []);

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto">
      <div className="relative" style={{ height: TOTAL_SLOTS * SLOT_HEIGHT + 20 }}>
        {/* Time gutter + grid lines */}
        {timeLabels.map(({ label, top }, i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top }}>
            <div className="flex items-start">
              <div className="w-16 shrink-0 pr-3 text-right text-[11px] text-[#4b5563]" style={{ marginTop: -7 }}>
                {label}
              </div>
              <div className="flex-1 border-t border-[#1e2130]" />
            </div>
          </div>
        ))}

        {/* Encounter blocks */}
        <div className="absolute left-16 right-4" style={{ top: 0 }}>
          {blocks.map(({ encounter, top, height }) => {
            const meta = STATUS_META[encounter.status];
            return (
              <button
                key={encounter.id}
                onClick={() => onSelectEncounter(encounter)}
                className="absolute left-1 right-1 overflow-hidden rounded-lg border px-3 py-1.5 text-left transition-all hover:brightness-110"
                style={{
                  top,
                  height,
                  background: meta.bg,
                  borderColor: meta.color + '33',
                  borderLeftWidth: 3,
                  borderLeftColor: meta.color,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium tabular-nums text-[#a0a4b4]">
                    {formatTime(encounter.scheduledStart)}
                  </span>
                  <span className="truncate text-[13px] font-semibold text-[#f4f4f5]">
                    {encounter.patientName}
                  </span>
                </div>
                {height >= SLOT_HEIGHT && (
                  <div className="mt-0.5 flex items-center gap-2">
                    {encounter.visitType && (
                      <span className="text-[11px] text-[#6b7280]">{encounter.visitType}</span>
                    )}
                    {encounter.payerName && <PayerTag payer={encounter.payerName} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current time indicator */}
        {nowIndicator !== null && (
          <div
            className="absolute left-14 right-0 z-10 flex items-center"
            style={{ top: nowIndicator }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <div className="h-[2px] flex-1 bg-[#ef4444]" />
          </div>
        )}
      </div>
    </div>
  );
}
