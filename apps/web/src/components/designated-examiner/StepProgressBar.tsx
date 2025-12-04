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
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-[#E89C8A] border-[#E89C8A] text-white' : ''}
                    ${isUpcoming ? 'bg-white border-gray-300 text-gray-400' : ''}
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
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isCurrent ? 'text-[#0A1F3D]' : ''}
                    ${isUpcoming ? 'text-gray-400' : ''}
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
                    ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}
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
