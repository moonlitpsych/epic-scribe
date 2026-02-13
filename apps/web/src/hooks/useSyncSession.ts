'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface PatientContext {
  firstName?: string;
  lastName?: string;
  setting?: string;
  visitType?: string;
  status?: string;
}

interface SyncSessionData {
  id: string;
  isPaired: boolean;
  priorNoteContent: string | null;
  priorNoteUpdatedAt: string | null;
  generatedNoteContent: string | null;
  generatedNoteUpdatedAt: string | null;
  patientContext: PatientContext | null;
  status: string;
  lastActivityAt: string;
}

export function useSyncSession() {
  const [syncSession, setSyncSession] = useState<SyncSessionData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [companionPriorNote, setCompanionPriorNote] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const hasPairedDevice = syncSession?.isPaired ?? false;

  // Check for active session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Subscribe to Realtime updates when session is active and paired
  useEffect(() => {
    if (!syncSession?.id || !syncSession.isPaired) return;

    const channel = supabase
      .channel(`laptop_sync_${syncSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_sessions',
          filter: `id=eq.${syncSession.id}`,
        },
        (payload) => {
          const newData = payload.new as any;

          // Update prior note from companion
          if (newData.prior_note_content !== undefined) {
            setCompanionPriorNote(newData.prior_note_content);
          }

          // Update session status
          if (newData.status === 'revoked' || newData.status === 'expired') {
            setSyncSession(null);
            setIsConnected(false);
            setCompanionPriorNote(null);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [syncSession?.id, syncSession?.isPaired]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/companion/session');
      if (!response.ok) return;

      const data = await response.json();

      if (data.session) {
        setSyncSession(data.session);
        if (data.session.priorNoteContent) {
          setCompanionPriorNote(data.session.priorNoteContent);
        }
      }
    } catch (error) {
      console.error('[useSyncSession] Check session failed:', error);
    }
  };

  const generatePairingCode = useCallback(async () => {
    try {
      const response = await fetch('/api/companion/pair', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to generate pairing code');
      }

      const data = await response.json();
      setPairingCode(data.pairingCode);
      setPairingExpiresAt(data.expiresAt);

      // After generating, poll for pairing completion
      const pollInterval = setInterval(async () => {
        await checkSession();
      }, 3000);

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setPairingCode(null);
        setPairingExpiresAt(null);
      }, 10 * 60 * 1000);

      return data.pairingCode;
    } catch (error) {
      console.error('[useSyncSession] Generate pairing code failed:', error);
      throw error;
    }
  }, []);

  const sendGeneratedNote = useCallback(async (note: string) => {
    if (!syncSession?.isPaired) return;

    try {
      await fetch('/api/companion/session/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedNote: note }),
      });
    } catch (error) {
      console.error('[useSyncSession] Send generated note failed:', error);
    }
  }, [syncSession?.isPaired]);

  const sendPatientContext = useCallback(async (context: PatientContext) => {
    if (!syncSession?.isPaired) return;

    try {
      await fetch('/api/companion/session/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientContext: context }),
      });
    } catch (error) {
      console.error('[useSyncSession] Send patient context failed:', error);
    }
  }, [syncSession?.isPaired]);

  const disconnectDevice = useCallback(async () => {
    try {
      await fetch('/api/companion/session', { method: 'DELETE' });
      setSyncSession(null);
      setIsConnected(false);
      setCompanionPriorNote(null);
      setPairingCode(null);
      setPairingExpiresAt(null);
    } catch (error) {
      console.error('[useSyncSession] Disconnect failed:', error);
    }
  }, []);

  return {
    syncSession,
    isConnected,
    hasPairedDevice,
    companionPriorNote,
    sendGeneratedNote,
    sendPatientContext,
    generatePairingCode,
    disconnectDevice,
    pairingCode,
    pairingExpiresAt,
  };
}
