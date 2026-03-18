'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import type { WorkflowStep } from '@/types/designated-examiner';
import { WORKFLOW_STEP_LABELS } from '@/types/designated-examiner';

interface StepProgressBarProps {
  currentStep: WorkflowStep;
  isProcessing?: boolean;
}

export function StepProgressBar({ currentStep, isProcessing = false }: StepProgressBarProps) {
  const steps: WorkflowStep[] = [1, 2, 3, 4, 5];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isUpcoming = step > currentStep;

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step circle and label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${isCompleted ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-inverse)]' : ''}
                    ${isCurrent ? 'bg-[var(--accent-warm)] border-[var(--accent-warm)] text-[var(--text-inverse)]' : ''}
                    ${isUpcoming ? 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-muted)]' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : isCurrent && isProcessing ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCompleted ? 'text-[var(--success-text)]' : ''}
                    ${isCurrent ? 'text-[var(--text-primary)]' : ''}
                    ${isUpcoming ? 'text-[var(--text-muted)]' : ''}
                  `}
                >
                  {WORKFLOW_STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-all
                    ${step < currentStep ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
