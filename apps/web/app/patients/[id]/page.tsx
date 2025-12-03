'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Encounter {
  id: string;
  calendar_event_id: string;
  setting: string;
  visit_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meet_link: string | null;
}

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

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clinical context state
  const [clinicalContext, setClinicalContext] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add note form state
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteType, setNewNoteType] = useState<'clinical_note' | 'quick_memo'>('quick_memo');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && params.id) {
      fetchPatientDetails(params.id as string);
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, params.id]);

  const fetchPatientDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/patients/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch patient');
      }

      const data = await response.json();
      setPatient(data.patient);
      setEncounters(data.encounters || []);
      setClinicalContext(data.patient.notes || '');

      // Fetch patient notes
      await fetchPatientNotes(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientNotes = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}/notes`);
      if (response.ok) {
        const data = await response.json();
        setPatientNotes(data.notes || []);
      }
    } catch (err) {
      console.warn('Could not fetch patient notes:', err);
    }
  };

  const handleAddNote = async () => {
    if (!patient || !newNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/patients/${patient.id}/notes`, {
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

      // Reset form and refresh notes
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowAddNoteForm(false);
      await fetchPatientNotes(patient.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!patient || !confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/patients/${patient.id}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      await fetchPatientNotes(patient.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleSaveClinicalContext = async () => {
    if (!patient) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: clinicalContext }),
      });

      if (!response.ok) {
        throw new Error('Failed to save clinical context');
      }

      const data = await response.json();
      setPatient(data.patient);
      setHasUnsavedChanges(false);
      alert('Clinical context saved successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleContextChange = (value: string) => {
    setClinicalContext(value);
    setHasUnsavedChanges(true);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6 p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900">Patient Details</h1>
          <p className="text-gray-600">Please sign in with Google to view patient details.</p>
          <button
            onClick={() => signIn('google', { callbackUrl: `/patients/${params.id}` })}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Patient not found'}</p>
            <Link
              href="/patients"
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline inline-block"
            >
              Back to Patients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/patients"
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Patients
          </Link>
        </div>

        {/* Patient Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {patient.last_name}, {patient.first_name}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>
                  <strong>DOB:</strong> {formatDate(patient.date_of_birth)} (Age {calculateAge(patient.date_of_birth)})
                </span>
                {patient.mrn && (
                  <span>
                    <strong>MRN:</strong> {patient.mrn}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    patient.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {patient.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <Link
              href={`/encounters?patient=${patient.id}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4"></path>
              </svg>
              Create Encounter
            </Link>
          </div>
        </div>

        {/* Clinical Context Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Clinical Context</h2>
              <p className="text-sm text-gray-600 mt-1">
                Background info, treatment approach, key considerations — used to inform AI-generated notes
              </p>
            </div>
            <button
              onClick={handleSaveClinicalContext}
              disabled={!hasUnsavedChanges || saving}
              className={`px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                hasUnsavedChanges && !saving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              {saving ? 'Saving...' : 'Save Context'}
            </button>
          </div>

          <textarea
            value={clinicalContext}
            onChange={(e) => handleContextChange(e.target.value)}
            placeholder="Enter clinical context, background, ongoing treatment notes, key considerations..."
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{clinicalContext.length} characters, {clinicalContext.split(/\s+/).filter(w => w).length} words</span>
            {hasUnsavedChanges && (
              <span className="text-orange-600 font-medium">Unsaved changes</span>
            )}
            {patient.updated_at && !hasUnsavedChanges && (
              <span>Last updated: {formatDateTime(patient.updated_at)}</span>
            )}
          </div>
        </div>

        {/* Patient Notes Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Patient Notes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Clinical notes and quick memos for this patient
              </p>
            </div>
            <button
              onClick={() => setShowAddNoteForm(!showAddNoteForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4"></path>
              </svg>
              Add Note
            </button>
          </div>

          {/* Add Note Form */}
          {showAddNoteForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">New Note</h3>

              {/* Note Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewNoteType('quick_memo')}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                      newNoteType === 'quick_memo'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Quick Memo
                  </button>
                  <button
                    onClick={() => setNewNoteType('clinical_note')}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                      newNoteType === 'clinical_note'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Clinical Note
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Content */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter note content..."
                  rows={newNoteType === 'quick_memo' ? 3 : 6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddNoteForm(false);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !newNoteContent.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {patientNotes.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No notes yet. Click &quot;Add Note&quot; to create one.</p>
          ) : (
            <div className="space-y-4">
              {patientNotes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        note.note_type === 'clinical_note'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {note.note_type === 'clinical_note' ? 'Clinical Note' : 'Quick Memo'}
                      </span>
                      {note.title && (
                        <span className="font-medium text-gray-900">{note.title}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete note"
                    >
                      <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{note.content}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {formatDateTime(note.created_at)} by {note.created_by}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Encounter History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Encounter History</h2>

          {encounters.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No encounters yet.</p>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {encounters.map((encounter) => (
                    <tr key={encounter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(encounter.scheduled_start)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {encounter.setting}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {encounter.visit_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {encounter.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {encounter.meet_link && (
                          <a
                            href={encounter.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 mr-3"
                          >
                            Join Meet
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
