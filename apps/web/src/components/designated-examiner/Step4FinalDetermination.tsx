'use client';

import { CheckCircle2, XCircle, Scale } from 'lucide-react';
import { CriteriaGrid } from './CriterionStatusCard';
import type { FinalAnalysis } from '@/types/designated-examiner';

interface Step4Props {
  finalAnalysis: FinalAnalysis;
  onContinue: () => void;
  isLoading?: boolean;
}

export function Step4FinalDetermination({
  finalAnalysis,
  onContinue,
  isLoading = false,
}: Step4Props) {
  const isCommit = finalAnalysis.overall_recommendation === 'commit';

  // Count how many criteria are met
  const metCount = (Object.values(finalAnalysis.criteria) as Array<{ status: string }>).filter(
    (c) => c.status === 'meets'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading text-[var(--text-primary)] mb-2">
          Step 4: Final Determination
        </h2>
        <p className="text-[var(--text-secondary)]">
          Based on all evidence including the patient interview, the AI has generated its final
          commitment recommendation.
        </p>
      </div>

      {/* Main Recommendation Banner */}
      <div
        className={`p-6 rounded-[2px] border-2 ${
          isCommit
            ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]'
            : 'bg-[var(--success-bg)] border-[var(--success-border)]'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              isCommit ? 'bg-[var(--warning-bg)]' : 'bg-[var(--success-bg)]'
            }`}
          >
            {isCommit ? (
              <Scale className="text-[var(--warning-text)]" size={32} />
            ) : (
              <CheckCircle2 className="text-[var(--success-text)]" size={32} />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`text-2xl font-bold ${
                isCommit ? 'text-[var(--warning-text)]' : 'text-[var(--success-text)]'
              }`}
            >
              {isCommit ? 'RECOMMEND COMMITMENT' : 'DO NOT RECOMMEND COMMITMENT'}
            </h3>
            {isCommit && finalAnalysis.commitment_length && (
              <p className="text-lg text-[var(--warning-text)] mt-1">
                Recommended length: {finalAnalysis.commitment_length}
              </p>
            )}
            <p className="text-[var(--text-primary)] mt-2">{finalAnalysis.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Criteria Summary */}
      <div
        className={`p-4 rounded-[2px] ${
          metCount === 5
            ? 'bg-[var(--success-bg)] border border-[var(--success-border)]'
            : 'bg-[var(--warning-bg)] border border-[var(--warning-border)]'
        }`}
      >
        <div className="flex items-center gap-2">
          {metCount === 5 ? (
            <CheckCircle2 className="text-[var(--success-text)]" size={20} />
          ) : (
            <XCircle className="text-[var(--warning-text)]" size={20} />
          )}
          <span className="font-medium text-[var(--text-primary)]">
            {metCount} of 5 criteria met
          </span>
          {metCount < 5 && (
            <span className="text-sm text-[var(--warning-text)]">
              — Utah law requires all 5 criteria for involuntary commitment
            </span>
          )}
        </div>
      </div>

      {/* Final Criteria Assessment */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Final Criteria Assessment
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This assessment incorporates evidence from documentation AND patient interview responses.
        </p>
        <CriteriaGrid criteria={finalAnalysis.criteria} />
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            Loading...
          </>
        ) : (
          <>
            View Court Testimony
            <span className="text-sm opacity-75">→</span>
          </>
        )}
      </button>
    </div>
  );
}
