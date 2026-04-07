'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Check, Sparkles } from 'lucide-react';
import ActionCard from './ActionCard';
import LabActionCard from './LabActionCard';
import RxActionCard from './RxActionCard';

interface ActionItem {
  id: string;
  text: string;
  category: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

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

const CATEGORIES = [
  { value: 'referral', label: 'Referral', color: '#818cf8' },
  { value: 'prescription', label: 'Rx', color: '#10b981' },
  { value: 'lab', label: 'Lab', color: '#f59e0b' },
  { value: 'patient_education', label: 'Education', color: '#06b6d4' },
  { value: 'coordination', label: 'Coordination', color: '#a78bfa' },
  { value: 'follow_up', label: 'Follow-up', color: '#E89C8A' },
  { value: 'other', label: 'Other', color: '#6b7280' },
];

function getCategoryMeta(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
}

interface ActionsTabProps {
  encounterId: string;
  patientId?: string;
  onStagedActionsLoaded?: (count: number) => void;
}

export default function ActionsTab({ encounterId, patientId, onStagedActionsLoaded }: ActionsTabProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Staged actions (AI-extracted)
  const [stagedActions, setStagedActions] = useState<StagedAction[]>([]);
  const [stagedLoading, setStagedLoading] = useState(true);

  // Add form
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [adding, setAdding] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/action-items?encounterId=${encodeURIComponent(encounterId)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching action items:', err);
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  const fetchStagedActions = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions/staged?encounterId=${encodeURIComponent(encounterId)}`);
      if (res.ok) {
        const data = await res.json();
        const actions: StagedAction[] = data.actions || [];
        setStagedActions(actions);
        const activeCount = actions.filter((a) => a.status !== 'dismissed').length;
        onStagedActionsLoaded?.(activeCount);
      }
    } catch (err) {
      console.error('Error fetching staged actions:', err);
    } finally {
      setStagedLoading(false);
    }
  }, [encounterId, onStagedActionsLoaded]);

  useEffect(() => {
    fetchItems();
    fetchStagedActions();
  }, [fetchItems, fetchStagedActions]);

  // Poll for staged actions (extraction may be in-flight when tab opens)
  useEffect(() => {
    const interval = setInterval(fetchStagedActions, 10000);
    return () => clearInterval(interval);
  }, [fetchStagedActions]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  async function handleDismissStaged(id: string) {
    // Optimistic remove
    setStagedActions((prev) => prev.filter((a) => a.id !== id));
    const prevCount = stagedActions.filter((a) => a.status !== 'dismissed' && a.id !== id).length;
    onStagedActionsLoaded?.(prevCount);

    try {
      await fetch(`/api/actions/staged/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
    } catch {
      fetchStagedActions(); // Revert on error
    }
  }

  async function handleApproveStaged(id: string) {
    // Optimistic update
    setStagedActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );

    try {
      await fetch(`/api/actions/staged/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
    } catch {
      fetchStagedActions();
    }
  }

  async function handleExecuteStaged(id: string) {
    // Optimistic: set executing
    setStagedActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'executing' } : a))
    );

    try {
      const res = await fetch(`/api/actions/staged/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.status === 'completed') {
        setStagedActions((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: 'completed', execution_result: data.execution_result }
              : a
          )
        );
      } else {
        setStagedActions((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: 'failed', error_message: data.error || 'Execution failed' }
              : a
          )
        );
      }
    } catch {
      setStagedActions((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'failed', error_message: 'Network error' }
            : a
        )
      );
    }
  }

  async function handleAdd() {
    if (!newText.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId,
          patientId,
          text: newText.trim(),
          category: newCategory,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, data.item]);
        setNewText('');
        setNewCategory('other');
      }
    } catch (err) {
      console.error('Error adding action item:', err);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(item: ActionItem) {
    // Optimistic update
    const newCompleted = !item.completed;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : i
      )
    );

    try {
      await fetch(`/api/action-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed, completed_at: item.completed_at } : i))
      );
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
    } catch {
      fetchItems(); // Refetch on error
    }
  }

  async function handleEditSave(id: string) {
    if (!editText.trim()) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text: editText.trim() } : i)));
    setEditingId(null);

    try {
      await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      });
    } catch {
      fetchItems();
    }
  }

  const incomplete = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);
  const visibleStaged = stagedActions.filter((a) => a.status !== 'dismissed');

  if (loading && stagedLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-[var(--text-muted)] text-sm">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
        Loading actions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI-Suggested Actions */}
      {visibleStaged.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent-warm)]" />
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              AI-Suggested Actions
            </h4>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--accent-warm)] text-[var(--bg-base)]">
              {visibleStaged.length}
            </span>
          </div>
          <div className="space-y-2">
            {visibleStaged.map((action) =>
              action.action_type === 'lab' ? (
                <LabActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveStaged}
                  onDismiss={handleDismissStaged}
                  onExecute={handleExecuteStaged}
                />
              ) : action.action_type.startsWith('rx_') ? (
                <RxActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveStaged}
                  onDismiss={handleDismissStaged}
                  onExecute={handleExecuteStaged}
                />
              ) : (
                <ActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveStaged}
                  onDismiss={handleDismissStaged}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* Divider between AI and manual sections */}
      {visibleStaged.length > 0 && (
        <div className="border-t border-[var(--border-default)]" />
      )}

      {/* Add form */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Add an action item..."
            className="flex-1 px-3 py-2 text-sm border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-2 py-2 text-xs border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!newText.trim() || adding}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors font-medium disabled:opacity-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Items list */}
      {incomplete.length === 0 && completed.length === 0 && visibleStaged.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          No action items yet. Add one above or generate a note to extract AI suggestions.
        </div>
      )}

      {incomplete.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
          {incomplete.map((item) => {
            const cat = getCategoryMeta(item.category);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(item)}
                  className="flex-shrink-0 h-[18px] w-[18px] rounded border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-colors"
                />

                {/* Text */}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => handleEditSave(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 px-2 py-0.5 text-sm border border-[var(--accent-warm)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm text-[var(--text-primary)] cursor-pointer"
                    onDoubleClick={() => {
                      setEditingId(item.id);
                      setEditText(item.text);
                    }}
                  >
                    {item.text}
                  </span>
                )}

                {/* Category badge */}
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ color: cat.color, background: `${cat.color}15` }}
                >
                  {cat.label}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error-text)] transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed items */}
      {completed.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Completed ({completed.length})
          </h4>
          <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] divide-y divide-[var(--border-default)] opacity-60">
            {completed.map((item) => {
              const cat = getCategoryMeta(item.category);
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <button
                    onClick={() => handleToggle(item)}
                    className="flex-shrink-0 h-[18px] w-[18px] rounded border border-[var(--accent-primary)] bg-[var(--accent-primary)] flex items-center justify-center"
                  >
                    <Check size={12} className="text-[var(--text-inverse)]" />
                  </button>
                  <span className="flex-1 text-sm text-[var(--text-muted)] line-through">
                    {item.text}
                  </span>
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ color: cat.color, background: `${cat.color}15` }}
                  >
                    {cat.label}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error-text)] transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
