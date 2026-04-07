'use client';

export type EncounterTab = 'note' | 'profile' | 'actions';

interface EncounterTabsProps {
  activeTab: EncounterTab;
  onTabChange: (tab: EncounterTab) => void;
  hasNote?: boolean;
  stagedActionsCount?: number;
}

const TABS: { key: EncounterTab; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'profile', label: 'Profile' },
  { key: 'actions', label: 'Actions' },
];

export default function EncounterTabs({ activeTab, onTabChange, hasNote, stagedActionsCount }: EncounterTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-[var(--border-default)]">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`relative px-5 py-2.5 text-[13px] font-medium transition-colors ${
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
            {tab.key === 'note' && hasNote && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
            )}
            {tab.key === 'actions' && !!stagedActionsCount && stagedActionsCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold bg-[var(--accent-warm)] text-[var(--bg-base)]">
                {stagedActionsCount}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
