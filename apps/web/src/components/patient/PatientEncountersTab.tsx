'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Video, Clock, MapPin, FileText, ExternalLink, Sparkles } from 'lucide-react';

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

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

// Setting options for encounter creation
const SETTINGS = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Moonlit Psychiatry',
  'BHIDC therapy',
];

const VISIT_TYPES: Record<string, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
};

interface PatientEncountersTabProps {
  patient: Patient;
  encounters: Encounter[];
  onEncountersChanged: () => void;
  onGenerateNote: (encounterId: string) => void;
}

export default function PatientEncountersTab({
  patient,
  encounters,
  onEncountersChanged,
  onGenerateNote,
}: PatientEncountersTabProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(SETTINGS[0]);
  const [selectedVisitType, setSelectedVisitType] = useState(VISIT_TYPES[SETTINGS[0]][0]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-[var(--info-bg)] text-[var(--info-text)]';
      case 'completed':
        return 'bg-[var(--success-bg)] text-[var(--success-text)]';
      case 'cancelled':
        return 'bg-[var(--error-bg)] text-[var(--error-text)]';
      default:
        return 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]';
    }
  };

  const handleSettingChange = (setting: string) => {
    setSelectedSetting(setting);
    setSelectedVisitType(VISIT_TYPES[setting][0]);
  };

  const handleCreateEncounter = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Please select a date and time');
      return;
    }

    setCreating(true);
    try {
      const scheduledStart = new Date(`${scheduledDate}T${scheduledTime}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000); // 1 hour later

      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          setting: selectedSetting,
          visitType: selectedVisitType,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create encounter');
      }

      setShowCreateForm(false);
      setScheduledDate('');
      setScheduledTime('');
      onEncountersChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create encounter');
    } finally {
      setCreating(false);
    }
  };

  // Sort encounters by date (most recent first)
  const sortedEncounters = [...encounters].sort(
    (a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Encounters</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Schedule and manage patient encounters
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
        >
          <Plus size={18} />
          Schedule Encounter
        </button>
      </div>

      {/* Create Encounter Form */}
      {showCreateForm && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <h4 className="font-medium text-[var(--text-primary)] mb-4">New Encounter</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Setting */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Setting</label>
              <select
                value={selectedSetting}
                onChange={(e) => handleSettingChange(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              >
                {SETTINGS.map((setting) => (
                  <option key={setting} value={setting}>
                    {setting}
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Visit Type</label>
              <select
                value={selectedVisitType}
                onChange={(e) => setSelectedVisitType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              >
                {VISIT_TYPES[selectedSetting].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEncounter}
              disabled={creating || !scheduledDate || !scheduledTime}
              className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Encounter'}
            </button>
          </div>
        </div>
      )}

      {/* Encounters List */}
      {sortedEncounters.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-12 text-center">
          <Calendar className="mx-auto text-[var(--text-muted)] mb-4" size={48} />
          <p className="text-[var(--text-secondary)]">No encounters scheduled.</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Click &quot;Schedule Encounter&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEncounters.map((encounter) => (
            <div
              key={encounter.id}
              className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(encounter.status)}`}>
                      {encounter.status}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {encounter.visit_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {formatDateTime(encounter.scheduled_start)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {encounter.setting}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {encounter.meet_link && (
                    <a
                      href={encounter.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--success-bg)] text-[var(--success-text)] rounded hover:bg-[var(--bg-hover)] transition-colors text-sm"
                    >
                      <Video size={14} />
                      Join Meet
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => onGenerateNote(encounter.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] rounded hover:bg-[var(--accent-warm)]/20 transition-colors text-sm"
                  >
                    <Sparkles size={14} />
                    Generate Note
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
