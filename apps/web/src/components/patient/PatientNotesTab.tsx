'use client';

import { useState } from 'react';
import { Plus, Trash2, FileText, StickyNote, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';

interface PatientNote {
  id: string;
  patient_id: string;
  note_type: 'clinical_note' | 'quick_memo';
  title: string | null;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedNote {
  id: string;
  encounter_id: string;
  template_id: string | null;
  generated_content: string | null;
  final_note_content: string | null;
  is_final: boolean;
  finalized_at: string | null;
  finalized_by: string | null;
  generated_at: string;
  encounter?: {
    setting: string;
    visit_type: string;
    scheduled_start: string;
  };
}

interface PatientNotesTabProps {
  patientId: string;
  patientNotes: PatientNote[];
  generatedNotes: GeneratedNote[];
  onNotesChanged: () => void;
}

export default function PatientNotesTab({
  patientId,
  patientNotes,
  generatedNotes,
  onNotesChanged,
}: PatientNotesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteType, setNewNoteType] = useState<'clinical_note' | 'quick_memo'>('quick_memo');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/patients/${patientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteType: newNoteType,
          title: newNoteTitle.trim() || undefined,
          content: newNoteContent.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      setNewNoteTitle('');
      setNewNoteContent('');
      setShowAddForm(false);
      onNotesChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/patients/${patientId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      onNotesChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  // Combine and sort all notes by date
  type CombinedNote =
    | { type: 'manual'; note: PatientNote; date: Date }
    | { type: 'generated'; note: GeneratedNote; date: Date };

  const allNotes: CombinedNote[] = [
    ...patientNotes.map((note) => ({
      type: 'manual' as const,
      note,
      date: new Date(note.created_at),
    })),
    ...generatedNotes.map((note) => ({
      type: 'generated' as const,
      note,
      date: new Date(note.finalized_at || note.generated_at),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#0A1F3D]">All Notes</h3>
          <p className="text-sm text-[#5A6B7D]">
            Manual notes and AI-generated notes in one timeline
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors"
        >
          <Plus size={18} />
          Add Note
        </button>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
          <h4 className="font-medium text-[#0A1F3D] mb-4">New Note</h4>

          {/* Note Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">Note Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setNewNoteType('quick_memo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  newNoteType === 'quick_memo'
                    ? 'border-[#E89C8A] bg-[#E89C8A]/10 text-[#E89C8A]'
                    : 'border-[#C5A882]/30 text-[#5A6B7D] hover:border-[#C5A882]'
                }`}
              >
                <StickyNote size={18} />
                Quick Memo
              </button>
              <button
                onClick={() => setNewNoteType('clinical_note')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  newNoteType === 'clinical_note'
                    ? 'border-[#0A1F3D] bg-[#0A1F3D]/10 text-[#0A1F3D]'
                    : 'border-[#C5A882]/30 text-[#5A6B7D] hover:border-[#C5A882]'
                }`}
              >
                <FileText size={18} />
                Clinical Note
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
              Title <span className="text-[#5A6B7D] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Enter note content..."
              rows={newNoteType === 'quick_memo' ? 4 : 8}
              className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewNoteTitle('');
                setNewNoteContent('');
              }}
              className="px-4 py-2 text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={saving || !newNoteContent.trim()}
              className="px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* Notes Timeline */}
      {allNotes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-12 text-center">
          <FileText className="mx-auto text-[#C5A882] mb-4" size={48} />
          <p className="text-[#5A6B7D]">No notes yet.</p>
          <p className="text-sm text-[#5A6B7D] mt-1">
            Click &quot;Add Note&quot; to create a manual note, or generate a note from an encounter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allNotes.map((item) => {
            if (item.type === 'manual') {
              const note = item.note;
              return (
                <div
                  key={`manual-${note.id}`}
                  className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {note.note_type === 'clinical_note' ? (
                          <div className="p-1.5 rounded bg-[#0A1F3D]/10">
                            <FileText className="text-[#0A1F3D]" size={16} />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded bg-[#E89C8A]/10">
                            <StickyNote className="text-[#E89C8A]" size={16} />
                          </div>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            note.note_type === 'clinical_note'
                              ? 'bg-[#0A1F3D]/10 text-[#0A1F3D]'
                              : 'bg-[#E89C8A]/10 text-[#E89C8A]'
                          }`}
                        >
                          {note.note_type === 'clinical_note' ? 'Clinical Note' : 'Quick Memo'}
                        </span>
                        {note.title && (
                          <span className="font-medium text-[#0A1F3D]">{note.title}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 text-[#5A6B7D] hover:text-red-600 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-[#0A1F3D] whitespace-pre-wrap text-sm">{note.content}</p>
                    <div className="mt-3 text-xs text-[#5A6B7D]">
                      {formatDateTime(note.created_at)} by {note.created_by}
                    </div>
                  </div>
                </div>
              );
            } else {
              const note = item.note;
              const isExpanded = expandedNotes.has(note.id);
              const content = note.final_note_content || note.generated_content || '';
              const preview = content.substring(0, 200);

              return (
                <div
                  key={`generated-${note.id}`}
                  className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 overflow-hidden"
                >
                  <button
                    onClick={() => toggleNoteExpanded(note.id)}
                    className="w-full p-4 text-left hover:bg-[#F5F1ED]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-purple-100">
                          <Sparkles className="text-purple-600" size={16} />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          AI Generated
                        </span>
                        {note.encounter && (
                          <span className="text-sm text-[#5A6B7D]">
                            {note.encounter.setting} - {note.encounter.visit_type}
                          </span>
                        )}
                        {note.is_final && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Finalized
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="text-[#5A6B7D]" size={20} />
                      ) : (
                        <ChevronRight className="text-[#5A6B7D]" size={20} />
                      )}
                    </div>
                    {!isExpanded && (
                      <p className="mt-2 text-sm text-[#5A6B7D] line-clamp-2">{preview}...</p>
                    )}
                    <div className="mt-2 text-xs text-[#5A6B7D]">
                      {formatDateTime(note.finalized_at || note.generated_at)}
                      {note.finalized_by && ` by ${note.finalized_by}`}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#C5A882]/10">
                      <pre className="mt-4 whitespace-pre-wrap text-sm text-[#0A1F3D] font-mono bg-[#F5F1ED]/50 p-4 rounded-lg max-h-96 overflow-auto">
                        {content}
                      </pre>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
