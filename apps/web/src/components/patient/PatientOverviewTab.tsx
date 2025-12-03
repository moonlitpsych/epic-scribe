'use client';

import { useState } from 'react';
import { Save, User, FileText, Calendar, Activity } from 'lucide-react';

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

interface PatientOverviewTabProps {
  patient: Patient;
  encounterCount: number;
  noteCount: number;
  onPatientUpdated: (patient: Patient) => void;
}

export default function PatientOverviewTab({
  patient,
  encounterCount,
  noteCount,
  onPatientUpdated,
}: PatientOverviewTabProps) {
  const [clinicalContext, setClinicalContext] = useState(patient.notes || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

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
      month: 'long',
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

  const handleContextChange = (value: string) => {
    setClinicalContext(value);
    setHasUnsavedChanges(true);
  };

  const handleSaveClinicalContext = async () => {
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
      onPatientUpdated(data.patient);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0A1F3D]/10">
              <User className="text-[#0A1F3D]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#5A6B7D]">Age</p>
              <p className="text-2xl font-semibold text-[#0A1F3D]">
                {calculateAge(patient.date_of_birth)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#E89C8A]/10">
              <Calendar className="text-[#E89C8A]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#5A6B7D]">Encounters</p>
              <p className="text-2xl font-semibold text-[#0A1F3D]">{encounterCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C5A882]/10">
              <FileText className="text-[#C5A882]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#5A6B7D]">Notes</p>
              <p className="text-2xl font-semibold text-[#0A1F3D]">{noteCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${patient.active ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Activity className={patient.active ? 'text-green-600' : 'text-gray-500'} size={20} />
            </div>
            <div>
              <p className="text-sm text-[#5A6B7D]">Status</p>
              <p className={`text-lg font-semibold ${patient.active ? 'text-green-600' : 'text-gray-500'}`}>
                {patient.active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">Demographics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-[#5A6B7D]">Full Name</label>
            <p className="text-[#0A1F3D] font-medium">
              {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div>
            <label className="text-sm text-[#5A6B7D]">Date of Birth</label>
            <p className="text-[#0A1F3D] font-medium">{formatDate(patient.date_of_birth)}</p>
          </div>
          <div>
            <label className="text-sm text-[#5A6B7D]">MRN</label>
            <p className="text-[#0A1F3D] font-medium">{patient.mrn || 'Not assigned'}</p>
          </div>
          <div>
            <label className="text-sm text-[#5A6B7D]">Record Created</label>
            <p className="text-[#0A1F3D] font-medium">{formatDateTime(patient.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Clinical Context */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0A1F3D]">Clinical Context</h3>
            <p className="text-sm text-[#5A6B7D] mt-1">
              Background info, treatment approach, key considerations - used to inform AI-generated notes
            </p>
          </div>
          <button
            onClick={handleSaveClinicalContext}
            disabled={!hasUnsavedChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hasUnsavedChanges && !saving
                ? 'bg-[#0A1F3D] text-white hover:bg-[#0A1F3D]/90'
                : 'bg-[#C5A882]/20 text-[#5A6B7D] cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Context'}
          </button>
        </div>

        <textarea
          value={clinicalContext}
          onChange={(e) => handleContextChange(e.target.value)}
          placeholder="Enter clinical context, background, ongoing treatment notes, key considerations..."
          className="w-full h-48 px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm bg-[#F5F1ED]/30"
        />

        <div className="mt-2 flex items-center justify-between text-xs text-[#5A6B7D]">
          <span>
            {clinicalContext.length} characters, {clinicalContext.split(/\s+/).filter((w) => w).length} words
          </span>
          {hasUnsavedChanges && <span className="text-[#E89C8A] font-medium">Unsaved changes</span>}
          {patient.updated_at && !hasUnsavedChanges && (
            <span>Last updated: {formatDateTime(patient.updated_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
