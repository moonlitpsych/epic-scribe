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
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-2">
          Step 5: Court Testimony
        </h2>
        <p className="text-[#5A6B7D]">
          Your assessment is complete. Use the testimony below for court. You can edit it as needed.
        </p>
      </div>

      {/* Summary Banner */}
      <div
        className={`p-4 rounded-lg border-2 ${
          isCommit
            ? 'bg-amber-50 border-amber-500'
            : 'bg-green-50 border-green-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg text-gray-900">
              {patientName}
            </p>
            <p className="text-sm text-gray-600">
              {hearingDate && `Hearing: ${hearingDate}`}
              {hearingDate && commitmentType && ' • '}
              {commitmentType && `${commitmentType} commitment`}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-bold ${
              isCommit
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {isCommit ? 'RECOMMEND COMMITMENT' : 'DO NOT COMMIT'}
          </div>
        </div>
      </div>

      {/* Testimony Card */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-[#C5A882]/20 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="text-[#E89C8A]" size={20} />
            <h3 className="font-semibold text-[#0A1F3D]">
              Court-Ready Testimony
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#D88A7A] transition-colors"
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
              className="w-full min-h-[500px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {editedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-[#C5A882]/20">
          <span className="text-sm text-gray-500">{wordCount} words</span>
          <span className="text-xs text-gray-400">
            Generated {new Date(finalAnalysis.generated_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-6 py-3 border-2 border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors font-medium"
        >
          <Plus size={18} />
          Start New Assessment
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors font-medium"
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
