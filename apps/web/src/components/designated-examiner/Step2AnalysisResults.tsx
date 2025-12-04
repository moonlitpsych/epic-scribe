'use client';

import { AlertTriangle, MessageCircleQuestion } from 'lucide-react';
import { CriteriaGrid } from './CriterionStatusCard';
import type { InitialAnalysis, ClarifyingQuestion } from '@/types/designated-examiner';

interface Step2Props {
  analysis: InitialAnalysis;
  questions: ClarifyingQuestion[];
  onContinue: () => void;
  isLoading?: boolean;
}

export function Step2AnalysisResults({
  analysis,
  questions,
  onContinue,
  isLoading = false,
}: Step2Props) {
  // Count criteria statuses
  const statusCounts = {
    meets: 0,
    does_not_meet: 0,
    unclear: 0,
  };

  (Object.values(analysis.criteria) as Array<{ status: 'meets' | 'does_not_meet' | 'unclear' }>).forEach((criterion) => {
    statusCounts[criterion.status]++;
  });

  const anyUnclear = statusCounts.unclear > 0;

  // Group questions by priority
  const highPriorityQuestions = questions.filter((q) => q.priority === 'high');
  const mediumPriorityQuestions = questions.filter((q) => q.priority === 'medium');
  const lowPriorityQuestions = questions.filter((q) => q.priority === 'low');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-2">
          Step 2: AI Analysis Complete
        </h2>
        <p className="text-[#5A6B7D]">
          The AI has analyzed the documentation against Utah&apos;s 5 commitment criteria.
          Review the assessment below, then proceed to interview the patient with the clarifying questions.
        </p>
      </div>

      {/* Summary Banner */}
      <div
        className={`p-4 rounded-lg border-2 ${
          statusCounts.meets === 5
            ? 'bg-green-50 border-green-500'
            : anyUnclear
            ? 'bg-amber-50 border-amber-500'
            : 'bg-red-50 border-red-500'
        }`}
      >
        <div className="flex items-center gap-3">
          {anyUnclear && <AlertTriangle className="text-amber-600" size={24} />}
          <div>
            <p className="font-semibold text-gray-900">
              {statusCounts.meets === 5
                ? 'All 5 criteria appear to be met based on documentation'
                : anyUnclear
                ? `${statusCounts.unclear} criterion/criteria need clarification from patient interview`
                : `${statusCounts.does_not_meet} criterion/criteria not met — commitment may not be appropriate`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Meets: {statusCounts.meets} | Does Not Meet: {statusCounts.does_not_meet} | Unclear:{' '}
              {statusCounts.unclear}
            </p>
          </div>
        </div>
      </div>

      {/* Criteria Assessment */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">
          Criteria Assessment
        </h3>
        <CriteriaGrid criteria={analysis.criteria} />
      </div>

      {/* Preliminary Recommendation */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-2">
          Preliminary Recommendation
        </h3>
        <p className="text-sm text-[#5A6B7D] mb-4">
          This is a preliminary recommendation based on the documentation. The final recommendation
          will be made after the patient interview.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">
            {analysis.preliminary_recommendation}
          </p>
        </div>
      </div>

      {/* Clarifying Questions */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircleQuestion className="text-[#E89C8A]" size={24} />
          <h3 className="text-lg font-semibold text-[#0A1F3D]">
            Clarifying Questions for Patient Interview
          </h3>
        </div>
        <p className="text-sm text-[#5A6B7D] mb-4">
          Ask these questions directly to the patient. High priority questions address the most
          ambiguous or critical criteria.
        </p>

        {/* High Priority */}
        {highPriorityQuestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">
              High Priority ({highPriorityQuestions.length})
            </h4>
            <div className="space-y-3">
              {highPriorityQuestions.map((q, i) => (
                <QuestionPreview key={q.id} question={q} index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority */}
        {mediumPriorityQuestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
              Medium Priority ({mediumPriorityQuestions.length})
            </h4>
            <div className="space-y-3">
              {mediumPriorityQuestions.map((q, i) => (
                <QuestionPreview
                  key={q.id}
                  question={q}
                  index={highPriorityQuestions.length + i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Low Priority */}
        {lowPriorityQuestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Low Priority ({lowPriorityQuestions.length})
            </h4>
            <div className="space-y-3">
              {lowPriorityQuestions.map((q, i) => (
                <QuestionPreview
                  key={q.id}
                  question={q}
                  index={
                    highPriorityQuestions.length + mediumPriorityQuestions.length + i + 1
                  }
                />
              ))}
            </div>
          </div>
        )}
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
            Continue to Patient Interview
            <span className="text-sm opacity-75">→</span>
          </>
        )}
      </button>
    </div>
  );
}

interface QuestionPreviewProps {
  question: ClarifyingQuestion;
  index: number;
}

function QuestionPreview({ question, index }: QuestionPreviewProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 bg-[#E89C8A] text-white rounded-full flex items-center justify-center text-sm font-medium">
          {index}
        </span>
        <div className="flex-1">
          <p className="text-gray-900 font-medium">{question.question}</p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
              Criterion {question.criterion}
            </span>
            <span className="ml-2">{question.context}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
