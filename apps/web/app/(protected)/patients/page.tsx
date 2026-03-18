'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, Users, RefreshCw } from 'lucide-react';

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

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    mrn: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (query = '') => {
    try {
      setLoading(true);
      setError(null);

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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCreating(true);

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      // Reset form and close modal
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        mrn: '',
        email: '',
        notes: '',
      });
      setShowAddModal(false);

      // Refresh patients list
      await fetchPatients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  if (loading && patients.length === 0) {
    return (
      <div className="py-12 flex justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent" />
          <p className="mt-4 text-[var(--text-secondary)]">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading text-[var(--text-primary)] tracking-tight">Patients</h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                Select a patient to view their profile, notes, and encounters
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors font-medium"
            >
              <Plus size={18} />
              Add Patient
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by first name or last name..."
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchPatients();
                }}
                className="px-4 py-2.5 border border-[var(--border-default)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="mb-6 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-4">
            <p className="text-[var(--error-text)]">{error}</p>
            <button
              onClick={() => fetchPatients()}
              className="mt-2 text-sm text-[var(--error-text)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {patients.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-12 text-center">
            <Users className="mx-auto text-[var(--text-muted)] mb-4" size={48} />
            <p className="text-[var(--text-secondary)]">
              {searchQuery ? `No patients found matching "${searchQuery}"` : 'No patients yet.'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Click &quot;Add Patient&quot; to create your first patient record.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden">
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    MRN
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                      {patient.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {patient.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {formatDate(patient.date_of_birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {calculateAge(patient.date_of_birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {patient.mrn || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          patient.active
                            ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                            : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)]'
                        }`}
                      >
                        {patient.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => fetchPatients()}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            Showing {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Add Patient Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-surface)] rounded-[2px] max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading text-[var(--text-primary)] tracking-tight">Add New Patient</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    MRN <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mrn}
                    onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Email <span className="text-[var(--text-muted)] font-normal">(for IntakeQ)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Required for IntakeQ push"
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 border border-[var(--border-default)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? 'Creating...' : 'Add Patient'}
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
