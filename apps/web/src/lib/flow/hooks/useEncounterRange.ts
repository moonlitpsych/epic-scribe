import { useState, useEffect, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';
import type { TodayEncounter } from '../types';

interface UseEncounterRangeResult {
  encounters: TodayEncounter[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEncounterRange(
  start: string,
  end: string,
  pollInterval = 30000
): UseEncounterRangeResult {
  const [encounters, setEncounters] = useState<TodayEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEncounters = useCallback(async () => {
    // Abort previous request if still in flight
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/encounters/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        // Auto-redirect to sign-in on auth failure
        if (res.status === 401) {
          console.log('[useEncounterRange] 401 — redirecting to sign-in');
          signOut({ callbackUrl: '/auth/signin?error=SessionExpired', redirect: true });
          return;
        }
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      setEncounters(data.encounters);
      setError(null);

      // Check Meet status for encounters that might transition
      const meetCandidates = (data.encounters as TodayEncounter[]).filter(
        (e) => e.meetLink && (e.status === 'scheduled' || e.status === 'in-visit')
      );
      if (meetCandidates.length > 0) {
        try {
          const meetRes = await fetch('/api/encounters/check-meet-status', {
            method: 'POST',
            signal: controller.signal,
          });
          if (meetRes.ok) {
            const meetData = await meetRes.json();
            if (meetData.updated > 0) {
              // Re-fetch to get updated statuses
              const refreshRes = await fetch(
                `/api/encounters/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
                { signal: controller.signal }
              );
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                setEncounters(refreshData.encounters);
              }
            }
          }
        } catch (meetErr) {
          // Non-blocking — Meet check failure shouldn't affect encounter loading
          if ((meetErr as Error).name !== 'AbortError') {
            console.warn('[useEncounterRange] Meet status check failed:', meetErr);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useEncounterRange] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch encounters');
    } finally {
      setIsLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    setIsLoading(true);
    fetchEncounters();
    const interval = setInterval(fetchEncounters, pollInterval);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchEncounters, pollInterval]);

  return { encounters, isLoading, error, refresh: fetchEncounters };
}
