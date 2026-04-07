'use client';

import { useState, FormEvent } from 'react';
import { PatientBookingInfo } from '../../../lib/booking/types';

interface PatientInfoViewProps {
  onSubmit: (info: PatientBookingInfo) => void;
  onBack: () => void;
  initialData: PatientBookingInfo | null;
}

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function PatientInfoView({ onSubmit, onBack, initialData }: PatientInfoViewProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [memberId, setMemberId] = useState(initialData?.memberId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Phone must be at least 10 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      email: email.trim(),
      phone: phone.replace(/\D/g, ''),
      memberId: memberId.trim() || undefined,
    });
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg border bg-[var(--book-surface)] text-[var(--book-text)] placeholder:text-[var(--book-text-muted)] focus:outline-none focus:ring-1 ${
      errors[field]
        ? 'border-[var(--book-error)] focus:border-[var(--book-error)] focus:ring-[var(--book-error)]'
        : 'border-[var(--book-border)] focus:border-[var(--book-border-focus)] focus:ring-[var(--book-border-focus)]'
    }`;

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-[var(--book-accent)] hover:underline mb-4 inline-block"
      >
        &larr; Back
      </button>

      <h2 className="text-xl font-medium mb-1">Your information</h2>
      <p className="text-sm text-[var(--book-text-muted)] mb-6">
        Please provide your details to complete the booking.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass('firstName')}
              placeholder="Jane"
            />
            {errors.firstName && <p className="text-xs text-[var(--book-error)] mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass('lastName')}
              placeholder="Doe"
            />
            {errors.lastName && <p className="text-xs text-[var(--book-error)] mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date of Birth *</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass('dateOfBirth')}
          />
          {errors.dateOfBirth && <p className="text-xs text-[var(--book-error)] mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass('email')}
            placeholder="jane@example.com"
          />
          {errors.email && <p className="text-xs text-[var(--book-error)] mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <input
            type="tel"
            value={formatPhoneDisplay(phone)}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className={inputClass('phone')}
            placeholder="(801) 555-0123"
          />
          {errors.phone && <p className="text-xs text-[var(--book-error)] mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Insurance Member ID</label>
          <input
            type="text"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className={inputClass('memberId')}
            placeholder="Optional"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-[var(--book-accent)] text-white font-medium hover:bg-[var(--book-accent-hover)] transition-colors mt-2"
        >
          Continue to Review
        </button>
      </form>
    </div>
  );
}
