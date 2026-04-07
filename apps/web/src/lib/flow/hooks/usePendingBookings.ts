import { useState, useEffect, useCallback } from 'react';

export interface PendingBooking {
  id: string;
  calendarEventId: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetLink?: string;
  patientId: string;
  patientName: string;
  setting?: string;
  visitType?: string;
  payerName?: string;
}

interface UsePendingBookingsResult {
  pendingBookings: PendingBooking[];
  isLoading: boolean;
  refresh: () => void;
}

export function usePendingBookings(pollInterval = 30000): UsePendingBookingsResult {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/booking/pending');
      if (!res.ok) return;
      const data = await res.json();
      setPendingBookings(data.pendingBookings || []);
    } catch (err) {
      console.error('[usePendingBookings] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPending, pollInterval]);

  return { pendingBookings, isLoading, refresh: fetchPending };
}
