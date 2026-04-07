'use client';

import { useState } from 'react';
import { BookingSlot, PatientBookingInfo, BookingConfirmation } from '../../lib/booking/types';
import { PayerSearchView } from './views/PayerSearchView';
import { CalendarView } from './views/CalendarView';
import { PatientInfoView } from './views/PatientInfoView';
import { ReviewView } from './views/ReviewView';
import { ConfirmationView } from './views/ConfirmationView';

type Step = 'payer' | 'calendar' | 'info' | 'review' | 'confirmed';

const STEPS: Step[] = ['payer', 'calendar', 'info', 'review', 'confirmed'];
const STEP_LABELS: Record<Step, string> = {
  payer: 'Insurance',
  calendar: 'Date & Time',
  info: 'Your Info',
  review: 'Review',
  confirmed: 'Confirmed',
};

interface BookingFlowProps {
  slug: string;
}

export function BookingFlow({ slug }: BookingFlowProps) {
  const [step, setStep] = useState<Step>('payer');
  const [selectedPayer, setSelectedPayer] = useState<{ id: string; name: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientBookingInfo | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [setting, setSetting] = useState('');
  const [visitType, setVisitType] = useState('');

  const currentIndex = STEPS.indexOf(step);

  function goBack() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  }

  function handlePayerSelect(payer: { id: string; name: string }) {
    setSelectedPayer(payer);
    setStep('calendar');
  }

  function handleSlotSelect(slot: BookingSlot, s: string, vt: string) {
    setSelectedSlot(slot);
    setSetting(s);
    setVisitType(vt);
    setStep('info');
  }

  function handlePatientInfoSubmit(info: PatientBookingInfo) {
    setPatientInfo(info);
    setStep('review');
  }

  function handleConfirmed(conf: BookingConfirmation) {
    setConfirmation(conf);
    setStep('confirmed');
  }

  return (
    <div className="book-shell min-h-screen bg-[var(--book-bg)] text-[var(--book-text)] font-book">
      {/* Header */}
      <header className="border-b border-[var(--book-border)] bg-[var(--book-surface)]">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-light tracking-tight">Moonlit Psychiatry</h1>
          <p className="text-[var(--book-text-muted)] mt-1">New Patient Intake Appointment</p>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.filter((s) => s !== 'confirmed').map((s, i) => {
            const idx = STEPS.indexOf(s);
            const isActive = idx === currentIndex;
            const isComplete = idx < currentIndex;
            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    isComplete
                      ? 'bg-[var(--book-accent)]'
                      : isActive
                      ? 'bg-[var(--book-accent)] opacity-60'
                      : 'bg-[var(--book-border)]'
                  }`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.filter((s) => s !== 'confirmed').map((s) => {
            const idx = STEPS.indexOf(s);
            const isActive = idx === currentIndex;
            return (
              <span
                key={s}
                className={`text-xs ${
                  isActive ? 'text-[var(--book-accent)] font-medium' : 'text-[var(--book-text-muted)]'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {step === 'payer' && (
          <PayerSearchView slug={slug} onSelect={handlePayerSelect} />
        )}
        {step === 'calendar' && (
          <CalendarView slug={slug} onSelect={handleSlotSelect} onBack={goBack} />
        )}
        {step === 'info' && (
          <PatientInfoView onSubmit={handlePatientInfoSubmit} onBack={goBack} initialData={patientInfo} />
        )}
        {step === 'review' && selectedSlot && patientInfo && selectedPayer && (
          <ReviewView
            slug={slug}
            slot={selectedSlot}
            patient={patientInfo}
            payer={selectedPayer}
            setting={setting}
            visitType={visitType}
            onConfirmed={handleConfirmed}
            onBack={goBack}
          />
        )}
        {step === 'confirmed' && confirmation && (
          <ConfirmationView confirmation={confirmation} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--book-border)] mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-[var(--book-text-muted)]">
          Moonlit Psychiatry &middot; Salt Lake City, UT
        </div>
      </footer>
    </div>
  );
}
