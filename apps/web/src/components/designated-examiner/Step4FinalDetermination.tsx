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
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-2">
          Step 4: Final Determination
        </h2>
        <p className="text-[#5A6B7D]">
          Based on all evidence including the patient interview, the AI has generated its final
          commitment recommendation.
        </p>
      </div>

      {/* Main Recommendation Banner */}
      <div
        className={`p-6 rounded-xl border-2 ${
          isCommit
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              isCommit ? 'bg-amber-100' : 'bg-green-100'
            }`}
          >
            {isCommit ? (
              <Scale className="text-amber-600" size={32} />
            ) : (
              <CheckCircle2 className="text-green-600" size={32} />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`text-2xl font-bold ${
                isCommit ? 'text-amber-900' : 'text-green-900'
              }`}
            >
              {isCommit ? 'RECOMMEND COMMITMENT' : 'DO NOT RECOMMEND COMMITMENT'}
            </h3>
            {isCommit && finalAnalysis.commitment_length && (
              <p className="text-lg text-amber-700 mt-1">
                Recommended length: {finalAnalysis.commitment_length}
              </p>
            )}
            <p className="text-gray-700 mt-2">{finalAnalysis.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Criteria Summary */}
      <div
        className={`p-4 rounded-lg ${
          metCount === 5
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {metCount === 5 ? (
            <CheckCircle2 className="text-green-600" size={20} />
          ) : (
            <XCircle className="text-amber-600" size={20} />
          )}
          <span className="font-medium text-gray-900">
            {metCount} of 5 criteria met
          </span>
          {metCount < 5 && (
            <span className="text-sm text-amber-700">
              — Utah law requires all 5 criteria for involuntary commitment
            </span>
          )}
        </div>
      </div>

      {/* Final Criteria Assessment */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">
          Final Criteria Assessment
        </h3>
        <p className="text-sm text-[#5A6B7D] mb-4">
          This assessment incorporates evidence from documentation AND patient interview responses.
        </p>
        <CriteriaGrid criteria={finalAnalysis.criteria} />
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
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
