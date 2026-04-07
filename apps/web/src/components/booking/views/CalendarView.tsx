'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { BookingSlot } from '../../../lib/booking/types';

interface CalendarViewProps {
  slug: string;
  onSelect: (slot: BookingSlot, setting: string, visitType: string) => void;
  onBack: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // Pad leading nulls for days before the 1st
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  // Fill in the days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

export function CalendarView({ slug, onSelect, onBack }: CalendarViewProps) {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [setting, setSetting] = useState('');
  const [visitType, setVisitType] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendar navigation
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = useMemo(() => toDateStr(today), [today]);

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await fetch(`/api/booking/${slug}/availability`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load availability');
          return;
        }
        const data = await res.json();
        setSlots(data.slots || []);
        setSetting(data.setting || '');
        setVisitType(data.visitType || '');

        // Auto-select first available date
        if (data.slots?.length > 0) {
          setSelectedDate(data.slots[0].date);
        }
      } catch {
        setError('Failed to load availability');
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, [slug]);

  // Set of dates that have available slots
  const availableDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) {
      set.add(slot.date);
    }
    return set;
  }, [slots]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, BookingSlot[]> = {};
    for (const slot of slots) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [slots]);

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const timeSlotsForDate = selectedDate ? slotsByDate[selectedDate] || [] : [];

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // Don't allow navigating before current month
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--book-error)] text-lg">{error}</p>
        <button onClick={onBack} className="mt-4 text-[var(--book-accent)] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--book-text-muted)]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--book-accent)] border-r-transparent mb-4" />
        <p className="text-lg">Loading available times...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="text-[var(--book-accent)] hover:underline mb-6 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-3xl font-light mb-1">Select Your Appointment Time</h2>
      <p className="text-lg text-[var(--book-text-muted)] mb-8">
        {visitType} &middot; {setting} &middot; 60 minutes
      </p>

      {/* Two-column layout: Calendar + Time Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Month Calendar */}
        <div className="bg-[var(--book-surface)] border border-[var(--book-border)] rounded-2xl p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-medium">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs font-medium text-[var(--book-text-muted)] py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const dateStr = toDateStr(day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasSlots = availableDateSet.has(dateStr);
              const isPast = dateStr < todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => hasSlots ? setSelectedDate(dateStr) : undefined}
                  disabled={!hasSlots || isPast}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--book-accent)] text-white'
                      : isToday && hasSlots
                      ? 'bg-[#2C5F6F] text-white'
                      : hasSlots
                      ? 'hover:bg-stone-100 text-[var(--book-text)] cursor-pointer'
                      : isPast
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'text-stone-300 cursor-not-allowed'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--book-border)]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--book-accent)]" />
              <span className="text-xs text-[var(--book-text-muted)]">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#2C5F6F]" />
              <span className="text-xs text-[var(--book-text-muted)]">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone-200" />
              <span className="text-xs text-[var(--book-text-muted)]">Unavailable</span>
            </div>
          </div>
        </div>

        {/* Right: Time Slots */}
        <div className="bg-[var(--book-surface)] border border-[var(--book-border)] rounded-2xl p-6">
          {selectedDate ? (
            <>
              <h3 className="text-lg font-medium mb-1">Available Times</h3>
              <p className="text-sm text-[var(--book-text-muted)] mb-5">
                {formatFullDate(selectedDate)}
              </p>

              {timeSlotsForDate.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {timeSlotsForDate.map((slot) => (
                    <button
                      key={`${slot.date}-${slot.time}`}
                      onClick={() => onSelect(slot, setting, visitType)}
                      className="py-3.5 px-4 rounded-xl border border-[var(--book-border)] bg-stone-50 text-[var(--book-text)] font-medium hover:border-[var(--book-accent)] hover:bg-[var(--book-accent)] hover:text-white transition-all duration-200"
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[var(--book-text-muted)]">
                    No available times for this date.
                  </p>
                  <p className="text-sm text-[var(--book-text-muted)] mt-1">
                    Please try another day.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <svg className="w-12 h-12 mx-auto text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[var(--book-text-muted)] text-lg">
                Select a date to see available times
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
