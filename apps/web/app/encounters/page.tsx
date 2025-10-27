'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CalendarEncounter } from '@/google-calendar';

export default function EncountersPage() {
  const { data: session, status } = useSession();
  const [encounters, setEncounters] = useState<CalendarEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingMeet, setStartingMeet] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedEncounter, setExpandedEncounter] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, any[]>>({});
  const [loadingTranscripts, setLoadingTranscripts] = useState<Record<string, boolean>>({});
  const [deletingEncounter, setDeletingEncounter] = useState<string | null>(null);
  const [encounterToDelete, setEncounterToDelete] = useState<CalendarEncounter | null>(null);

  // Patient selection state
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showAddPatientInline, setShowAddPatientInline] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    setting: 'BHIDC therapy',
    visitType: 'Follow-up',
    date: '',
    time: '',
    duration: '50',
  });

  // Inline patient form state
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEncounters();
      fetchPatients();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchPatients = async (query = '') => {
    try {
      setLoadingPatients(true);

      const url = query
        ? `/api/patients?q=${encodeURIComponent(query)}`
        : '/api/patients';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handlePatientSearch = (query: string) => {
    setPatientSearchQuery(query);
    if (query.trim()) {
      fetchPatients(query);
    } else {
      fetchPatients();
    }
  };

  const handleCreatePatientInline = async () => {
    if (!newPatientData.firstName || !newPatientData.lastName || !newPatientData.dateOfBirth) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreatingPatient(true);

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const { patient } = await response.json();

      // Add new patient to the list and select it
      setPatients([patient, ...patients]);
      setFormData({ ...formData, patientId: patient.id });

      // Reset inline form
      setNewPatientData({ firstName: '', lastName: '', dateOfBirth: '' });
      setShowAddPatientInline(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setCreatingPatient(false);
    }
  };

  const fetchEncounters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/encounters');

      if (!response.ok) {
        throw new Error('Failed to fetch encounters');
      }

      const data = await response.json();
      setEncounters(data.encounters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId) {
      alert('Please select a patient');
      return;
    }

    try {
      setCreating(true);

      // Combine date and time into ISO string
      const startDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      const endDateTime = new Date(
        new Date(`${formData.date}T${formData.time}`).getTime() +
          parseInt(formData.duration) * 60000
      ).toISOString();

      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formData.patientId,
          setting: formData.setting,
          visitType: formData.visitType,
          startTime: startDateTime,
          endTime: endDateTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create encounter');
      }

      // Reset form and close modal
      setFormData({
        patientId: '',
        setting: 'BHIDC therapy',
        visitType: 'Follow-up',
        date: '',
        time: '',
        duration: '50',
      });
      setShowCreateModal(false);
      setShowAddPatientInline(false);

      // Refresh encounters list
      await fetchEncounters();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create encounter');
    } finally {
      setCreating(false);
    }
  };

  const handleFetchTranscripts = async (encounterId: string) => {
    if (transcripts[encounterId]) {
      // Already fetched, just toggle expansion
      setExpandedEncounter(expandedEncounter === encounterId ? null : encounterId);
      return;
    }

    try {
      setLoadingTranscripts({ ...loadingTranscripts, [encounterId]: true });
      setExpandedEncounter(encounterId);

      const response = await fetch(`/api/encounters/${encounterId}/transcripts`);

      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }

      const data = await response.json();
      setTranscripts({ ...transcripts, [encounterId]: data.transcripts || [] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch transcripts');
      setExpandedEncounter(null);
    } finally {
      setLoadingTranscripts({ ...loadingTranscripts, [encounterId]: false });
    }
  };

  const handleStartMeet = async (encounterId: string, existingLink?: string) => {
    if (existingLink) {
      // If Meet link already exists, just open it
      window.open(existingLink, '_blank');
      return;
    }

    try {
      setStartingMeet(encounterId);

      const response = await fetch(`/api/encounters/${encounterId}/start-meet`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start Meet');
      }

      const data = await response.json();

      if (data.meetLink) {
        window.open(data.meetLink, '_blank');
        // Refresh encounters to update the Meet link
        await fetchEncounters();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start Meet');
    } finally {
      setStartingMeet(null);
    }
  };

  const handleDeleteEncounter = async () => {
    if (!encounterToDelete) return;

    try {
      setDeletingEncounter(encounterToDelete.id);

      const response = await fetch(`/api/encounters/${encounterToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete encounter');
      }

      // Close confirmation modal
      setEncounterToDelete(null);

      // Refresh encounters list
      await fetchEncounters();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete encounter');
    } finally {
      setDeletingEncounter(null);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading encounters...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6 p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900">Encounters</h1>
          <p className="text-gray-600">
            Please sign in with Google to view your upcoming encounters.
          </p>
          <button
            onClick={() => signIn('google', { callbackUrl: '/encounters' })}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upcoming Encounters</h1>
            <p className="mt-2 text-sm text-gray-600">
              Next 7 days from your Google Calendar
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4"></path>
            </svg>
            New Encounter
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchEncounters}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {encounters.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              No upcoming encounters in the next 7 days.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Create calendar events with format: "Patient Last, First — Setting — Visit Type"
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Setting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transcripts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {encounters.map((encounter) => (
                  <React.Fragment key={encounter.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(encounter.start)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {encounter.patient || encounter.summary || 'Unknown'}
                      {!encounter.patient && encounter.summary && (
                        <div className="text-xs text-gray-500 mt-1">
                          Raw title: "{encounter.summary}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {encounter.setting || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {encounter.visitType || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleFetchTranscripts(encounter.id)}
                        disabled={loadingTranscripts[encounter.id]}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        {loadingTranscripts[encounter.id] ? (
                          'Loading...'
                        ) : transcripts[encounter.id] ? (
                          `${transcripts[encounter.id].length} found`
                        ) : (
                          'Check Drive'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() =>
                          handleStartMeet(encounter.id, encounter.meetLink)
                        }
                        disabled={startingMeet === encounter.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {startingMeet === encounter.id ? (
                          <>
                            <svg
                              className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Starting...
                          </>
                        ) : encounter.meetLink ? (
                          'Join Meet'
                        ) : (
                          'Start Meet'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setEncounterToDelete(encounter)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        <span className="ml-1">Delete</span>
                      </button>
                    </td>
                  </tr>
                  {expandedEncounter === encounter.id && transcripts[encounter.id] && (
                    <tr key={`${encounter.id}-expanded`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          {transcripts[encounter.id].length === 0 ? (
                            <p className="text-sm text-gray-600">
                              No transcripts found in Google Drive for this encounter.
                            </p>
                          ) : (
                            transcripts[encounter.id].map((transcript: any) => (
                              <div
                                key={transcript.id}
                                className="bg-white p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{transcript.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Modified: {new Date(transcript.modifiedTime).toLocaleString()}
                                    </p>
                                  </div>
                                  <a
                                    href={`/generate?encounterId=${encounter.id}&transcriptId=${transcript.id}&patient=${encodeURIComponent(encounter.patient || '')}&setting=${encodeURIComponent(encounter.setting || '')}&visitType=${encodeURIComponent(encounter.visitType || '')}`}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                                  >
                                    Generate Note
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={fetchEncounters}
            disabled={loading}
            className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <p className="text-xs text-gray-500">
            Showing {encounters.length} encounter{encounters.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Delete Confirmation Modal */}
        {encounterToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
                <button
                  onClick={() => setEncounterToDelete(null)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={deletingEncounter !== null}
                >
                  <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete this encounter?
                </p>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{encounterToDelete.patient || encounterToDelete.summary}</p>
                  <p className="text-xs text-gray-600 mt-1">{encounterToDelete.setting} — {encounterToDelete.visitType}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(encounterToDelete.start)}</p>
                </div>
                <p className="text-sm text-red-600 mt-3">
                  This will permanently delete the encounter from your Google Calendar.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEncounterToDelete(null)}
                  disabled={deletingEncounter !== null}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEncounter}
                  disabled={deletingEncounter !== null}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingEncounter ? 'Deleting...' : 'Delete Encounter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Encounter Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">New Encounter</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateEncounter} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient *
                  </label>

                  {!showAddPatientInline ? (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={patientSearchQuery}
                          onChange={(e) => handlePatientSearch(e.target.value)}
                          placeholder="Search patients..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Patient Dropdown */}
                      {patients.length > 0 && (
                        <select
                          value={formData.patientId}
                          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                          required
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a patient...</option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.last_name}, {patient.first_name} ({new Date(patient.date_of_birth).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAddPatientInline(true)}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        + Or add new patient
                      </button>
                    </>
                  ) : (
                    <div className="border border-indigo-200 rounded-md p-4 bg-indigo-50 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-indigo-900">Add New Patient</p>
                        <button
                          type="button"
                          onClick={() => setShowAddPatientInline(false)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={newPatientData.firstName}
                            onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={newPatientData.lastName}
                            onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={newPatientData.dateOfBirth}
                          onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCreatePatientInline}
                        disabled={creatingPatient}
                        className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {creatingPatient ? 'Creating Patient...' : 'Create & Select Patient'}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Setting
                  </label>
                  <select
                    value={formData.setting}
                    onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>HMHI Downtown RCC</option>
                    <option>Redwood Clinic MHI</option>
                    <option>Davis Behavioral Health</option>
                    <option>Moonlit Psychiatry</option>
                    <option>BHIDC therapy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Type
                  </label>
                  <select
                    value={formData.visitType}
                    onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Intake</option>
                    <option>Transfer of Care</option>
                    <option>Follow-up</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    step="5"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create Encounter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
