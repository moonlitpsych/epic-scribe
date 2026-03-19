'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Pill,
  TestTube2,
  HeartPulse,
  Stethoscope,
  ShieldAlert,
  Scissors,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  HealthKitClinicalData,
  MedicationSummary,
  LabResultSummary,
  VitalSignSummary,
  ConditionSummary,
  AllergySummary,
  ProcedureSummary,
  ClinicalNoteSummary,
} from '@epic-scribe/types';

interface ClinicalDataDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface DetailResponse {
  data: HealthKitClinicalData;
  lastSyncedAt: string | null;
  counts: Record<string, number>;
}

type TabKey = 'medications' | 'labs' | 'vitals' | 'conditions' | 'allergies' | 'procedures' | 'notes';

const TABS: { key: TabKey; label: string; icon: typeof Pill; dataKey: keyof HealthKitClinicalData }[] = [
  { key: 'medications', label: 'Medications', icon: Pill, dataKey: 'medications' },
  { key: 'labs', label: 'Labs', icon: TestTube2, dataKey: 'labResults' },
  { key: 'vitals', label: 'Vitals', icon: HeartPulse, dataKey: 'vitalSigns' },
  { key: 'conditions', label: 'Conditions', icon: Stethoscope, dataKey: 'conditions' },
  { key: 'allergies', label: 'Allergies', icon: ShieldAlert, dataKey: 'allergies' },
  { key: 'procedures', label: 'Procedures', icon: Scissors, dataKey: 'procedures' },
  { key: 'notes', label: 'Notes', icon: FileText, dataKey: 'clinicalNotes' },
];

