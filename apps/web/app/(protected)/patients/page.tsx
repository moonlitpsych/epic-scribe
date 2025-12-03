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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0A1F3D] border-r-transparent" />
          <p className="mt-4 text-[#5A6B7D]">Loading patients...</p>
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
              <h1 className="text-3xl font-serif text-[#0A1F3D]">Patients</h1>
              <p className="mt-2 text-[#5A6B7D]">
                Select a patient to view their profile, notes, and encounters
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors font-medium"
            >
              <Plus size={18} />
              Add Patient
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B7D]" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by first name or last name..."
                className="w-full pl-10 pr-4 py-2.5 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#C5A882] text-white rounded-lg hover:bg-[#C5A882]/90 transition-colors"
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
                className="px-4 py-2.5 border border-[#C5A882]/30 text-[#5A6B7D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => fetchPatients()}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {patients.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-12 text-center">
            <Users className="mx-auto text-[#C5A882] mb-4" size={48} />
            <p className="text-[#5A6B7D]">
              {searchQuery ? `No patients found matching "${searchQuery}"` : 'No patients yet.'}
            </p>
            <p className="mt-2 text-sm text-[#5A6B7D]">
              Click &quot;Add Patient&quot; to create your first patient record.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 overflow-hidden">
            <table className="min-w-full divide-y divide-[#C5A882]/20">
              <thead className="bg-[#F5F1ED]/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    MRN
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#0A1F3D] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#C5A882]/10">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-[#F5F1ED]/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0A1F3D]">
                      {patient.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0A1F3D]">
                      {patient.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5A6B7D]">
                      {formatDate(patient.date_of_birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5A6B7D]">
                      {calculateAge(patient.date_of_birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5A6B7D]">
                      {patient.mrn || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          patient.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
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
            className="flex items-center gap-2 text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <p className="text-xs text-[#5A6B7D]">
            Showing {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Add Patient Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif text-[#0A1F3D]">Add New Patient</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    MRN <span className="text-[#5A6B7D] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mrn}
                    onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                    Notes <span className="text-[#5A6B7D] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 border border-[#C5A882]/30 rounded-lg text-[#5A6B7D] hover:bg-[#F5F1ED] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
