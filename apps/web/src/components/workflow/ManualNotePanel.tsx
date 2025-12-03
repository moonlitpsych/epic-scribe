'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, StickyNote, Save, X } from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface ManualNotePanelProps {
  patient: Patient | null;
  onNoteSaved?: () => void;
}

type NoteType = 'clinical_note' | 'quick_memo';

export default function ManualNotePanel({ patient, onNoteSaved }: ManualNotePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>('quick_memo');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!patient) {
      setError('Please select a patient first');
      return;
    }

    if (!content.trim()) {
      setError('Note content is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/patients/${patient.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteType,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save note');
      }

      // Success! Reset form
      setTitle('');
      setContent('');
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

      // Notify parent
      if (onNoteSaved) {
        onNoteSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setError(null);
    setSuccess(false);
    setIsExpanded(false);
  };

  if (!patient) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#F5F1ED]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="text-[#5A6B7D]" size={20} />
          ) : (
            <ChevronRight className="text-[#5A6B7D]" size={20} />
          )}
          <FileText className="text-[#E89C8A]" size={20} />
          <span className="font-medium text-[#0A1F3D]">Add Manual Note</span>
        </div>
        <span className="text-sm text-[#5A6B7D]">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#C5A882]/20 p-4 space-y-4">
          {/* Note Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Note Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setNoteType('quick_memo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  noteType === 'quick_memo'
                    ? 'border-[#E89C8A] bg-[#E89C8A]/10 text-[#E89C8A]'
                    : 'border-[#C5A882]/30 text-[#5A6B7D] hover:border-[#C5A882]'
                }`}
              >
                <StickyNote size={18} />
                Quick Memo
              </button>
              <button
                onClick={() => setNoteType('clinical_note')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  noteType === 'clinical_note'
                    ? 'border-[#0A1F3D] bg-[#0A1F3D]/10 text-[#0A1F3D]'
                    : 'border-[#C5A882]/30 text-[#5A6B7D] hover:border-[#C5A882]'
                }`}
              >
                <FileText size={18} />
                Clinical Note
              </button>
            </div>
            <p className="text-xs text-[#5A6B7D] mt-2">
              {noteType === 'quick_memo'
                ? 'Quick informal notes for reference (reminders, to-dos, brief observations)'
                : 'Formal clinical documentation (assessments, observations, treatment notes)'}
            </p>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
              Title <span className="text-[#5A6B7D] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={noteType === 'quick_memo' ? 'e.g., Follow-up reminder' : 'e.g., Treatment Progress Note'}
              className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
              disabled={saving}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
              Note Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                noteType === 'quick_memo'
                  ? 'Add a quick note...'
                  : 'Enter clinical documentation...'
              }
              rows={noteType === 'quick_memo' ? 4 : 8}
              className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              disabled={saving}
            />
            <p className="text-xs text-[#5A6B7D] mt-1">
              {content.length} characters
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Note saved successfully!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
