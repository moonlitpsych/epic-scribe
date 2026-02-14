'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { BatchQueueItem } from '@/lib/db/batch-queue';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useBatchQueue() {
  const [batchItems, setBatchItems] = useState<BatchQueueItem[]>([]);
  const [syncSessionId, setSyncSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch batch items from the laptop-side API
  const refreshBatchItems = useCallback(async () => {
    try {
      const response = await fetch('/api/companion/session/batch');
      if (!response.ok) {
        if (response.status === 404) {
          // No paired session
          setBatchItems([]);
          setSyncSessionId(null);
          return;
        }
        throw new Error('Failed to fetch batch items');
      }
      const data = await response.json();
      setBatchItems(data.items);
      setSyncSessionId(data.syncSessionId);
    } catch (error) {
      console.error('[useBatchQueue] Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshBatchItems();
  }, [refreshBatchItems]);

  // Realtime subscription for batch_queue_items changes
  useEffect(() => {
    if (!syncSessionId) return;

    const channel = supabase
      .channel(`batch_queue_${syncSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_queue_items',
          filter: `sync_session_id=eq.${syncSessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as BatchQueueItem;
            setBatchItems((prev) =>
              [...prev, newItem].sort((a, b) => a.sort_order - b.sort_order)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as BatchQueueItem;
            setBatchItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setBatchItems((prev) => prev.filter((item) => item.id !== deleted.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [syncSessionId]);

  // Update transcript for a batch item
  const updateItemTranscript = useCallback(
    async (itemId: string, transcript: string) => {
      const response = await fetch(`/api/companion/session/batch/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!response.ok) throw new Error('Failed to update transcript');
    },
    []
  );

  // Generate note for a single batch item
  const generateForItem = useCallback(
    async (itemId: string) => {
      const item = batchItems.find((i) => i.id === itemId);
      if (!item || !item.transcript) return;

      setGeneratingItemId(itemId);

      // Mark as generating
      await fetch(`/api/companion/session/batch/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'generating' }),
      });

      try {
        // Call the existing generate endpoint
        const generateResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting: item.setting,
            visitType: item.visit_type,
            transcript: item.transcript,
            priorNote: item.prior_note_content || undefined,
            patientId: item.patient_id,
          }),
        });

        if (!generateResponse.ok) {
          const errorData = await generateResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Generation failed');
        }

        const result = await generateResponse.json();
        const generatedNote = result.note || result.generatedNote || '';

        // Store generated note
        await fetch(`/api/companion/session/batch/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generatedNoteContent: generatedNote }),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await fetch(`/api/companion/session/batch/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ready', errorMessage }),
        });
        throw error;
      } finally {
        setGeneratingItemId(null);
      }
    },
    [batchItems]
  );

  // Generate notes for all items with transcripts
  const generateAll = useCallback(async () => {
    const itemsToGenerate = batchItems.filter(
      (item) =>
        item.transcript &&
        item.status !== 'generated' &&
        item.status !== 'generating' &&
        item.status !== 'copied'
    );

    if (itemsToGenerate.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: itemsToGenerate.length });

    for (let i = 0; i < itemsToGenerate.length; i++) {
      setGenerationProgress({ current: i + 1, total: itemsToGenerate.length });
      try {
        await generateForItem(itemsToGenerate[i].id);
      } catch (error) {
        console.error(
          `[useBatchQueue] Failed to generate for ${itemsToGenerate[i].patient_first_name}:`,
          error
        );
        // Continue with next item
      }
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
  }, [batchItems, generateForItem]);

  return {
    batchItems,
    syncSessionId,
    isLoading,
    refreshBatchItems,
    updateItemTranscript,
    generateForItem,
    generateAll,
    isGenerating,
    generatingItemId,
    generationProgress,
  };
}
