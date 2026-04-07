'use client';

import { useState } from 'react';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';

interface StagedAction {
  id: string;
  action_type: string;
  urgency: string;
  summary: string;
  details: Record<string, any>;
  transcript_excerpt: string | null;
  status: string;
  execution_result?: Record<string, any>;
  error_message?: string | null;
}

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  stat: { label: 'STAT', color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#f59e0b' },
};

interface LabActionCardProps {
  action: StagedAction;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onExecute: (id: string) => void;
}

export default function LabActionCard({
  action,
  onApprove,
  onDismiss,
  onExecute,
}: LabActionCardProps) {
  const [showExcerpt, setShowExcerpt] = useState(false);

  const urgencyConfig = URGENCY_CONFIG[action.urgency];
  const tests: string[] = action.details?.tests || [];
  const fastingRequired: boolean = action.details?.fasting_required === true;
  const specialInstructions: string | null =
    action.details?.special_instructions || null;

  const isApproved = action.status === 'approved';
  const isExecuting = action.status === 'executing';
  const isCompleted = action.status === 'completed';
  const isFailed = action.status === 'failed';

  const executionResult = action.execution_result;
  const unmatchedTests: string[] = executionResult?.unmatchedTests || [];

  return (
    <div
      className={`relative bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden transition-opacity ${
        isCompleted ? 'opacity-80' : ''
      }`}
    >
      {/* Left amber border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: '#f59e0b' }}
      />

      <div className="pl-5 pr-4 py-3">
        {/* Header: badges + buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ color: '#f59e0b', background: '#f59e0b15' }}
            >
              <FlaskConical size={10} className="inline mr-0.5 -mt-px" />
              Lab
            </span>

            {urgencyConfig && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  color: urgencyConfig.color,
                  background: `${urgencyConfig.color}15`,
                }}
              >
                {urgencyConfig.label}
              </span>
            )}

            {fastingRequired && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--warning-text)] bg-[var(--warning-bg)] border border-[var(--warning-border)]">
                Fasting Required
              </span>
            )}

            {isApproved && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success-text)] bg-[var(--success-bg)]">
                Approved
              </span>
            )}

            {isCompleted && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success-text)] bg-[var(--success-bg)]">
                <CheckCircle2 size={10} className="inline mr-0.5 -mt-px" />
                Requisition Created
              </span>
            )}

            {isFailed && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--error-text)] bg-[var(--error-bg)]">
                <XCircle size={10} className="inline mr-0.5 -mt-px" />
                Failed
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {action.status === 'staged' && (
              <>
                <button
                  onClick={() => onApprove(action.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] text-[var(--success-text)] bg-[var(--success-bg)] border border-[var(--success-border)] hover:brightness-110 transition-all"
                >
                  <Check size={12} />
                  Approve
                </button>
                <button
                  onClick={() => onDismiss(action.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] text-[var(--text-muted)] hover:text-[var(--error-text)] hover:bg-[var(--error-bg)] border border-transparent hover:border-[var(--error-border)] transition-all"
                >
                  <X size={12} />
                </button>
              </>
            )}

            {isApproved && (
              <button
                onClick={() => onExecute(action.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-[2px] text-[#92400e] bg-[#fef3c7] border border-[#f59e0b40] hover:brightness-110 transition-all"
              >
                <FlaskConical size={12} />
                Create Requisition
              </button>
            )}

            {isExecuting && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
                <Loader2 size={12} className="animate-spin" />
                Creating requisition...
              </span>
            )}

            {isFailed && (
              <button
                onClick={() => onExecute(action.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-[2px] text-[var(--error-text)] bg-[var(--error-bg)] border border-[var(--error-border)] hover:brightness-110 transition-all"
              >
                <RotateCcw size={12} />
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="mt-1.5 text-sm text-[var(--text-primary)]">
          {action.summary}
        </p>

        {/* Test list */}
        {tests.length > 0 && (
          <div className="mt-2 space-y-1">
            {tests.map((test, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
              >
                <span className="w-1 h-1 rounded-full bg-[#f59e0b] flex-shrink-0" />
                {test}
              </div>
            ))}
          </div>
        )}

        {/* Special instructions */}
        {specialInstructions && (
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            <span className="text-[var(--text-muted)]">Instructions:</span>{' '}
            {specialInstructions}
          </div>
        )}

        {/* Completed: show requisition number + unmatched warnings */}
        {isCompleted && executionResult && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-[var(--success-text)]">
              Requisition #{executionResult.requisitionNumber} —{' '}
              {executionResult.testsOrdered} test
              {executionResult.testsOrdered !== 1 ? 's' : ''} ordered
            </div>
            {executionResult.collectionSite && (
              <div className="text-xs text-[var(--text-muted)]">
                {executionResult.collectionSite}
              </div>
            )}
            {executionResult.fastingRequired && (
              <div className="text-xs text-[var(--warning-text)]">
                Patient should fast before collection
              </div>
            )}
            {unmatchedTests.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs text-[var(--warning-text)]">
                <AlertTriangle
                  size={12}
                  className="flex-shrink-0 mt-0.5"
                />
                <span>
                  Unmatched tests (not in Labcorp catalog):{' '}
                  {unmatchedTests.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Failed: show error */}
        {isFailed && action.error_message && (
          <div className="mt-2 text-xs text-[var(--error-text)]">
            {action.error_message}
          </div>
        )}

        {/* Transcript excerpt */}
        {action.transcript_excerpt && (
          <button
            onClick={() => setShowExcerpt(!showExcerpt)}
            className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showExcerpt ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            Transcript excerpt
          </button>
        )}
        {showExcerpt && action.transcript_excerpt && (
          <p className="mt-1 text-xs text-[var(--text-muted)] italic bg-[var(--bg-surface-2)] rounded px-2.5 py-1.5 border border-[var(--border-default)]">
            &ldquo;{action.transcript_excerpt}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
