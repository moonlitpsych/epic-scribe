'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pill } from 'lucide-react';
import RxActionCard from './RxActionCard';

interface StagedAction {
  id: string;
  action_type: string;
  urgency: string;
  summary: string;
  details: Record<string, any>;
  transcript_excerpt: string | null;
  status: string;
  execution_result?: Record<string, any>;
  error_message?: string | null;
}

interface RxTabProps {
  encounterId: string;
  onRxActionsLoaded?: (count: number) => void;
}

export default function RxTab({ encounterId, onRxActionsLoaded }: RxTabProps) {
  const [rxActions, setRxActions] = useState<StagedAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRxActions = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions/staged?encounterId=${encodeURIComponent(encounterId)}`);
      if (res.ok) {
        const data = await res.json();
        const all: StagedAction[] = data.actions || [];
        const rx = all.filter((a) => a.action_type.startsWith('rx_') && a.status !== 'dismissed');
        setRxActions(rx);
        onRxActionsLoaded?.(rx.length);
      }
    } catch (err) {
      console.error('Error fetching Rx actions:', err);
    } finally {
      setLoading(false);
    }
  }, [encounterId, onRxActionsLoaded]);

  useEffect(() => {
    fetchRxActions();
  }, [fetchRxActions]);

  // Poll for new Rx actions (extraction may be in-flight)
  useEffect(() => {
    const interval = setInterval(fetchRxActions, 10000);
    return () => clearInterval(interval);
  }, [fetchRxActions]);

  async function handleApprove(id: string) {
    setRxActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );
    try {
      await fetch(`/api/actions/staged/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
    } catch {
      fetchRxActions();
    }
  }

  async function handleDismiss(id: string) {
    setRxActions((prev) => prev.filter((a) => a.id !== id));
    const newCount = rxActions.filter((a) => a.id !== id).length;
    onRxActionsLoaded?.(newCount);
    try {
      await fetch(`/api/actions/staged/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
    } catch {
      fetchRxActions();
    }
  }

  async function handleExecute(id: string) {
    setRxActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'executing' } : a))
    );
    try {
      const res = await fetch(`/api/actions/staged/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.status === 'completed') {
        setRxActions((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: 'completed', execution_result: data.execution_result }
              : a
          )
        );
      } else {
        setRxActions((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: 'failed', error_message: data.error || 'Execution failed' }
              : a
          )
        );
      }
    } catch {
      setRxActions((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'failed', error_message: 'Network error' }
            : a
        )
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-[var(--text-muted)] text-sm">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
        Loading prescriptions...
      </div>
    );
  }

  if (rxActions.length === 0) {
    return (
      <div className="py-12 text-center">
        <Pill size={32} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
        <p className="text-sm text-[var(--text-muted)]">
          No prescription actions yet. Generate a note to extract Rx suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Pill size={14} className="text-[#10b981]" />
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Prescriptions
        </h4>
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--accent-warm)] text-[var(--bg-base)]">
          {rxActions.length}
        </span>
      </div>
      {rxActions.map((action) => (
        <RxActionCard
          key={action.id}
          action={action}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          onExecute={handleExecute}
        />
      ))}
    </div>
  );
}
