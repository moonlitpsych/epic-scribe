'use client';

import { useState, useCallback, useEffect } from 'react';
import { Save, User, FileText, Calendar, Activity, Pencil, X, Check, QrCode, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn: string | null;
  email: string | null;
  primary_payer_id?: string | null;
  primary_payer_name?: string | null;
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

  // Demographics editing state
  const [editingDemographics, setEditingDemographics] = useState(false);
  const [editFirstName, setEditFirstName] = useState(patient.first_name);
  const [editLastName, setEditLastName] = useState(patient.last_name);
  const [editDob, setEditDob] = useState(patient.date_of_birth?.split('T')[0] || '');
  const [editMrn, setEditMrn] = useState(patient.mrn || '');
  const [editEmail, setEditEmail] = useState(patient.email || '');
  const [editPayerId, setEditPayerId] = useState(patient.primary_payer_id || '');
  const [payers, setPayers] = useState<{ id: string; name: string; payer_type: string }[]>([]);
  const [savingDemographics, setSavingDemographics] = useState(false);

  useEffect(() => {
    fetch('/api/payers')
      .then((res) => res.json())
      .then((data) => setPayers(data.payers || []))
      .catch(() => {});
  }, []);

  // QR code state
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const generateQrCode = useCallback(async () => {
    const payload = JSON.stringify({
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
    });
    const url = await QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: { dark: '#0A1F3D', light: '#FFFFFF' },
    });
    setQrDataUrl(url);
    setShowQr(true);
  }, [patient.id, patient.first_name, patient.last_name]);

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

  const handleStartEditDemographics = () => {
    setEditFirstName(patient.first_name);
    setEditLastName(patient.last_name);
    setEditDob(patient.date_of_birth?.split('T')[0] || '');
    setEditMrn(patient.mrn || '');
    setEditEmail(patient.email || '');
    setEditPayerId(patient.primary_payer_id || '');
    setEditingDemographics(true);
  };

  const handleCancelEditDemographics = () => {
    setEditingDemographics(false);
  };

  const handleSaveDemographics = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      alert('First name and last name are required');
      return;
    }

    try {
      setSavingDemographics(true);

      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          dateOfBirth: editDob || null,
          mrn: editMrn.trim() || null,
          email: editEmail.trim() || null,
          primaryPayerId: editPayerId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update patient');
      }

      const data = await response.json();
      onPatientUpdated(data.patient);
      setEditingDemographics(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingDemographics(false);
    }
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
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[var(--bg-surface-2)]">
              <User className="text-[var(--text-primary)]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Age</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {calculateAge(patient.date_of_birth)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[var(--accent-warm)]/10">
              <Calendar className="text-[var(--accent-warm)]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Encounters</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{encounterCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#C5A882]/10">
              <FileText className="text-[#C5A882]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Notes</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{noteCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-[2px] ${patient.active ? 'bg-[var(--success-bg)]' : 'bg-[var(--bg-surface-2)]'}`}>
              <Activity className={patient.active ? 'text-[var(--success-text)]' : 'text-[var(--text-muted)]'} size={20} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Status</p>
              <p className={`text-lg font-semibold ${patient.active ? 'text-[var(--success-text)]' : 'text-[var(--text-muted)]'}`}>
                {patient.active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Demographics</h3>
          {!editingDemographics ? (
            <button
              onClick={handleStartEditDemographics}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEditDemographics}
                disabled={savingDemographics}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[2px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSaveDemographics}
                disabled={savingDemographics}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[2px] text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                <Check size={14} />
                {savingDemographics ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {editingDemographics ? (
            <>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">MRN</label>
                <input
                  type="text"
                  value={editMrn}
                  onChange={(e) => setEditMrn(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Required for IntakeQ push"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] block mb-1">Primary Payer</label>
                <select
                  value={editPayerId}
                  onChange={(e) => setEditPayerId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                >
                  <option value="">No payer</option>
                  {payers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Full Name</label>
                <p className="text-[var(--text-primary)] font-medium">
                  {patient.first_name} {patient.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Date of Birth</label>
                <p className="text-[var(--text-primary)] font-medium">
                  {patient.date_of_birth ? formatDate(patient.date_of_birth) : 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">MRN</label>
                <p className="text-[var(--text-primary)] font-medium">{patient.mrn || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Email</label>
                <p className="text-[var(--text-primary)] font-medium">{patient.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Primary Payer</label>
                <p className="text-[var(--text-primary)] font-medium">{patient.primary_payer_name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Record Created</label>
                <p className="text-[var(--text-primary)] font-medium">{formatDateTime(patient.created_at)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HealthKit Sync */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[var(--success-bg)]">
              <Smartphone className="text-[var(--success-text)]" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">HealthKit Sync</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Scan this QR code with the Epic Scribe iOS app to link health records
              </p>
            </div>
          </div>
        </div>

        {showQr && qrDataUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* Keep QR code on white background for scanability */}
            <div className="bg-white p-2 rounded-[2px]">
              <img src={qrDataUrl} alt="Patient QR Code" width={256} height={256} />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {patient.first_name} {patient.last_name}
            </p>
            <button
              onClick={() => setShowQr(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-[2px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X size={14} />
              Hide QR Code
            </button>
          </div>
        ) : (
          <button
            onClick={generateQrCode}
            className="flex items-center gap-2 px-4 py-2 rounded-[2px] text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            <QrCode size={16} />
            Show QR Code
          </button>
        )}
      </div>

      {/* Clinical Context */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Clinical Context</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Background info, treatment approach, key considerations - used to inform AI-generated notes
            </p>
          </div>
          <button
            onClick={handleSaveClinicalContext}
            disabled={!hasUnsavedChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-[2px] text-sm font-medium transition-all ${
              hasUnsavedChanges && !saving
                ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)]'
                : 'bg-[var(--border-default)] text-[var(--text-secondary)] cursor-not-allowed'
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
          className="w-full h-48 px-4 py-3 border border-[var(--border-default)] rounded-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent font-mono text-sm bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />

        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            {clinicalContext.length} characters, {clinicalContext.split(/\s+/).filter((w) => w).length} words
          </span>
          {hasUnsavedChanges && <span className="text-[var(--accent-warm)] font-medium">Unsaved changes</span>}
          {patient.updated_at && !hasUnsavedChanges && (
            <span>Last updated: {formatDateTime(patient.updated_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
