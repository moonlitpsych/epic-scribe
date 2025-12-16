'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Plus, Search, Calendar, Video, Clock, Play, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string;
  phone?: string;
  email?: string;
  encounter_count?: number;
}

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onCreateEncounter?: (patient: Patient, startTime: Date, endTime: Date) => void;
  onEncounterCreated?: (encounter: any) => void; // Callback for successful creation
  setting?: string;
  visitType?: string;
}

export default function PatientSelector({
  selectedPatient,
  onPatientSelect,
  onCreateEncounter,
  onEncounterCreated,
  setting,
  visitType,
}: PatientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [isStartingNow, setIsStartingNow] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    mrn: '',
    notes: '',
  });

  // New encounter form
  const [encounterDate, setEncounterDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [encounterTime, setEncounterTime] = useState(
    format(new Date(), 'HH:mm')
  );
  const [encounterDuration, setEncounterDuration] = useState('60'); // minutes

  // Safe date formatting helper
  const formatDOB = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    return format(date, 'MM/dd/yyyy');
  };

  // Format patient age/DOB display
  const formatPatientAge = (patient: Patient) => {
    const dobFormatted = formatDOB(patient.date_of_birth);
    const age = patient.age;

    // Calculate age from DOB if not stored
    let displayAge = age;
    if (!displayAge && patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth);
      const today = new Date();
      displayAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        displayAge--;
      }
    }

    if (dobFormatted && displayAge) {
      return `DOB: ${dobFormatted} (Age: ${displayAge})`;
    } else if (dobFormatted) {
      return `DOB: ${dobFormatted}`;
    } else if (displayAge) {
      return `Age: ${displayAge}`;
    }
    return null;
  };

  // Load all patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
        setSearchResults(data.patients || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  // Search patients
  const searchPatients = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults(patients);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.patients || []);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [patients]
  );

  useEffect(() => {
    searchPatients(searchQuery);
  }, [searchQuery, searchPatients]);

  // Create new patient
  const handleCreatePatient = async () => {
    // Only first and last name are required
    if (!newPatient.firstName || !newPatient.lastName) {
      alert('Please fill in First Name and Last Name');
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          dob: newPatient.dateOfBirth || undefined,
          age: newPatient.age || undefined,
          medicaid_id: newPatient.mrn || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onPatientSelect(data.patient);
        setShowCreateModal(false);
        setNewPatient({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          age: '',
          mrn: '',
          notes: '',
        });
        loadPatients(); // Refresh the list
      } else {
        alert('Failed to create patient');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient');
    }
  };

  // Start appointment NOW - one-click to create and open Meet immediately
  const handleStartNow = async () => {
    if (!selectedPatient || isStartingNow) return;

    setIsStartingNow(true);

    // Create appointment starting now with 60-minute duration
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60000); // 60 minutes

    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          setting,
          visitType,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Notify parent component
        if (onEncounterCreated) {
          onEncounterCreated(data);
        }

        // Open Google Meet link immediately
        if (data.calendarEncounter?.meetLink) {
          window.open(data.calendarEncounter.meetLink, '_blank');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to start appointment');
      }
    } catch (error) {
      console.error('Error starting appointment:', error);
      alert('Failed to start appointment');
    } finally {
      setIsStartingNow(false);
    }
  };

  // Create encounter with Google Calendar (for scheduling later)
  const handleCreateEncounter = async () => {
    if (!selectedPatient) return;

    const startTime = new Date(`${encounterDate}T${encounterTime}`);
    const endTime = new Date(startTime.getTime() + parseInt(encounterDuration) * 60000);

    if (onCreateEncounter) {
      onCreateEncounter(selectedPatient, startTime, endTime);
    }

    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          setting,
          visitType,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowEncounterModal(false);

        // Notify parent component
        if (onEncounterCreated) {
          onEncounterCreated(data);
        }

        // Open Google Meet link if available
        if (data.calendarEncounter?.meetLink) {
          window.open(data.calendarEncounter.meetLink, '_blank');
        }
      } else {
        alert('Failed to create encounter');
      }
    } catch (error) {
      console.error('Error creating encounter:', error);
      alert('Failed to create encounter');
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient Selection Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">
          Select Patient
        </h3>

        {!selectedPatient ? (
          <>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5A6B7D]" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or MRN..."
                className="w-full pl-10 pr-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
              />
            </div>

            {/* Patient List */}
            <div className="max-h-60 overflow-y-auto border border-[#C5A882]/20 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-[#5A6B7D]">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => onPatientSelect(patient)}
                    className="w-full text-left p-3 hover:bg-[#F5F1ED] transition-colors border-b border-[#C5A882]/10 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0A1F3D]">
                          {patient.last_name}, {patient.first_name}
                        </p>
                        <p className="text-sm text-[#5A6B7D]">
                          {formatPatientAge(patient) || 'No DOB/Age'}
                          {patient.medicaid_id && ` • Medicaid ID: ${patient.medicaid_id}`}
                        </p>
                      </div>
                      {patient.encounter_count !== undefined && (
                        <span className="text-xs bg-[#F5F1ED] text-[#5A6B7D] px-2 py-1 rounded">
                          {patient.encounter_count} encounters
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-[#5A6B7D]">
                  No patients found
                </div>
              )}
            </div>

            {/* Add New Patient Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#d88777] transition-colors"
            >
              <Plus size={18} />
              Add New Patient
            </button>
          </>
        ) : (
          <>
            {/* Selected Patient Display */}
            <div className="bg-[#F5F1ED] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <User className="text-[#5A6B7D]" size={24} />
                  <div>
                    <p className="font-semibold text-[#0A1F3D]">
                      {selectedPatient.last_name}, {selectedPatient.first_name}
                    </p>
                    <p className="text-sm text-[#5A6B7D]">
                      {formatPatientAge(selectedPatient) || 'No DOB/Age'}
                      {selectedPatient.medicaid_id && ` • Medicaid ID: ${selectedPatient.medicaid_id}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onPatientSelect(null as any)}
                  className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D]"
                >
                  Change
                </button>
              </div>
              {selectedPatient.notes && (
                <p className="text-sm text-[#5A6B7D] mt-2 italic">
                  {selectedPatient.notes}
                </p>
              )}
            </div>

            {/* Quick Actions for Appointments */}
            {setting && visitType && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="text-emerald-600" size={20} />
                  <h4 className="text-sm font-semibold text-emerald-900">
                    Ready for Appointment
                  </h4>
                </div>
                <p className="text-xs text-emerald-700 mb-3">
                  {setting} • {visitType}
                </p>

                {/* Primary: Start Now - One Click */}
                <button
                  onClick={handleStartNow}
                  disabled={isStartingNow}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-base font-semibold rounded-lg hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mb-2"
                >
                  {isStartingNow ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Creating Meet...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Start Appointment Now
                    </>
                  )}
                </button>
                <p className="text-xs text-emerald-600 text-center mb-3">
                  One click: creates 60-min appointment and opens Google Meet
                </p>

                {/* Secondary: Schedule for Later */}
                <button
                  onClick={() => setShowEncounterModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-emerald-400 text-emerald-700 text-sm rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Calendar size={16} />
                  Schedule for Later
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#0A1F3D] mb-4">
              Add New Patient
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPatient.firstName}
                  onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPatient.lastName}
                  onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Date of Birth <span className="text-xs text-[#5A6B7D]">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newPatient.dateOfBirth}
                    onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Age <span className="text-xs text-[#5A6B7D]">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    placeholder="e.g., 35"
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  MRN <span className="text-xs text-[#5A6B7D]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newPatient.mrn}
                  onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                  placeholder="Any relevant clinical context..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePatient}
                className="flex-1 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#d88777]"
              >
                Create Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Encounter Modal */}
      {showEncounterModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#0A1F3D] mb-4">
              Schedule Encounter
            </h3>

            <div className="bg-[#F5F1ED] rounded-lg p-3 mb-4">
              <p className="text-sm text-[#5A6B7D]">Patient:</p>
              <p className="font-medium text-[#0A1F3D]">
                {selectedPatient.last_name}, {selectedPatient.first_name}
              </p>
              <p className="text-sm text-[#5A6B7D] mt-1">
                {setting} • {visitType}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={encounterDate}
                  onChange={(e) => setEncounterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={encounterTime}
                    onChange={(e) => setEncounterTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Duration (min)
                  </label>
                  <select
                    value={encounterDuration}
                    onChange={(e) => setEncounterDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A]"
                  >
                    <option value="30">30</option>
                    <option value="45">45</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Video size={18} />
                <p className="text-sm font-medium">Google Meet link will be created</p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                The encounter will be added to your Google Calendar with a Meet link
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEncounterModal(false)}
                className="flex-1 px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEncounter}
                className="flex-1 px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90"
              >
                Create & Open Meet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}