'use client';

import { useState } from 'react';
import { BookingSlot, PatientBookingInfo, BookingConfirmation } from '../../../lib/booking/types';

interface ReviewViewProps {
  slug: string;
  slot: BookingSlot;
  patient: PatientBookingInfo;
  payer: { id: string; name: string };
  setting: string;
  visitType: string;
  onConfirmed: (confirmation: BookingConfirmation) => void;
  onBack: () => void;
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

export function ReviewView({ slug, slot, patient, payer, setting, visitType, onConfirmed, onBack }: ReviewViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          patient,
          payerId: payer.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to book appointment');
        return;
      }

      onConfirmed(data as BookingConfirmation);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-[var(--book-accent)] hover:underline mb-4 inline-block"
        disabled={submitting}
      >
        &larr; Back
      </button>

      <h2 className="text-xl font-medium mb-1">Review your appointment request</h2>
      <p className="text-sm text-[var(--book-text-muted)] mb-6">
        Please review the details below. Your provider will confirm the appointment.
      </p>

      <div className="bg-[var(--book-surface)] border border-[var(--book-border)] rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Date</p>
            <p className="font-medium mt-0.5">{formatDate(slot.date)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Time</p>
            <p className="font-medium mt-0.5">{formatTime(slot.time)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Visit Type</p>
            <p className="font-medium mt-0.5">{visitType}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Duration</p>
            <p className="font-medium mt-0.5">{slot.durationMinutes} minutes</p>
          </div>
        </div>

        <hr className="border-[var(--book-border)]" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Patient</p>
            <p className="font-medium mt-0.5">{patient.firstName} {patient.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Date of Birth</p>
            <p className="font-medium mt-0.5">{patient.dateOfBirth}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Email</p>
            <p className="font-medium mt-0.5 break-all">{patient.email}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Phone</p>
            <p className="font-medium mt-0.5">{patient.phone}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[var(--book-text-muted)] uppercase tracking-wide">Insurance</p>
          <p className="font-medium mt-0.5">{payer.name}</p>
          {patient.memberId && (
            <p className="text-sm text-[var(--book-text-secondary)]">Member ID: {patient.memberId}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-[var(--book-error)]">
          {error}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-[var(--book-accent)] text-white font-medium hover:bg-[var(--book-accent-hover)] transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Request Appointment'}
      </button>

      <p className="text-xs text-[var(--book-text-muted)] text-center mt-3">
        Your provider will review and confirm your appointment. A Google Meet link will be provided for your telehealth visit.
      </p>
    </div>
  );
}
