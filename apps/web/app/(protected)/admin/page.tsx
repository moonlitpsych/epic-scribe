'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Provider {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
}

interface LinkedUser {
  id: string;
  nextauth_user_email: string;
  provider_id: string;
  is_admin: boolean;
  provider: Provider;
}

interface IntakeQCredentials {
  login_email: string;
  login_password: string;
  default_template_name: string;
}

interface IntakeQTemplate {
  id: string;
  name: string;
  template_type: string;
  total_contenteditable_fields: number | null;
  description: string | null;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<IntakeQTemplate[]>([]);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [credentials, setCredentials] = useState<IntakeQCredentials>({
    login_email: '',
    login_password: '',
    default_template_name: '',
  });
  const [savingCredentials, setSavingCredentials] = useState(false);

  // Link user form
  const [newLinkEmail, setNewLinkEmail] = useState('');
  const [newLinkProviderId, setNewLinkProviderId] = useState('');
  const [newLinkIsAdmin, setNewLinkIsAdmin] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/data');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load data');
      }

      const data = await response.json();
      setLinkedUsers(data.linkedUsers || []);
      setAllProviders(data.allProviders || []);
      setTemplates(data.templates || []);
      setCurrentProvider(data.currentProvider || null);
      setIsAdmin(data.isAdmin || false);

      // Pre-fill credentials if they exist
      if (data.currentCredentials) {
        setCredentials({
          login_email: data.currentCredentials.login_email || '',
          login_password: '', // Don't show password
          default_template_name: data.currentCredentials.default_template_name || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProvider) return;

    try {
      setSavingCredentials(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: currentProvider.id,
          ...credentials,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save credentials');
      }

      setSuccess('IntakeQ credentials saved successfully!');
      setCredentials((prev) => ({ ...prev, login_password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
  }

  async function linkUser(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSavingLink(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newLinkEmail,
          providerId: newLinkProviderId,
          isAdmin: newLinkIsAdmin,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to link user');
      }

      setSuccess('User linked to provider successfully!');
      setNewLinkEmail('');
      setNewLinkProviderId('');
      setNewLinkIsAdmin(false);
      loadData(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link user');
    } finally {
      setSavingLink(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent" />
            <p className="mt-4 text-gray-600">Loading admin data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <Link href="/workflow" className="text-sm text-gray-600 hover:text-gray-900">
            Workflow
          </Link>
          <Link href="/patients" className="text-sm text-gray-600 hover:text-gray-900">
            Patients
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage provider settings, IntakeQ credentials, and template configurations.
          </p>
          {currentProvider && (
            <p className="mt-2 text-sm text-gray-500">
              Logged in as: {currentProvider.first_name} {currentProvider.last_name}
              {isAdmin && <span className="ml-2 text-green-600 font-medium">(Admin)</span>}
            </p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* IntakeQ Credentials Section */}
        <section className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">IntakeQ Credentials</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure your IntakeQ login credentials for automatic note pushing.
          </p>

          {currentProvider ? (
            <form onSubmit={saveCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IntakeQ Email
                </label>
                <input
                  type="email"
                  value={credentials.login_email}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, login_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@intakeq-email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IntakeQ Password
                </label>
                <input
                  type="password"
                  value={credentials.login_password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, login_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to keep existing"
                />
                <p className="mt-1 text-xs text-gray-500">Leave blank to keep existing password</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Template Name
                </label>
                <select
                  value={credentials.default_template_name}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, default_template_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.template_type})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingCredentials}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCredentials ? 'Saving...' : 'Save Credentials'}
              </button>
            </form>
          ) : (
            <p className="text-amber-600">
              Your account is not linked to a provider. Contact an admin to get access.
            </p>
          )}
        </section>

        {/* Linked Users Section (Admin only) */}
        {isAdmin && (
          <section className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Linked Users</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage which NextAuth users are linked to which providers.
            </p>

            {/* Current Links Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Admin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {linkedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                        No users linked yet
                      </td>
                    </tr>
                  ) : (
                    linkedUsers.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {link.nextauth_user_email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {link.provider.first_name} {link.provider.last_name}
                          {link.provider.title && ` (${link.provider.title})`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {link.is_admin ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Link Form */}
            <form onSubmit={linkUser} className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-gray-900">Link New User</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={newLinkEmail}
                    onChange={(e) => setNewLinkEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={newLinkProviderId}
                    onChange={(e) => setNewLinkProviderId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select provider...</option>
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                        {p.title && ` (${p.title})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newLinkIsAdmin}
                      onChange={(e) => setNewLinkIsAdmin(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Admin</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingLink}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {savingLink ? 'Linking...' : 'Link User'}
              </button>
            </form>
          </section>
        )}

        {/* Templates Overview Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">IntakeQ Templates</h2>
          <p className="text-sm text-gray-600 mb-4">
            Available IntakeQ note templates with field mappings.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Template Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fields
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                      No templates configured. Run the seed migration to add templates.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {t.template_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.total_contenteditable_fields || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {t.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
