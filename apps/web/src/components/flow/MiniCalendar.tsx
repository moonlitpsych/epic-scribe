'use client';

import { useMemo } from 'react';

interface MiniCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  /** The month being viewed (YYYY-MM-DD, day ignored) */
  viewMonth?: string;
  onChangeMonth?: (month: string) => void;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MiniCalendar({
  selectedDate,
  onSelectDate,
  viewMonth,
  onChangeMonth,
}: MiniCalendarProps) {
  const today = toDateStr(new Date());

  // Month being displayed
  const monthDate = viewMonth ? new Date(viewMonth + 'T12:00:00') : new Date(selectedDate + 'T12:00:00');
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = [];
    // Fill leading blanks
    for (let i = 0; i < startOffset; i++) cells.push(null);
    // Fill days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
    // Fill trailing blanks to complete last week
    while (cells.length % 7 !== 0) cells.push(null);

    // Chunk into weeks
    const w: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [year, month]);

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    const str = toDateStr(d);
    onChangeMonth?.(str);
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    const str = toDateStr(d);
    onChangeMonth?.(str);
  }

  return (
    <div className="w-full select-none">
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          className="flex h-6 w-6 items-center justify-center rounded text-[11px] text-[#6b7280] hover:bg-white/[0.06] hover:text-[#d1d5db]"
        >
          ◀
        </button>
        <span className="text-[11px] font-semibold text-[#d1d5db]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="flex h-6 w-6 items-center justify-center rounded text-[11px] text-[#6b7280] hover:bg-white/[0.06] hover:text-[#d1d5db]"
        >
          ▶
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="py-1 text-center text-[10px] font-medium text-[#4b5563]">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0">
          {week.map((dateStr, di) => {
            if (!dateStr) {
              return <div key={di} className="h-6" />;
            }
            const dayNum = parseInt(dateStr.split('-')[2]);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={di}
                onClick={() => onSelectDate(dateStr)}
                className={`flex h-6 w-full items-center justify-center rounded-sm text-[11px] transition-colors ${
                  isSelected
                    ? 'bg-[var(--flow-accent)] font-bold text-[#0a0b0f]'
                    : isToday
                      ? 'font-semibold text-[var(--flow-accent-light)]'
                      : 'text-[#9ca3af] hover:bg-white/[0.06]'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
