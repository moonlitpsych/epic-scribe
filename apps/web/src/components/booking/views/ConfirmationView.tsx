'use client';

import { BookingConfirmation } from '../../../lib/booking/types';

interface ConfirmationViewProps {
  confirmation: BookingConfirmation;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function ConfirmationView({ confirmation }: ConfirmationViewProps) {
  return (
    <div className="text-center py-6">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-[var(--book-accent)]/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[var(--book-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-medium mb-2">Request submitted!</h2>
      <p className="text-[var(--book-text-secondary)] mb-8">
        Your appointment request has been sent to your provider for confirmation.
      </p>

      <div className="bg-[var(--book-surface)] border border-[var(--book-border)] rounded-lg p-6 text-left max-w-md mx-auto">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Appointment</p>
            <p className="font-medium">{formatDate(confirmation.appointmentDate)}</p>
            <p className="text-[var(--book-text-secondary)]">{formatTime(confirmation.appointmentTime)}</p>
          </div>

          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Details</p>
            <p className="font-medium">{confirmation.visitType} &middot; {confirmation.duration} min</p>
            <p className="text-sm text-[var(--book-text-secondary)]">{confirmation.setting}</p>
          </div>

          {confirmation.meetLink && (
            <div>
              <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Telehealth Link</p>
              <a
                href={confirmation.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--book-accent)] hover:underline font-medium break-all"
              >
                {confirmation.meetLink}
              </a>
              <p className="text-xs text-[var(--book-text-muted)] mt-1">
                Save this link — you&apos;ll use it to join your appointment.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-2 text-sm text-[var(--book-text-muted)]">
        <p>Your provider will review your request and confirm or suggest an alternative time.</p>
        <p>You&apos;ll receive an email once your appointment is confirmed.</p>
        <p>If you need to make changes, please call the office.</p>
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--book-border)]">
        <p className="text-sm font-medium">Moonlit Psychiatry</p>
        <p className="text-sm text-[var(--book-text-muted)]">Salt Lake City, UT</p>
      </div>
    </div>
  );
}
