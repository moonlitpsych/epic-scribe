'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PendingBooking } from '@/lib/flow/hooks/usePendingBookings';
import PayerTag from './PayerTag';

interface PendingBookingCardProps {
  booking: PendingBooking;
  index: number;
  onAction: () => void;
}

export default function PendingBookingCard({ booking, index, onAction }: PendingBookingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'confirm' | 'decline' | null>(null);

  const startTime = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const dateStr = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const durationMin = booking.scheduledStart && booking.scheduledEnd
    ? Math.round(
        (new Date(booking.scheduledEnd).getTime() - new Date(booking.scheduledStart).getTime()) / 60000
      )
    : undefined;

  async function handleAction(action: 'confirm' | 'decline') {
    setLoading(action);
    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterId: booking.id, action }),
      });
      if (res.ok) {
        onAction();
        // After confirming, navigate to the appointment's date
        if (action === 'confirm' && booking.scheduledStart) {
          const dateStr = booking.scheduledStart.split('T')[0];
          router.push(`/flow?view=day&date=${dateStr}`);
        }
      }
    } catch (err) {
      console.error('[PendingBookingCard] Action failed:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="flex items-center gap-4 rounded-[10px] px-4 py-3.5"
      style={{
        background: 'rgba(59,130,246,0.06)',
        borderLeft: '3px solid #3b82f6',
        animation: 'flow-slideUp 0.35s ease both',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Time column */}
      <div className="flex w-14 shrink-0 flex-col items-end gap-0.5">
        <span className="text-[13px] font-medium text-[#d1d5db] tabular-nums">{startTime}</span>
        <span className="text-[11px] text-[#4b5563]">{dateStr}</span>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2.5">
          <span className="text-sm font-semibold text-[#f4f4f5]">{booking.patientName}</span>
          {booking.visitType && (
            <span className="text-[11px] font-medium text-[#6b7280]">{booking.visitType}</span>
          )}
          {booking.payerName && <PayerTag payer={booking.payerName} />}
        </div>
        {booking.setting && (
          <div className="text-xs text-[#6b7280]">{booking.setting}{durationMin ? ` · ${durationMin}m` : ''}</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => handleAction('decline')}
          disabled={loading !== null}
          className="rounded-[7px] border border-[#dc2626]/20 px-3 py-1.5 text-xs font-medium text-[#ef4444] transition-colors hover:bg-[#dc2626]/10 disabled:opacity-50"
        >
          {loading === 'decline' ? '...' : 'Decline'}
        </button>
        <button
          onClick={() => handleAction('confirm')}
          disabled={loading !== null}
          className="rounded-[7px] bg-[#10b981] px-3.5 py-1.5 text-xs font-bold text-[#022c22] transition-colors hover:bg-[#059669] disabled:opacity-50"
        >
          {loading === 'confirm' ? '...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
