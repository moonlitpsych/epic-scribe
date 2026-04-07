'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEncounter } from '@/lib/flow/hooks/useEncounter';
import EncounterHeader from '@/components/flow/encounter/EncounterHeader';
import EncounterTabs, { type EncounterTab } from '@/components/flow/encounter/EncounterTabs';
import NoteTab from '@/components/flow/encounter/NoteTab';
import ActionsTab from '@/components/flow/encounter/ActionsTab';
import PatientProfileTab from '@/components/patient/PatientProfileTab';

export default function EncounterPage() {
  const params = useParams();
  const encounterId = params.id as string;
  const [activeTab, setActiveTab] = useState<EncounterTab>('note');
  const [stagedActionsCount, setStagedActionsCount] = useState(0);

  const { encounter, existingNote, isLoading, error, refresh } = useEncounter(encounterId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-8">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
          Loading encounter...
        </div>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-8">
        <Link
          href="/flow"
          className="mb-6 inline-block rounded border border-[var(--border-default)] bg-transparent px-3 py-1.5 text-xs text-[var(--text-muted)] no-underline transition-colors hover:bg-[var(--bg-hover)]"
        >
          ← Back to Schedule
        </Link>
        <div className="mt-8 text-center text-[var(--text-muted)]">
          {error || 'Encounter not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-6 py-6 space-y-4">
      {/* Back nav */}
      <Link
        href="/flow"
        className="inline-block rounded border border-[var(--border-default)] bg-transparent px-3 py-1.5 text-xs text-[var(--text-muted)] no-underline transition-colors hover:bg-[var(--bg-hover)]"
      >
        ← Back to Schedule
      </Link>

      <EncounterHeader encounter={encounter} />

      <EncounterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasNote={encounter.hasNote}
        stagedActionsCount={stagedActionsCount}
      />

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === 'note' && (
          <NoteTab
            encounter={encounter}
            existingNote={existingNote}
            onNoteSaved={refresh}
          />
        )}

        {activeTab === 'profile' && encounter.patientId && (
          <PatientProfileTab patientId={encounter.patientId} />
        )}
        {activeTab === 'profile' && !encounter.patientId && (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">
            No patient linked to this encounter
          </div>
        )}

        {activeTab === 'actions' && (
          <ActionsTab encounterId={encounter.id} patientId={encounter.patientId} onStagedActionsLoaded={setStagedActionsCount} />
        )}
      </div>
    </div>
  );
}
