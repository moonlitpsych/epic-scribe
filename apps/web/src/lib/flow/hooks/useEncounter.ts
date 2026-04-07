import { useState, useEffect, useCallback, useRef } from 'react';
import type { TodayEncounter } from '../types';

interface ExistingNote {
  id: string;
  encounter_id: string;
  template_id: string;
  prompt_version: string;
  prompt_hash: string;
  generated_content: string;
  final_note_content?: string;
  is_final: boolean;
  generated_at: string;
  finalized_at?: string;
  edited: boolean;
  epic_chart_data?: any;
}

export interface UseEncounterResult {
  encounter: TodayEncounter | null;
  existingNote: ExistingNote | null;
  providerNotes: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEncounter(encounterId: string): UseEncounterResult {
  const [encounter, setEncounter] = useState<TodayEncounter | null>(null);
  const [existingNote, setExistingNote] = useState<ExistingNote | null>(null);
  const [providerNotes, setProviderNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEncounter = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/encounters/${encodeURIComponent(encounterId)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch encounter: ${res.status}`);
      }
      const data = await res.json();
      setEncounter(data.encounter);
      setExistingNote(data.existingNote || null);
      setProviderNotes(data.providerNotes || null);
      setError(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useEncounter] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch encounter');
    } finally {
      setIsLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    setIsLoading(true);
    fetchEncounter();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchEncounter]);

  return { encounter, existingNote, providerNotes, isLoading, error, refresh: fetchEncounter };
}
