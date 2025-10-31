'use client';

import React from 'react';
import { CalendarEncounter } from '@/google-calendar';

interface EncountersListProps {
  encounters: CalendarEncounter[];
  selectedEncounterId?: string | null;
  onSelectEncounter: (encounter: CalendarEncounter) => void;
  loading?: boolean;
}

export default function EncountersList({
  encounters,
  selectedEncounterId,
  onSelectEncounter,
  loading = false,
}: EncountersListProps) {
  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Patient Encounters</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!encounters || encounters.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Patient Encounters</h3>
        <p className="text-sm text-gray-500 text-center py-4">
          No scheduled encounters for this patient
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Recent & Upcoming Encounters ({encounters.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {encounters.map((encounter) => {
          const isSelected = selectedEncounterId === encounter.id;
          const hasMeetLink = !!encounter.meetLink;

          return (
            <div
              key={encounter.id}
              onClick={() => onSelectEncounter(encounter)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      {formatDateTime(encounter.start)}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {encounter.setting}
                  </div>
                  <div className="text-xs text-gray-500">
                    {encounter.visitType}
                  </div>
                </div>
                {hasMeetLink && (
                  <a
                    href={encounter.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200 transition-colors"
                    title="Open Google Meet"
                  >
                    <svg className="h-3 w-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Meet
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
