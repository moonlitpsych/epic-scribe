'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, FileText, RotateCcw, Plus } from 'lucide-react';
import type { FinalAnalysis } from '@/types/designated-examiner';

interface Step5Props {
  patientName: string;
  hearingDate?: string;
  commitmentType?: string;
  finalAnalysis: FinalAnalysis;
  finalRecommendation: string;
  onStartNew: () => void;
}

export function Step5TestimonyView({
  patientName,
  hearingDate,
  commitmentType,
  finalAnalysis,
  finalRecommendation,
  onStartNew,
}: Step5Props) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [editedText, setEditedText] = useState(finalRecommendation);
  const [isEditing, setIsEditing] = useState(false);

  const isCommit = finalAnalysis.overall_recommendation === 'commit';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleReset = () => {
    setEditedText(finalRecommendation);
  };

  const wordCount = editedText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading text-[var(--text-primary)] mb-2">
          Step 5: Court Testimony
        </h2>
        <p className="text-[var(--text-secondary)]">
          Your assessment is complete. Use the testimony below for court. You can edit it as needed.
        </p>
      </div>

      {/* Summary Banner */}
      <div
        className={`p-4 rounded-[2px] border-2 ${
          isCommit
            ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]'
            : 'bg-[var(--success-bg)] border-[var(--success-border)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg text-[var(--text-primary)]">
              {patientName}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {hearingDate && `Hearing: ${hearingDate}`}
              {hearingDate && commitmentType && ' • '}
              {commitmentType && `${commitmentType} commitment`}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-[2px] font-bold ${
              isCommit
                ? 'bg-[var(--warning-bg)] text-[var(--warning-text)]'
                : 'bg-[var(--success-bg)] text-[var(--success-text)]'
            }`}
          >
            {isCommit ? 'RECOMMEND COMMITMENT' : 'DO NOT COMMIT'}
          </div>
        </div>
      </div>

      {/* Testimony Card */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface-2)]">
          <div className="flex items-center gap-2">
            <FileText className="text-[var(--accent-warm)]" size={20} />
            <h3 className="font-semibold text-[var(--text-primary)]">
              Court-Ready Testimony
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-warm)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-warm-hover)] transition-colors"
            >
              {copySuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full min-h-[500px] px-4 py-3 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm resize-none"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-[var(--text-primary)] leading-relaxed">
                {editedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-[var(--bg-surface-2)] border-t border-[var(--border-default)]">
          <span className="text-sm text-[var(--text-muted)]">{wordCount} words</span>
          <span className="text-xs text-[var(--text-muted)]">
            Generated {new Date(finalAnalysis.generated_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-6 py-3 border-2 border-[var(--border-default)] text-[var(--text-primary)] rounded-[2px] hover:bg-[var(--bg-hover)] transition-colors font-medium"
        >
          <Plus size={18} />
          Start New Assessment
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-medium"
        >
          {copySuccess ? (
            <>
              <CheckCircle2 size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Testimony
            </>
          )}
        </button>
      </div>
    </div>
  );
}
