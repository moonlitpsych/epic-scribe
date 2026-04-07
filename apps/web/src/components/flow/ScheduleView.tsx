'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEncounterRange } from '@/lib/flow/hooks/useEncounterRange';
import { usePendingBookings } from '@/lib/flow/hooks/usePendingBookings';
import PendingBookingCard from './PendingBookingCard';
import EncounterDetailModal from './EncounterDetailModal';
import ScheduleDayView from './schedule/ScheduleDayView';
import ScheduleWeekView from './schedule/ScheduleWeekView';
import ScheduleMonthView from './schedule/ScheduleMonthView';
import type { TodayEncounter } from '@/lib/flow/types';

type ViewMode = 'day' | 'week' | 'month';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Get Monday of the week containing the given date */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

/** Get Sunday of the week containing the given date */
function getWeekEnd(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

/** Get first day of the month */
function getMonthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

/** Get last day of the month */
function getMonthEnd(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(lastDay)}`;
}

/** Update URL search params without triggering React navigation */
function syncUrlParams(date: string, view: ViewMode) {
  const params = new URLSearchParams();
  params.set('view', view);
  params.set('date', date);
  window.history.replaceState(null, '', `/flow?${params.toString()}`);
}

export default function ScheduleView() {
  const searchParams = useSearchParams();

  const todayStr = toDateStr(new Date());

  // Initialize from URL, then manage as local state
  const [view, setView] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'day'
  );
  const [date, setDate] = useState(
    searchParams.get('date') || todayStr
  );

  const [selectedEncounter, setSelectedEncounter] = useState<TodayEncounter | null>(null);

  // Listen for sidebar navigation events (MiniCalendar)
  useEffect(() => {
    function handleFlowNavigate(e: Event) {
      const { date: newDate, view: newView } = (e as CustomEvent).detail;
      if (newDate) setDate(newDate);
      if (newView) setView(newView as ViewMode);
    }
    window.addEventListener('flow-navigate', handleFlowNavigate);
    return () => window.removeEventListener('flow-navigate', handleFlowNavigate);
  }, []);

  // Compute range based on view mode
  const { start, end } = useMemo(() => {
    switch (view) {
      case 'week':
        return { start: getWeekStart(date), end: getWeekEnd(date) };
      case 'month':
        return { start: getMonthStart(date), end: getMonthEnd(date) };
      case 'day':
      default:
        return { start: date, end: date };
    }
  }, [view, date]);

  const { encounters, isLoading, error, refresh } = useEncounterRange(start, end);
  const { pendingBookings, refresh: refreshPending } = usePendingBookings();

  function navigate(newDate: string, newView?: ViewMode) {
    const v = newView || view;
    setDate(newDate);
    if (newView) setView(v);
    syncUrlParams(newDate, v);
  }

  function handlePrev() {
    const d = new Date(date + 'T12:00:00');
    switch (view) {
      case 'day':
        d.setDate(d.getDate() - 1);
        break;
      case 'week':
        d.setDate(d.getDate() - 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() - 1);
        break;
    }
    navigate(toDateStr(d));
  }

  function handleNext() {
    const d = new Date(date + 'T12:00:00');
    switch (view) {
      case 'day':
        d.setDate(d.getDate() + 1);
        break;
      case 'week':
        d.setDate(d.getDate() + 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() + 1);
        break;
    }
    navigate(toDateStr(d));
  }

  function handleToday() {
    navigate(todayStr);
  }

  function handleViewChange(newView: ViewMode) {
    navigate(date, newView);
  }

  function handlePendingAction() {
    refreshPending();
    refresh();
  }

  const handleSelectEncounter = useCallback((e: TodayEncounter) => {
    setSelectedEncounter(e);
  }, []);

  const handleNavigateToDay = useCallback((d: string) => {
    navigate(d, 'day');
  }, [view]);

  // Header date label
  const headerLabel = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    switch (view) {
      case 'day':
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
      case 'week': {
        const ws = new Date(getWeekStart(date) + 'T12:00:00');
        const we = new Date(getWeekEnd(date) + 'T12:00:00');
        const sameMonth = ws.getMonth() === we.getMonth();
        if (sameMonth) {
          return `${ws.toLocaleDateString('en-US', { month: 'long' })} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`;
        }
        return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }, [view, date]);

  // Status summary
  const signedCount = encounters.filter((e) => e.status === 'signed').length;
  const inProgressCount = encounters.filter((e) =>
    ['in-visit', 'note-pending', 'note-ready'].includes(e.status)
  ).length;

  const viewLabels: Record<ViewMode, string> = { day: 'Day', week: 'Week', month: 'Month' };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-[#1e2130] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Prev / Next */}
            <button
              onClick={handlePrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] text-[#6b7280] hover:bg-white/[0.06] hover:text-[#d1d5db]"
            >
              ◀
            </button>
            <button
              onClick={handleNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] text-[#6b7280] hover:bg-white/[0.06] hover:text-[#d1d5db]"
            >
              ▶
            </button>

            <h1 className="font-flow-heading text-[22px] font-normal tracking-tight text-[#f4f4f5]">
              {headerLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Today button */}
            <button
              onClick={handleToday}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-[#9ca3af] hover:bg-white/[0.04] hover:text-[#d1d5db]"
            >
              Today
            </button>

            {/* View dropdown */}
            <div className="relative">
              <select
                value={view}
                onChange={(e) => handleViewChange(e.target.value as ViewMode)}
                className="appearance-none rounded-lg border border-white/10 bg-transparent px-3 py-1.5 pr-7 text-[12px] font-medium text-[#9ca3af] outline-none hover:bg-white/[0.04] hover:text-[#d1d5db]"
              >
                {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
                  <option key={v} value={v} className="bg-[#141720] text-[#e8eaf0]">
                    {viewLabels[v]}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6b7280]">
                ▼
              </span>
            </div>

            {/* Classic view link */}
            <Link
              href="/flow/classic"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-[#9ca3af] hover:bg-white/[0.04] hover:text-[#d1d5db]"
            >
              Classic
            </Link>
          </div>
        </div>

        {/* Status line */}
        <p className="mt-1 text-[12px] text-[#4b5563]">
          {isLoading
            ? 'Loading schedule...'
            : `${encounters.length} encounters · ${signedCount} signed · ${
                inProgressCount > 0 ? `${inProgressCount} in progress` : 'none in progress'
              }`}
        </p>
      </header>

      {/* Pending requests */}
      {pendingBookings.length > 0 && (
        <section className="shrink-0 border-b border-[#1e2130] px-6 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#3b82f6]">Pending Requests</span>
            <span
              className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
              style={{ background: '#3b82f6' }}
            >
              {pendingBookings.length}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {pendingBookings.map((booking, i) => (
              <PendingBookingCard
                key={booking.id}
                booking={booking}
                index={i}
                onAction={handlePendingAction}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-1 px-6 py-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-[10px] bg-white/[0.02]"
                style={{
                  animation: 'flow-pulse 2s infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="text-2xl opacity-30">○</div>
            <p className="max-w-xs text-center text-sm text-[#6b7280]">
              {error.includes('401')
                ? 'Session expired. Please sign out and back in to refresh your Google token.'
                : 'Failed to load schedule. Please retry.'}
            </p>
          </div>
        ) : view === 'day' ? (
          <ScheduleDayView
            date={date}
            encounters={encounters}
            onSelectEncounter={handleSelectEncounter}
          />
        ) : view === 'week' ? (
          <ScheduleWeekView
            weekStart={getWeekStart(date)}
            encounters={encounters}
            onSelectEncounter={handleSelectEncounter}
            onNavigateToDay={handleNavigateToDay}
          />
        ) : (
          <ScheduleMonthView
            year={new Date(date + 'T12:00:00').getFullYear()}
            month={new Date(date + 'T12:00:00').getMonth()}
            encounters={encounters}
            onSelectEncounter={handleSelectEncounter}
            onNavigateToDay={handleNavigateToDay}
          />
        )}
      </div>

      {/* Detail modal */}
      {selectedEncounter && (
        <EncounterDetailModal
          encounter={selectedEncounter}
          onClose={() => setSelectedEncounter(null)}
        />
      )}
    </div>
  );
}
