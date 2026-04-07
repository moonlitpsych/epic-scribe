'use client';

import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface StagedAction {
  id: string;
  action_type: string;
  urgency: string;
  summary: string;
  details: Record<string, any>;
  transcript_excerpt: string | null;
  status: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  lab: { label: 'Lab', color: '#f59e0b' },
  rx_new: { label: 'New Rx', color: '#10b981' },
  rx_change: { label: 'Rx Change', color: '#06b6d4' },
  rx_refill: { label: 'Refill', color: '#34d399' },
  rx_discontinue: { label: 'D/C Rx', color: '#ef4444' },
  followup: { label: 'Follow-up', color: '#E89C8A' },
  prior_auth: { label: 'Prior Auth', color: '#a78bfa' },
  referral: { label: 'Referral', color: '#818cf8' },
  safety_plan: { label: 'Safety Plan', color: '#f87171' },
  patient_education: { label: 'Education', color: '#06b6d4' },
  other: { label: 'Other', color: '#6b7280' },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  stat: { label: 'STAT', color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#f59e0b' },
};

const DETAIL_LABELS: Record<string, string> = {
  tests: 'Tests',
  medication: 'Medication',
  dose: 'Dose',
  frequency: 'Frequency',
  quantity: 'Qty',
  refills: 'Refills',
  indication: 'Indication',
  previous_dose: 'Previous Dose',
  new_dose: 'New Dose',
  change_type: 'Change',
  reason: 'Reason',
  taper_instructions: 'Taper',
  interval_weeks: 'Follow-up In',
  specific_date: 'Date',
  referral_to: 'Refer To',
  specialty: 'Specialty',
  medication_or_service: 'Service',
  payer_mentioned: 'Payer',
  topics: 'Topics',
  special_instructions: 'Instructions',
  update_type: 'Type',
  risk_level_discussed: 'Risk Level',
  components_discussed: 'Components',
  description: 'Description',
  fasting_required: 'Fasting',
  timing: 'Timing',
  clinical_justification_excerpts: 'Justification',
  specific_instructions: 'Instructions',
  hedis_relevant: 'HEDIS',
  hedis_measure: 'Measure',
};

function formatDetailValue(key: string, value: any): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'interval_weeks') return `${value} weeks`;
  return String(value);
}

interface ActionCardProps {
  action: StagedAction;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function ActionCard({ action, onApprove, onDismiss }: ActionCardProps) {
  const [showExcerpt, setShowExcerpt] = useState(false);

  const typeConfig = TYPE_CONFIG[action.action_type] || TYPE_CONFIG.other;
  const urgencyConfig = URGENCY_CONFIG[action.urgency];
  const isApproved = action.status === 'approved';

  // Filter out null/undefined/empty detail values
  const detailEntries = Object.entries(action.details || {}).filter(
    ([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div
      className={`relative bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden transition-opacity ${
        isApproved ? 'opacity-70' : ''
      }`}
    >
      {/* Left color border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: typeConfig.color }}
      />

      <div className="pl-5 pr-4 py-3">
        {/* Header row: badges + buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ color: typeConfig.color, background: `${typeConfig.color}15` }}
            >
              {typeConfig.label}
            </span>

            {/* Urgency badge (only non-routine) */}
            {urgencyConfig && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: urgencyConfig.color, background: `${urgencyConfig.color}15` }}
              >
                {urgencyConfig.label}
              </span>
            )}

            {isApproved && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success-text)] bg-[var(--success-bg)]">
                Approved
              </span>
            )}
          </div>

          {/* Action buttons */}
          {!isApproved && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onApprove(action.id)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] text-[var(--success-text)] bg-[var(--success-bg)] border border-[var(--success-border)] hover:brightness-110 transition-all"
                title="Approve"
              >
                <Check size={12} />
                Approve
              </button>
              <button
                onClick={() => onDismiss(action.id)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] text-[var(--text-muted)] hover:text-[var(--error-text)] hover:bg-[var(--error-bg)] border border-transparent hover:border-[var(--error-border)] transition-all"
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <p className="mt-1.5 text-sm text-[var(--text-primary)]">{action.summary}</p>

        {/* Detail rows */}
        {detailEntries.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {detailEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-[var(--text-muted)] flex-shrink-0">
                  {DETAIL_LABELS[key] || key}:
                </span>
                <span className="text-[var(--text-secondary)]">
                  {formatDetailValue(key, value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Transcript excerpt */}
        {action.transcript_excerpt && (
          <button
            onClick={() => setShowExcerpt(!showExcerpt)}
            className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showExcerpt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
