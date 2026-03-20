'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PhoneTranscript {
  id: string;
  patient_name: string;
  patient_id: string | null;
  transcript: string;
  recording_duration_seconds: number | null;
  word_count: number | null;
  whisper_model: string | null;
  status: string;
  recorded_at: string;
  synced_at: string;
}

interface UseRecentTranscriptsResult {
  transcripts: PhoneTranscript[];
  loading: boolean;
  refresh: () => void;
  markUsed: (id: string, patientId?: string) => Promise<void>;
}

/**
 * Poll for recent phone transcripts (status=ready).
 * Refreshes every 15 seconds.
 */
export function useRecentTranscripts(): UseRecentTranscriptsResult {
  const [transcripts, setTranscripts] = useState<PhoneTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTranscripts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transcripts/recent?status=ready&limit=10');
      if (res.ok) {
        const data = await res.json();
        setTranscripts(data.transcripts || []);
      }
    } catch (error) {
      console.error('Error fetching phone transcripts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranscripts();
    intervalRef.current = setInterval(fetchTranscripts, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTranscripts]);

  const markUsed = useCallback(async (id: string, patientId?: string) => {
    try {
      await fetch(`/api/transcripts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'used', patientId }),
      });
      // Remove from local list
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error marking transcript used:', error);
    }
  }, []);

  return { transcripts, loading, refresh: fetchTranscripts, markUsed };
}
