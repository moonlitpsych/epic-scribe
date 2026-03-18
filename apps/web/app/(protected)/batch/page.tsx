'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle2, Loader2, ClipboardPaste, FileText, X, AlertCircle } from 'lucide-react';
import debounce from 'lodash/debounce';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string;
  email?: string;
}

interface PreppedPatient {
  patient: Patient;
  noteId: string;
  savedAt: string;
  preview: string;
  isDuplicate: boolean;
}

export default function NotePrep() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const [existingNote, setExistingNote] = useState<{ id: string; content: string; importedAt: string } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const [preppedPatients, setPreppedPatients] = useState<PreppedPatient[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced patient search
  const searchPatients = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.patients || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchPatients(searchQuery);
  }, [searchQuery, searchPatients]);

  // Check for existing prior note when patient is selected
  useEffect(() => {
    if (!selectedPatient) {
      setExistingNote(null);
      return;
    }

    const checkExisting = async () => {
      setCheckingExisting(true);
      try {
        const response = await fetch(`/api/prior-notes/patient/${selectedPatient.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.priorNotes && data.priorNotes.length > 0) {
            const latest = data.priorNotes[0];
            setExistingNote({
              id: latest.id,
              content: latest.note_content,
              importedAt: latest.imported_at,
            });
          } else {
            setExistingNote(null);
          }
        }
      } catch (error) {
        console.error('Error checking existing notes:', error);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExisting();
  }, [selectedPatient]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setShowDropdown(false);
    setNoteText('');
    setSaveMessage(null);
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
    setNoteText('');
    setSaveMessage(null);
    setExistingNote(null);
    searchInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!selectedPatient || !noteText.trim()) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/prior-notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          noteContent: noteText.trim(),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      const data = await response.json();

      if (data.isDuplicate) {
        setSaveMessage({ type: 'info', text: 'This note was already imported for this patient.' });
      } else {
        setSaveMessage({ type: 'success', text: 'Prior note saved.' });
      }

      // Add to prepped list (avoid duplicates)
      setPreppedPatients((prev) => {
        const exists = prev.some((p) => p.patient.id === selectedPatient.id);
        const entry: PreppedPatient = {
          patient: selectedPatient,
          noteId: data.priorNote.id,
          savedAt: new Date().toISOString(),
          preview: noteText.trim().slice(0, 120),
          isDuplicate: data.isDuplicate,
        };
        if (exists) {
          return prev.map((p) => (p.patient.id === selectedPatient.id ? entry : p));
        }
        return [entry, ...prev];
      });

      // Clear for next patient
      setSelectedPatient(null);
      setNoteText('');
      setExistingNote(null);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save note',
      });
    } finally {
      setSaving(false);
    }
  };

  const wordCount = noteText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileText className="text-[var(--accent-warm)]" size={24} />
          <h1 className="text-xl font-heading text-[var(--text-primary)]">Note Prep</h1>
          {preppedPatients.length > 0 && (
            <span className="text-[var(--text-muted)] text-sm">
              {preppedPatients.length} prepped
            </span>
          )}
        </div>

        {/* Add Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] p-5 space-y-4">
          {/* Patient Search */}
          {!selectedPatient ? (
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm text-[var(--text-muted)] mb-1">Patient</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                  placeholder="Search patient by name..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-spin" size={16} />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded max-h-60 overflow-y-auto">
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                    >
                      <p className="text-[var(--text-primary)] font-medium text-sm">
                        {patient.last_name}, {patient.first_name}
                      </p>
                      {patient.date_of_birth && (
                        <p className="text-[var(--text-muted)] text-xs mt-0.5">
                          DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchQuery.trim() && !searching && searchResults.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-4 py-3">
                  <p className="text-[var(--text-muted)] text-sm">No patients found</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Patient */}
              <div className="flex items-center justify-between bg-[var(--bg-surface)] rounded px-4 py-3">
                <div>
                  <p className="text-[var(--text-primary)] font-medium">
                    {selectedPatient.last_name}, {selectedPatient.first_name}
                  </p>
                  {selectedPatient.date_of_birth && (
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">
                      DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Existing Note Info */}
              {checkingExisting && (
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                  <Loader2 size={12} className="animate-spin" />
                  Checking for existing prior note...
                </div>
              )}

              {existingNote && !checkingExisting && (
                <div className="bg-[var(--info-bg)] border border-blue-500/20 rounded px-4 py-3">
                  <p className="text-[var(--info-text)] text-xs font-medium mb-1">Already has a prior note</p>
                  <pre className="text-[var(--text-muted)] text-xs whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
                    {existingNote.content.slice(0, 300)}
                    {existingNote.content.length > 300 ? '...' : ''}
                  </pre>
                  <p className="text-[var(--info-text)] text-xs mt-1 opacity-50">
                    Imported {new Date(existingNote.importedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Note Textarea */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">
                  Paste prior Epic note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Paste the patient's last Epic note here..."
                  rows={10}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] font-mono text-sm focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{wordCount} words</p>
              </div>

              {/* Save Message */}
              {saveMessage && (
                <div
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded ${
                    saveMessage.type === 'success'
                      ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                      : saveMessage.type === 'info'
                        ? 'bg-[var(--info-bg)] text-[var(--info-text)]'
                        : 'bg-[var(--error-bg)] text-[var(--error-text)]'
                  }`}
                >
                  {saveMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  {saveMessage.text}
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !noteText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--text-primary)] rounded font-semibold text-sm hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ClipboardPaste size={16} />
                    Save Prior Note
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Prepped Patients List */}
        {preppedPatients.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-[var(--text-muted)] font-medium">Prepped this session</h2>
            {preppedPatients.map((pp) => (
              <div
                key={pp.noteId}
                className="bg-[var(--bg-surface)] border border-[var(--success-border)] rounded-[2px] px-4 py-3 flex items-start gap-3"
              >
                <CheckCircle2 className="text-[var(--success-text)] mt-0.5 flex-shrink-0" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-primary)] font-medium text-sm">
                    {pp.patient.last_name}, {pp.patient.first_name}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs font-mono mt-1 truncate">
                    {pp.preview}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    {pp.isDuplicate ? 'Already imported' : 'Saved'}{' '}
                    {new Date(pp.savedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state hint */}
        {preppedPatients.length === 0 && !selectedPatient && (
          <div className="text-center py-8">
            <ClipboardPaste className="text-[var(--text-muted)] mx-auto mb-3" size={40} />
            <p className="text-[var(--text-muted)] text-sm">
              Search for a patient above, paste their last Epic note, and save.
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Saved notes auto-populate in the workflow for Follow-up and TOC visits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
