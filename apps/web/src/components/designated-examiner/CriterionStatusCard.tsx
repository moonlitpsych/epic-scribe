'use client';

import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { CriterionStatus } from '@/types/designated-examiner';
import { UTAH_CRITERIA } from '@/types/designated-examiner';

interface CriterionStatusCardProps {
  criterionNumber: 1 | 2 | 3 | 4 | 5;
  status: CriterionStatus;
  explanation: string;
  sources?: string[];
  compact?: boolean;
}

export function CriterionStatusCard({
  criterionNumber,
  status,
  explanation,
  sources,
  compact = false,
}: CriterionStatusCardProps) {
  const criterionKey = `criterion_${criterionNumber}` as keyof typeof UTAH_CRITERIA;
  const criterionInfo = UTAH_CRITERIA[criterionKey];

  const statusConfig: Record<CriterionStatus, {
    icon: typeof CheckCircle2;
    bgColor: string;
    borderColor: string;
    textColor: string;
    label: string;
  }> = {
    meets: {
      icon: CheckCircle2,
      bgColor: 'bg-[var(--success-bg)]',
      borderColor: 'border-[var(--success-border)]',
      textColor: 'text-[var(--success-text)]',
      label: 'MEETS',
    },
    does_not_meet: {
      icon: XCircle,
      bgColor: 'bg-[var(--error-bg)]',
      borderColor: 'border-[var(--error-border)]',
      textColor: 'text-[var(--error-text)]',
      label: 'DOES NOT MEET',
    },
    unclear: {
      icon: HelpCircle,
      bgColor: 'bg-[var(--warning-bg)]',
      borderColor: 'border-[var(--warning-border)]',
      textColor: 'text-[var(--warning-text)]',
      label: 'UNCLEAR',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`p-3 rounded-[2px] border-2 ${config.bgColor} ${config.borderColor}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Criterion {criterionNumber}
          </span>
          <div className={`flex items-center gap-1 ${config.textColor}`}>
            <Icon size={14} />
            <span className="text-xs font-bold">{config.label}</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{criterionInfo.label}</p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-[2px] border-2 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-[var(--text-primary)]">
            Criterion {criterionNumber}: {criterionInfo.label}
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{criterionInfo.full}</p>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor} ${config.textColor}`}
        >
          <Icon size={16} />
          <span className="text-sm font-bold">{config.label}</span>
        </div>
      </div>

      <p className="text-sm text-[var(--text-primary)] mt-3">{explanation}</p>

      {sources && sources.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Sources:</span>
          {sources.map((source) => (
            <span
              key={source}
              className="text-xs px-2 py-0.5 bg-[var(--bg-surface)] rounded-full border border-[var(--border-default)]"
            >
              {source}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact grid view of all 5 criteria
 */
interface CriteriaGridProps {
  criteria: {
    criterion_1: { status: CriterionStatus; explanation: string; sources?: string[] };
    criterion_2: { status: CriterionStatus; explanation: string; sources?: string[] };
    criterion_3: { status: CriterionStatus; explanation: string; sources?: string[] };
    criterion_4: { status: CriterionStatus; explanation: string; sources?: string[] };
    criterion_5: { status: CriterionStatus; explanation: string; sources?: string[] };
  };
  compact?: boolean;
}

export function CriteriaGrid({ criteria, compact = false }: CriteriaGridProps) {
  const criterionNumbers: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {criterionNumbers.map((num) => {
          const key = `criterion_${num}` as keyof typeof criteria;
          const criterion = criteria[key];
          return (
            <CriterionStatusCard
              key={num}
              criterionNumber={num}
              status={criterion.status}
              explanation={criterion.explanation}
              sources={criterion.sources}
              compact
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criterionNumbers.map((num) => {
        const key = `criterion_${num}` as keyof typeof criteria;
        const criterion = criteria[key];
        return (
          <CriterionStatusCard
            key={num}
            criterionNumber={num}
            status={criterion.status}
            explanation={criterion.explanation}
            sources={criterion.sources}
          />
        );
      })}
    </div>
  );
}