const TAB_TO_COUNT_KEY: Record<TabKey, string> = {
  medications: 'medications',
  labs: 'labs',
  vitals: 'vitals',
  conditions: 'conditions',
  allergies: 'allergies',
  procedures: 'procedures',
  notes: 'notes',
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClinicalDataDetailModal({
  isOpen,
  onClose,
  patientId,
  patientName,
}: ClinicalDataDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('medications');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetch(`/api/clinical-data/detail?patientId=${patientId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load clinical data');
        return res.json();
      })
      .then((data: DetailResponse) => {
        setDetail(data);
        // Auto-select first tab with data
        const firstWithData = TABS.find(
          (t) => (data.counts[TAB_TO_COUNT_KEY[t.key]] || 0) > 0
        );
        if (firstWithData) setActiveTab(firstWithData.key);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const getCount = (tab: TabKey) => detail?.counts[TAB_TO_COUNT_KEY[tab]] || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] w-full max-w-4xl max-h-[85vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] font-heading">
              Health Records — {patientName}
            </h2>
            {detail?.lastSyncedAt && (
              <p className="text-sm text-[var(--text-muted)]">
                Last synced: {formatRelativeTime(detail.lastSyncedAt)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[2px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-[var(--error-text)]">
            {error}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 pb-0 overflow-x-auto border-b border-[var(--border-default)]">
              {TABS.map((tab) => {
                const count = getCount(tab.key);
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                      isActive
                        ? 'border-[var(--accent-warm)] text-[var(--accent-warm)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    } ${count === 0 ? 'opacity-40' : ''}`}
                  >
                    <Icon size={14} />
                    {tab.label}
                    <span className={`text-xs ${isActive ? 'text-[var(--accent-warm)]' : 'text-[var(--text-muted)]'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {renderTabContent(activeTab, detail?.data || {}, getCount(activeTab))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderTabContent(tab: TabKey, data: HealthKitClinicalData, count: number) {
  if (count === 0) {
    const labels: Record<TabKey, string> = {
      medications: 'medications',
      labs: 'lab results',
      vitals: 'vital signs',
      conditions: 'conditions',
      allergies: 'allergies',
      procedures: 'procedures',
      notes: 'clinical notes',
    };
    return (
      <p className="text-center text-[var(--text-muted)] py-12">
        No {labels[tab]} synced from Apple Health
      </p>
    );
  }

  switch (tab) {
    case 'medications':
      return <MedicationsTable meds={data.medications || []} />;
    case 'labs':
      return <LabsTable labs={data.labResults || []} />;
    case 'vitals':
      return <VitalsTable vitals={data.vitalSigns || []} />;
    case 'conditions':
      return <ConditionsTable conditions={data.conditions || []} />;
    case 'allergies':
      return <AllergiesTable allergies={data.allergies || []} />;
    case 'procedures':
      return <ProceduresTable procedures={data.procedures || []} />;
    case 'notes':
      return <NotesTable notes={data.clinicalNotes || []} />;
  }
}

// --- Table Components ---

function MedicationsTable({ meds }: { meds: MedicationSummary[] }) {
  // Sort: active first, then by name
  const sorted = [...meds].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Name</th>
            <th className="pb-2 pr-3 font-medium">Dose</th>
            <th className="pb-2 pr-3 font-medium">Route</th>
            <th className="pb-2 pr-3 font-medium">Frequency</th>
            <th className="pb-2 pr-3 font-medium">Status</th>
            <th className="pb-2 font-medium">Start Date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((med, i) => {
            const isStopped = med.status === 'stopped';
            return (
              <tr
                key={`${med.name}-${i}`}
                className={`border-b border-[var(--border-default)]/50 ${
                  isStopped ? 'opacity-50' : ''
                }`}
              >
                <td className={`py-2 pr-3 text-[var(--text-primary)] ${isStopped ? 'line-through' : ''}`}>
                  {med.name}
                  {med.prn && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]">
                      PRN
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-[var(--text-secondary)]">{med.dose || '—'}</td>
                <td className="py-2 pr-3 text-[var(--text-secondary)]">{med.route || '—'}</td>
                <td className="py-2 pr-3 text-[var(--text-secondary)]">{med.frequency || '—'}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      med.status === 'active'
                        ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]'
                        : med.status === 'on-hold'
                        ? 'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]'
                        : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-default)]'
                    }`}
                  >
                    {med.status || 'unknown'}
                  </span>
                </td>
                <td className="py-2 text-[var(--text-muted)]">{formatDate(med.startDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LabsTable({ labs }: { labs: LabResultSummary[] }) {
  // Most recent first
  const sorted = [...labs].sort((a, b) => {
    if (!a.collectionDate) return 1;
    if (!b.collectionDate) return -1;
    return new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime();
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Name</th>
            <th className="pb-2 pr-3 font-medium">Value</th>
            <th className="pb-2 pr-3 font-medium">Units</th>
            <th className="pb-2 pr-3 font-medium">Ref Range</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lab, i) => (
            <tr
              key={`${lab.name}-${i}`}
              className={`border-b border-[var(--border-default)]/50 ${
                lab.isAbnormal ? 'bg-[var(--warning-bg)]/30' : ''
              }`}
            >
              <td className="py-2 pr-3 text-[var(--text-primary)]">{lab.name}</td>
              <td className={`py-2 pr-3 font-medium ${lab.isAbnormal ? 'text-[var(--warning-text)]' : 'text-[var(--text-primary)]'}`}>
                {lab.value}
              </td>
              <td className="py-2 pr-3 text-[var(--text-secondary)]">{lab.units || '—'}</td>
              <td className="py-2 pr-3 text-[var(--text-muted)]">{lab.referenceRange || '—'}</td>
              <td className="py-2 text-[var(--text-muted)]">{formatDate(lab.collectionDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VitalsTable({ vitals }: { vitals: VitalSignSummary[] }) {
  const sorted = [...vitals].sort((a, b) => {
    if (!a.recordedDate) return 1;
    if (!b.recordedDate) return -1;
    return new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime();
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Name</th>
            <th className="pb-2 pr-3 font-medium">Value</th>
            <th className="pb-2 pr-3 font-medium">Units</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((vital, i) => (
            <tr key={`${vital.name}-${i}`} className="border-b border-[var(--border-default)]/50">
              <td className="py-2 pr-3 text-[var(--text-primary)]">{vital.name}</td>
              <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{vital.value}</td>
              <td className="py-2 pr-3 text-[var(--text-secondary)]">{vital.units || '—'}</td>
              <td className="py-2 text-[var(--text-muted)]">{formatDate(vital.recordedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsTable({ conditions }: { conditions: ConditionSummary[] }) {
  const sorted = [...conditions].sort((a, b) => {
    if (a.clinicalStatus === 'active' && b.clinicalStatus !== 'active') return -1;
    if (a.clinicalStatus !== 'active' && b.clinicalStatus === 'active') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Name</th>
            <th className="pb-2 pr-3 font-medium">ICD-10</th>
            <th className="pb-2 pr-3 font-medium">Status</th>
            <th className="pb-2 font-medium">Onset</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cond, i) => {
            const isResolved = cond.clinicalStatus === 'resolved' || cond.clinicalStatus === 'inactive';
            return (
              <tr
                key={`${cond.displayName}-${i}`}
                className={`border-b border-[var(--border-default)]/50 ${isResolved ? 'opacity-50' : ''}`}
              >
                <td className="py-2 pr-3 text-[var(--text-primary)]">{cond.displayName}</td>
                <td className="py-2 pr-3 text-[var(--text-secondary)] font-mono text-xs">{cond.icd10Code || '—'}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      cond.clinicalStatus === 'active'
                        ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]'
                        : cond.clinicalStatus === 'remission'
                        ? 'bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]'
                        : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-default)]'
                    }`}
                  >
                    {cond.clinicalStatus || 'unknown'}
                  </span>
                </td>
                <td className="py-2 text-[var(--text-muted)]">{formatDate(cond.onsetDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllergiesTable({ allergies }: { allergies: AllergySummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Substance</th>
            <th className="pb-2 pr-3 font-medium">Reaction</th>
            <th className="pb-2 font-medium">Severity</th>
          </tr>
        </thead>
        <tbody>
          {allergies.map((allergy, i) => (
            <tr key={`${allergy.substance}-${i}`} className="border-b border-[var(--border-default)]/50">
              <td className="py-2 pr-3 text-[var(--text-primary)]">{allergy.substance}</td>
              <td className="py-2 pr-3 text-[var(--text-secondary)]">{allergy.reaction || '—'}</td>
              <td className="py-2">
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    allergy.severity === 'severe'
                      ? 'bg-[var(--error-bg)] text-[var(--error-text)] border border-[var(--error-border)]'
                      : allergy.severity === 'moderate'
                      ? 'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]'
                      : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                  }`}
                >
                  {allergy.severity || 'unknown'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProceduresTable({ procedures }: { procedures: ProcedureSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="pb-2 pr-3 font-medium">Name</th>
            <th className="pb-2 pr-3 font-medium">Date</th>
            <th className="pb-2 font-medium">CPT Code</th>
          </tr>
        </thead>
        <tbody>
          {procedures.map((proc, i) => (
            <tr key={`${proc.name}-${i}`} className="border-b border-[var(--border-default)]/50">
              <td className="py-2 pr-3 text-[var(--text-primary)]">{proc.name}</td>
              <td className="py-2 pr-3 text-[var(--text-muted)]">{formatDate(proc.date)}</td>
              <td className="py-2 text-[var(--text-secondary)] font-mono text-xs">{proc.cptCode || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotesTable({ notes }: { notes: ClinicalNoteSummary[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Most recent first
  const sorted = [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-2">
      {sorted.map((note, i) => {
        const isExpanded = expandedIndex === i;
        return (
          <div
            key={`${note.title}-${i}`}
            className="border border-[var(--border-default)] rounded-[2px] overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{note.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDate(note.date)}
                  {note.author && ` — ${note.author}`}
                </p>
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="bg-[var(--bg-surface-2)] rounded-[2px] p-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {note.narrativeText || 'No narrative text available'}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
