'use client';

import { useState } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { Copy, RefreshCw, RotateCcw, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface NoteResultsStepProps {
  template: Template;
  generatedNote: string;
  editedNote: string;
  onEditedNoteChange: (note: string) => void;
  validationResult: ValidationResult | null;
  onRegenerate: () => void;
  onStartOver: () => void;
  setting: Setting;
  visitType: string;
}

export default function NoteResultsStep({
  template,
  generatedNote,
  editedNote,
  onEditedNoteChange,
  validationResult,
  onRegenerate,
  onStartOver,
  setting,
  visitType,
}: NoteResultsStepProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedNote);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const hasModifications = editedNote !== generatedNote;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-[#0A1F3D] mb-1">Generated Note</h2>
            <p className="text-sm text-[#5A6B7D]">
              {template.name} • {setting} • {visitType}
            </p>
            {hasModifications && (
              <p className="text-xs text-[#E89C8A] mt-1">
                ✓ Note has been modified
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold"
            >
              {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copySuccess ? 'Copied!' : 'Copy Note'}
            </button>

            <button
              onClick={onRegenerate}
              className="flex items-center gap-2 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
            >
              <RefreshCw size={16} />
              Regenerate
            </button>

            <button
              onClick={onStartOver}
              className="flex items-center gap-2 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
            >
              <RotateCcw size={16} />
              Start Over
            </button>

            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              <ExternalLink size={14} />
              Edit Template
            </a>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {validationResult && (
        <div className="space-y-3">
          {validationResult.valid && (
            <div className="bg-[#ECFDF5] border border-[#10B981]/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#065F46]">All Validations Passed</p>
                <p className="text-sm text-[#047857] mt-1">
                  The note meets all structure and content requirements. Review for clinical accuracy before copying to Epic.
                </p>
              </div>
            </div>
          )}

          {validationResult.errors && validationResult.errors.length > 0 && (
            <div className="bg-[#FEF2F2] border border-[#EF4444]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#991B1B]">Structure Errors ({validationResult.errors.length})</p>
                  <ul className="text-sm text-[#DC2626] mt-2 space-y-1 list-disc list-inside">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <div className="bg-[#FFF4E6] border border-[#FFA500]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#FFA500] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#8B4513]">Warnings ({validationResult.warnings.length})</p>
                  <ul className="text-sm text-[#8B4513] mt-2 space-y-1 list-disc list-inside">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Instructions */}
      <div className="bg-[#E8F4FD] border border-[#3B82F6]/30 rounded-lg p-4 flex items-start gap-3">
        <Info size={18} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#1E40AF]">
          The note below is editable. Make any necessary changes before copying to Epic.
        </p>
      </div>

      {/* Side-by-Side View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template Used */}
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
          <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4 flex items-center gap-2">
            <span className="text-xs bg-[#E89C8A] text-white px-2 py-1 rounded">Reference</span>
            Template Used
          </h3>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {template.sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div
                  key={section.order}
                  className="border border-[#C5A882]/20 rounded-lg p-3 bg-[#F5F1ED]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#E89C8A] bg-white px-2 py-0.5 rounded">
                      {section.order}
                    </span>
                    <h4 className="text-sm font-semibold text-[#0A1F3D]">
                      {section.name}
                    </h4>
                  </div>
                  <pre className="text-xs font-mono bg-white p-2 rounded border border-[#C5A882]/20 whitespace-pre-wrap overflow-x-auto">
                    {section.content.substring(0, 200)}
                    {section.content.length > 200 && '...'}
                  </pre>
                </div>
              ))}
          </div>
        </div>

        {/* Right: Editable Note */}
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
          <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4 flex items-center gap-2">
            <span className="text-xs bg-[#E89C8A] text-white px-2 py-1 rounded">Editable</span>
            Generated Note
          </h3>

          <textarea
            value={editedNote}
            onChange={(e) => onEditedNoteChange(e.target.value)}
            className="w-full h-[800px] px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
            placeholder="Your generated note will appear here..."
          />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[#5A6B7D]">
              {editedNote.split(/\s+/).filter(Boolean).length} words
            </p>
            {hasModifications && (
              <button
                onClick={() => onEditedNoteChange(generatedNote)}
                className="text-xs text-[#E89C8A] hover:text-[#0A1F3D] transition-colors"
              >
                Reset to original
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
