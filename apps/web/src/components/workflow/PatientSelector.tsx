'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Plus, Search, Calendar, Video, Clock } from 'lucide-react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string;
  notes?: string;
  encounter_count?: number;
}

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onCreateEncounter?: (patient: Patient, startTime: Date, endTime: Date) => void;
  setting?: string;
  visitType?: string;
}

export default function PatientSelector({
  selectedPatient,
  onPatientSelect,
  onCreateEncounter,
  setting,
  visitType,
}: PatientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
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
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.dateOfBirth) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          dateOfBirth: newPatient.dateOfBirth,
          mrn: newPatient.mrn || undefined,
          notes: newPatient.notes || undefined,
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

  // Create encounter with Google Calendar
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

        // Open Google Meet link if available
        if (data.encounter?.meet_link) {
          window.open(data.encounter.meet_link, '_blank');
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
                          DOB: {format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}
                          {patient.mrn && ` • MRN: ${patient.mrn}`}
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
                      DOB: {format(new Date(selectedPatient.date_of_birth), 'MM/dd/yyyy')}
                      {selectedPatient.mrn && ` • MRN: ${selectedPatient.mrn}`}
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

            {/* Create Encounter Button */}
            {setting && visitType && (
              <button
                onClick={() => setShowEncounterModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors"
              >
                <Calendar size={18} />
                Create Encounter & Meet Link
              </button>
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

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  Date of Birth <span className="text-red-500">*</span>
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
                  MRN (Optional)
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