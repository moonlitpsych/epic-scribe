'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Archive
} from 'lucide-react';
import type { DEPresentation, PresentationStatus } from '@/types/designated-examiner';

export default function PresentationsListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [presentations, setPresentations] = useState<DEPresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PresentationStatus | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch presentations
  useEffect(() => {
    if (!session) return;
    fetchPresentations();
  }, [session]);

  const fetchPresentations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/designated-examiner/presentation');
      if (response.ok) {
        const data = await response.json();
        setPresentations(data);
      }
    } catch (error) {
      console.error('Failed to fetch presentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this presentation?')) {
      return;
    }

    setDeleteId(id);
    try {
      const response = await fetch(`/api/designated-examiner/presentation/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPresentations(prev => prev.filter(p => p.id !== id));
      } else {
        alert('Failed to delete presentation');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete presentation');
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PresentationStatus) => {
    try {
      const response = await fetch(`/api/designated-examiner/presentation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationStatus: newStatus })
      });

      if (response.ok) {
        setPresentations(prev => prev.map(p =>
          p.id === id ? { ...p, presentation_status: newStatus } : p
        ));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Filter presentations
  const filteredPresentations = presentations.filter(p => {
    const matchesSearch = !searchTerm ||
      p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      p.presentation_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: PresentationStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'presented':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: PresentationStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'presented':
        return 'bg-blue-100 text-blue-700';
      case 'archived':
        return 'bg-gray-50 text-gray-500';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading presentations...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/designated-examiner')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-semibold">My Presentations</h1>
              <span className="text-sm text-gray-500">
                {presentations.length} total
              </span>
            </div>

            <Link
              href="/designated-examiner/presentation"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Presentation
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient name..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PresentationStatus | 'all')}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="presented">Presented</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Presentations Grid */}
        {filteredPresentations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No presentations found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first presentation to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                href="/designated-examiner/presentation"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Presentation
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPresentations.map((presentation) => (
              <div
                key={presentation.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Patient Name & Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {presentation.patient_name || 'Unnamed Patient'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {presentation.commitment_type} commitment
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(presentation.presentation_status)}`}>
                      {getStatusIcon(presentation.presentation_status)}
                      {presentation.presentation_status}
                    </span>
                  </div>

                  {/* Hearing Date */}
                  {presentation.hearing_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Calendar className="h-4 w-4" />
                      Hearing: {new Date(presentation.hearing_date).toLocaleDateString()}
                    </div>
                  )}

                  {/* Last Updated */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="h-4 w-4" />
                    Updated: {new Date(presentation.updated_at).toLocaleString()}
                  </div>

                  {/* Criteria Summary */}
                  {presentation.criteria_assessment && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-600 mb-1">Criteria Met:</div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const met = presentation.criteria_assessment?.[`meets_criterion_${num}` as keyof typeof presentation.criteria_assessment];
                          return (
                            <div
                              key={num}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                met ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                              }`}
                            >
                              {num}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/designated-examiner/presentation?id=${presentation.id}`}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-center text-sm font-medium"
                    >
                      Edit
                    </Link>

                    <select
                      value={presentation.presentation_status}
                      onChange={(e) => handleStatusChange(presentation.id, e.target.value as PresentationStatus)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="ready">Ready</option>
                      <option value="presented">Presented</option>
                      <option value="archived">Archived</option>
                    </select>

                    <button
                      onClick={() => handleDelete(presentation.id)}
                      disabled={deleteId === presentation.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}