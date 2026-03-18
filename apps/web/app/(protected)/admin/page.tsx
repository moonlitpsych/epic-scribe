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
      <main className="min-h-screen bg-[var(--bg-base)] px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--text-primary)] border-r-transparent" />
            <p className="mt-4 text-[var(--text-secondary)]">Loading admin data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <Link href="/workflow" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Workflow
          </Link>
          <Link href="/patients" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Patients
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-[var(--text-primary)] mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">
            Manage provider settings, IntakeQ credentials, and template configurations.
          </p>
          {currentProvider && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Logged in as: {currentProvider.first_name} {currentProvider.last_name}
              {isAdmin && <span className="ml-2 text-[var(--success-text)] font-medium">(Admin)</span>}
            </p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] text-[var(--error-text)]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[2px] text-[var(--success-text)]">
            {success}
          </div>
        )}

        {/* IntakeQ Credentials Section */}
        <section className="mb-8 bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">IntakeQ Credentials</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Configure your IntakeQ login credentials for automatic note pushing.
          </p>

          {currentProvider ? (
            <form onSubmit={saveCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  IntakeQ Email
                </label>
                <input
                  type="email"
                  value={credentials.login_email}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, login_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)]"
                  placeholder="your@intakeq-email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  IntakeQ Password
                </label>
                <input
                  type="password"
                  value={credentials.login_password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, login_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)]"
                  placeholder="Leave blank to keep existing"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Leave blank to keep existing password</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Default Template Name
                </label>
                <select
                  value={credentials.default_template_name}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, default_template_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)]"
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
                className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
              >
                {savingCredentials ? 'Saving...' : 'Save Credentials'}
              </button>
            </form>
          ) : (
            <p className="text-[var(--warning-text)]">
              Your account is not linked to a provider. Contact an admin to get access.
            </p>
          )}
        </section>

        {/* Linked Users Section (Admin only) */}
        {isAdmin && (
          <section className="mb-8 bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Linked Users</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Manage which NextAuth users are linked to which providers.
            </p>

            {/* Current Links Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-default)]">
                <thead className="bg-[var(--bg-surface-2)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Admin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-default)]">
                  {linkedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-[var(--text-muted)]">
                        No users linked yet
                      </td>
                    </tr>
                  ) : (
                    linkedUsers.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                          {link.nextauth_user_email}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {link.provider.first_name} {link.provider.last_name}
                          {link.provider.title && ` (${link.provider.title})`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {link.is_admin ? (
                            <span className="text-[var(--success-text)]">Yes</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Link Form */}
            <form onSubmit={linkUser} className="space-y-4 pt-4 border-t border-[var(--border-default)]">
              <h3 className="font-medium text-[var(--text-primary)]">Link New User</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={newLinkEmail}
                    onChange={(e) => setNewLinkEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)]"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Provider
                  </label>
                  <select
                    value={newLinkProviderId}
                    onChange={(e) => setNewLinkProviderId(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-warm)]"
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
                      className="h-4 w-4 text-[var(--accent-primary)] border-[var(--border-default)] rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Admin</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingLink}
                className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
              >
                {savingLink ? 'Linking...' : 'Link User'}
              </button>
            </form>
          </section>
        )}

        {/* Templates Overview Section */}
        <section className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">IntakeQ Templates</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Available IntakeQ note templates with field mappings.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                    Template Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                    Fields
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-default)]">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[var(--text-muted)]">
                      No templates configured. Run the seed migration to add templates.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">
                        {t.template_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {t.total_contenteditable_fields || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
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
