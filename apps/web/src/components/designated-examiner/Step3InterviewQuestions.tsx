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
        <h2 className="text-2xl font-heading text-[var(--text-primary)] mb-2">
          Step 3: Patient Interview
        </h2>
        <p className="text-[var(--text-secondary)]">
          Ask the patient the following questions and record their responses verbatim.
          These answers will be incorporated into the final commitment determination.
        </p>
      </div>

      {/* Progress Banner */}
      <div
        className={`p-4 rounded-[2px] border ${
          allAnswered ? 'bg-[var(--success-bg)] border-[var(--success-border)]' : 'bg-[var(--warning-bg)] border-[var(--warning-border)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {answeredCount} of {questions.length} questions answered
            </p>
            {!allAnswered && (
              <p className="text-sm text-[var(--warning-text)] mt-1">
                Complete all questions for a comprehensive assessment
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-[var(--text-muted)]">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-[2px] transition-colors ${
                hasUnsavedChanges
                  ? 'bg-[var(--accent-warm)] text-[var(--text-inverse)] hover:bg-[var(--accent-warm-hover)]'
                  : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] cursor-not-allowed'
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
              className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Criterion {criterion}: {criterionInfo.label}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{criterionInfo.full}</p>
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
        <div className="flex items-center gap-3 p-4 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px]">
          <AlertCircle className="text-[var(--warning-text)] flex-shrink-0" size={20} />
          <p className="text-sm text-[var(--warning-text)]">
            You have {questions.length - answeredCount} unanswered question(s). While you can
            proceed, answering all questions will provide a more comprehensive assessment.
          </p>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={isLoading || answeredCount === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
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
    high: 'bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]',
    medium: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
    low: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-default)]',
  };

  return (
    <div className="border-l-4 border-[var(--accent-warm)] pl-4">
      <div className="flex items-start gap-3 mb-2">
        <span className="flex-shrink-0 w-6 h-6 bg-[var(--accent-warm)] text-[var(--text-inverse)] rounded-full flex items-center justify-center text-sm font-medium">
          {index}
        </span>
        <div className="flex-1">
          <p className="text-[var(--text-primary)] font-medium">{question.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded border ${priorityColors[question.priority]}`}
            >
              {question.priority} priority
            </span>
            <span className="text-xs text-[var(--text-muted)]">{question.context}</span>
          </div>
        </div>
      </div>

      <div className="ml-9">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Patient&apos;s Response:
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Record the patient's verbatim response..."
          rows={3}
          className="w-full px-4 py-3 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent text-sm resize-none"
        />
      </div>
    </div>
  );
}
