'use client';

import { useState, useEffect } from 'react';

interface Payer {
  id: string;
  name: string;
  payer_type?: string;
}

interface PayerSearchViewProps {
  slug: string;
  onSelect: (payer: { id: string; name: string }) => void;
}

export function PayerSearchView({ slug, onSelect }: PayerSearchViewProps) {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPayers() {
      try {
        const res = await fetch(`/api/booking/${slug}/payers`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load insurance providers');
          return;
        }
        const data = await res.json();
        setPayers(data.payers || []);
      } catch {
        setError('Failed to load insurance providers');
      } finally {
        setLoading(false);
      }
    }
    fetchPayers();
  }, [slug]);

  const hasSearch = search.trim().length >= 2;
  const filtered = hasSearch
    ? payers.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--book-error)]">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-medium mb-1">Who is your insurance provider?</h2>
      <p className="text-sm text-[var(--book-text-muted)] mb-6">
        Select your insurance or choose self-pay below.
      </p>

      {/* Self-pay option */}
      <button
        onClick={() => onSelect({ id: 'self-pay', name: 'Self-Pay / Cash' })}
        className="w-full text-left px-4 py-3 mb-4 rounded-lg border-2 border-dashed border-[var(--book-border)] hover:border-[var(--book-accent)] hover:bg-[var(--book-accent)]/5 transition-colors"
      >
        <span className="font-medium">Self-Pay / Cash</span>
        <span className="block text-xs text-[var(--book-text-muted)] mt-0.5">No insurance — pay out of pocket</span>
      </button>

      {/* Search input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search insurance providers..."
          className="w-full px-4 py-3 rounded-lg border border-[var(--book-border)] bg-[var(--book-surface)] text-[var(--book-text)] placeholder:text-[var(--book-text-muted)] focus:outline-none focus:border-[var(--book-border-focus)] focus:ring-1 focus:ring-[var(--book-border-focus)]"
          autoFocus
        />
      </div>

      {/* Payer list — only shown after typing 2+ characters */}
      {hasSearch && !loading && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-[var(--book-text-muted)]">
              No matching providers found
            </p>
          ) : (
            filtered.map((payer) => (
              <button
                key={payer.id}
                onClick={() => onSelect({ id: payer.id, name: payer.name })}
                className="w-full text-left px-4 py-3 rounded-lg border border-[var(--book-border)] bg-[var(--book-surface)] hover:border-[var(--book-accent)] hover:bg-[var(--book-accent)]/5 transition-colors"
              >
                <span className="font-medium">{payer.name}</span>
                {payer.payer_type && (
                  <span className="ml-2 text-xs text-[var(--book-text-muted)]">{payer.payer_type}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
