'use client';

import { useState } from 'react';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Pill,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clipboard,
  ArrowRight,
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

const RX_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  rx_new: { label: 'New Rx', color: '#10b981' },
  rx_change: { label: 'Rx Change', color: '#3b82f6' },
  rx_refill: { label: 'Refill', color: '#06b6d4' },
  rx_discontinue: { label: 'D/C Rx', color: '#ef4444' },
};

interface RxActionCardProps {
  action: StagedAction;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onExecute: (id: string) => void;
}

export default function RxActionCard({
  action,
  onApprove,
  onDismiss,
  onExecute,
}: RxActionCardProps) {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeConfig = RX_TYPE_CONFIG[action.action_type] || RX_TYPE_CONFIG.rx_new;
  const details = action.details || {};
  const isControlled = action.execution_result?.isControlled || false;

  const isApproved = action.status === 'approved';
  const isExecuting = action.status === 'executing';
  const isCompleted = action.status === 'completed';
  const isFailed = action.status === 'failed';

  const executionResult = action.execution_result;

  function formatRxForClipboard(): string {
    const med = executionResult?.medication || details.medication || '';
    const dose = executionResult?.dose || details.dose || details.new_dose || '';
    const freq = executionResult?.frequency || details.frequency || '';
    const qty = executionResult?.quantity || details.quantity || '';
    const refills = executionResult?.refills ?? details.refills ?? '';
    const indication = executionResult?.indication || details.indication || '';

    if (action.action_type === 'rx_discontinue') {
      const reason = details.reason || '';
      const taper = details.taper_instructions || '';
      return `D/C: ${med}${reason ? ` | Reason: ${reason}` : ''}${taper ? ` | Taper: ${taper}` : ''}`;
    }

    const parts = [`Rx: ${med}`];
    if (dose) parts.push(dose);
    if (freq) parts.push(freq);
    if (qty) parts.push(`#${qty}`);
    if (refills !== '') parts.push(`Refills: ${refills}`);
    if (indication) parts.push(`| ${indication}`);
    return parts.join(' ');
  }

  async function handleCopy() {
    const text = formatRxForClipboard();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`relative bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden transition-opacity ${
        isCompleted ? 'opacity-80' : ''
      }`}
    >
      {/* Left color border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: typeConfig.color }}
      />

      <div className="pl-5 pr-4 py-3">
        {/* Header: badges + buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ color: typeConfig.color, background: `${typeConfig.color}15` }}
            >
              <Pill size={10} className="inline mr-0.5 -mt-px" />
              {typeConfig.label}
            </span>

            {isControlled && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--warning-text)] bg-[var(--warning-bg)] border border-[var(--warning-border)]">
                <ShieldAlert size={10} className="inline mr-0.5 -mt-px" />
                Controlled
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
                Rx Ready
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
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-[2px] text-[#065f46] bg-[#d1fae5] border border-[#10b98140] hover:brightness-110 transition-all"
              >
                <Pill size={12} />
                Prepare Rx
              </button>
            )}

            {isExecuting && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
                <Loader2 size={12} className="animate-spin" />
                Preparing...
              </span>
            )}

            {isCompleted && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-[2px] text-[var(--text-secondary)] bg-[var(--bg-surface-2)] border border-[var(--border-default)] hover:brightness-110 transition-all"
              >
                <Clipboard size={12} />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
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

        {/* Rx details */}
        <div className="mt-2 space-y-1">
          {/* Medication name — prominent */}
          <div className="text-[13px] font-medium text-[var(--text-primary)]">
            {details.medication || executionResult?.medication || 'Unknown medication'}
          </div>

          {/* Detail rows */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--text-secondary)]">
            {(details.dose || details.new_dose) && (
              <span>Dose: {details.dose || details.new_dose}</span>
            )}
            {details.frequency && <span>Freq: {details.frequency}</span>}
            {details.quantity && <span>Qty: #{details.quantity}</span>}
            {details.refills != null && <span>Refills: {details.refills}</span>}
          </div>

          {details.indication && (
            <div className="text-xs text-[var(--text-muted)]">
              Indication: {details.indication}
            </div>
          )}

          {/* rx_change: show dose transition */}
          {action.action_type === 'rx_change' && details.previous_dose && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--info-text)]">
              <span>{details.previous_dose}</span>
              <ArrowRight size={10} />
              <span className="font-medium">{details.new_dose || details.dose}</span>
              {details.reason && (
                <span className="text-[var(--text-muted)]">({details.reason})</span>
              )}
            </div>
          )}

          {/* rx_discontinue: taper instructions */}
          {action.action_type === 'rx_discontinue' && details.taper_instructions && (
            <div className="mt-1 text-xs text-[var(--warning-text)] bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded px-2.5 py-1.5">
              Taper: {details.taper_instructions}
            </div>
          )}

          {details.special_instructions && (
            <div className="text-xs text-[var(--text-muted)]">
              Instructions: {details.special_instructions}
            </div>
          )}
        </div>

        {/* Completed: show enrichment results */}
        {isCompleted && executionResult && (
          <div className="mt-2 space-y-1">
            {executionResult.isControlled && (
              <div className="text-xs text-[var(--warning-text)]">
                Controlled substance — EPCS signature required in ScriptSure
              </div>
            )}
            {executionResult.currentMedications?.length > 0 && (
              <details className="text-xs text-[var(--text-muted)]">
                <summary className="cursor-pointer hover:text-[var(--text-secondary)]">
                  Current meds ({executionResult.currentMedications.length})
                </summary>
                <ul className="mt-1 ml-3 space-y-0.5 list-disc">
                  {executionResult.currentMedications.map((med: string, i: number) => (
                    <li key={i}>{med}</li>
                  ))}
                </ul>
              </details>
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
