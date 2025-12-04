'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import type { ClarifyingQuestion, InterviewAnswers } from '@/types/designated-examiner';
import { UTAH_CRITERIA } from '@/types/designated-examiner';

interface Step3Props {
  questions: ClarifyingQuestion[];
  initialAnswers?: InterviewAnswers;
  onSaveAnswers: (answers: InterviewAnswers) => Promise<void>;
  onContinue: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function Step3InterviewQuestions({
  questions,
  initialAnswers = {},
  onSaveAnswers,
  onContinue,
  isSaving = false,
  isLoading = false,
}: Step3Props) {
  const [answers, setAnswers] = useState<InterviewAnswers>(initialAnswers);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(answers) !== JSON.stringify(initialAnswers);
    setHasUnsavedChanges(hasChanges);
  }, [answers, initialAnswers]);

  // Group questions by criterion
  const questionsByCriterion: Record<number, ClarifyingQuestion[]> = questions.reduce((acc: Record<number, ClarifyingQuestion[]>, q: ClarifyingQuestion) => {
    if (!acc[q.criterion]) {
      acc[q.criterion] = [];
    }
    acc[q.criterion].push(q);
    return acc;
  }, {} as Record<number, ClarifyingQuestion[]>);

  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
  const allAnswered = answeredCount === questions.length;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev: InterviewAnswers) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = async () => {
    await onSaveAnswers(answers);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  };

  const handleContinue = async () => {
    // Save before continuing if there are unsaved changes
    if (hasUnsavedChanges) {
      await onSaveAnswers(answers);
    }
    onContinue();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-2">
          Step 3: Patient Interview
        </h2>
        <p className="text-[#5A6B7D]">
          Ask the patient the following questions and record their responses verbatim.
          These answers will be incorporated into the final commitment determination.
        </p>
      </div>

      {/* Progress Banner */}
      <div
        className={`p-4 rounded-lg border ${
          allAnswered ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              {answeredCount} of {questions.length} questions answered
            </p>
            {!allAnswered && (
              <p className="text-sm text-amber-700 mt-1">
                Complete all questions for a comprehensive assessment
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasUnsavedChanges
                  ? 'bg-[#E89C8A] text-white hover:bg-[#D88A7A]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Progress' : 'Saved'}
            </button>
          </div>
        </div>
      </div>

      {/* Questions by Criterion */}
      {Object.entries(questionsByCriterion)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([criterion, criterionQuestions]) => {
          const criterionNum = Number(criterion) as 1 | 2 | 3 | 4 | 5;
          const criterionKey = `criterion_${criterionNum}` as keyof typeof UTAH_CRITERIA;
          const criterionInfo = UTAH_CRITERIA[criterionKey];

          return (
            <div
              key={criterion}
              className="bg-white rounded-lg border border-[#C5A882]/20 p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#0A1F3D]">
                  Criterion {criterion}: {criterionInfo.label}
                </h3>
                <p className="text-sm text-gray-500">{criterionInfo.full}</p>
              </div>

              <div className="space-y-6">
                {(criterionQuestions as ClarifyingQuestion[]).map((question: ClarifyingQuestion, index: number) => (
                  <QuestionInput
                    key={question.id}
                    question={question}
                    index={index + 1}
                    value={answers[question.id] || ''}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {/* Warning if not all answered */}
      {!allAnswered && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            You have {questions.length - answeredCount} unanswered question(s). While you can
            proceed, answering all questions will provide a more comprehensive assessment.
          </p>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={isLoading || answeredCount === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            Generating Final Determination...
          </>
        ) : (
          <>
            Generate Final Determination
            <span className="text-sm opacity-75">→</span>
          </>
        )}
      </button>
    </div>
  );
}

interface QuestionInputProps {
  question: ClarifyingQuestion;
  index: number;
  value: string;
  onChange: (value: string) => void;
}

function QuestionInput({ question, index, value, onChange }: QuestionInputProps) {
  const priorityColors: Record<'high' | 'medium' | 'low', string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="border-l-4 border-[#E89C8A] pl-4">
      <div className="flex items-start gap-3 mb-2">
        <span className="flex-shrink-0 w-6 h-6 bg-[#E89C8A] text-white rounded-full flex items-center justify-center text-sm font-medium">
          {index}
        </span>
        <div className="flex-1">
          <p className="text-gray-900 font-medium">{question.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded border ${priorityColors[question.priority]}`}
            >
              {question.priority} priority
            </span>
            <span className="text-xs text-gray-500">{question.context}</span>
          </div>
        </div>
      </div>

      <div className="ml-9">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Patient&apos;s Response:
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Record the patient's verbatim response..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent text-sm resize-none"
        />
      </div>
    </div>
  );
}
