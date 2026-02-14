'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useBatchQueue } from '@/hooks/useBatchQueue';
import TranscriptSelector from '@/components/workflow/TranscriptSelector';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  PlayCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  ClipboardPaste,
  Download,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500/20 text-gray-400',
  ready: 'bg-blue-500/20 text-blue-400',
  generating: 'bg-amber-500/20 text-amber-400',
  generated: 'bg-green-500/20 text-green-400',
  copied: 'bg-green-600/20 text-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  ready: 'Ready',
  generating: 'Generating...',
  generated: 'Generated',
  copied: 'Copied',
};

export default function BatchPage() {
  const {
    batchItems,
    syncSessionId,
    isLoading,
    refreshBatchItems,
    updateItemTranscript,
    fetchPriorNote,
    generateForItem,
    generateAll,
    isGenerating,
    generatingItemId,
    generationProgress,
  } = useBatchQueue();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [transcriptDrafts, setTranscriptDrafts] = useState<Record<string, string>>({});
  const [savingTranscript, setSavingTranscript] = useState<string | null>(null);
  const [fetchingPriorNote, setFetchingPriorNote] = useState<Set<string>>(new Set());
  const [priorNoteErrors, setPriorNoteErrors] = useState<Record<string, string>>({});
  const fetchedPriorNoteRef = useRef<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Auto-fetch prior notes when expanding an item that needs one
  const needsPriorNote = useCallback(
    (item: (typeof batchItems)[0]) =>
      (item.visit_type === 'Follow-up' || item.visit_type === 'Transfer of Care') &&
      !item.prior_note_content,
    []
  );

  useEffect(() => {
    for (const itemId of expandedItems) {
      const item = batchItems.find((i) => i.id === itemId);
      if (
        item &&
        needsPriorNote(item) &&
        !fetchingPriorNote.has(itemId) &&
        !fetchedPriorNoteRef.current.has(itemId)
      ) {
        fetchedPriorNoteRef.current.add(itemId);
        setFetchingPriorNote((prev) => new Set(prev).add(itemId));

        fetchPriorNote(itemId).then((result) => {
          setFetchingPriorNote((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          if (!result.success && result.message) {
            setPriorNoteErrors((prev) => ({ ...prev, [itemId]: result.message! }));
          }
        });
      }
    }
  }, [expandedItems, batchItems, fetchPriorNote, fetchingPriorNote, needsPriorNote]);

  const handleTranscriptSave = useCallback(
    async (itemId: string) => {
      const transcript = transcriptDrafts[itemId];
      if (!transcript?.trim()) return;

      setSavingTranscript(itemId);
      try {
        await updateItemTranscript(itemId, transcript);
      } catch (error) {
        console.error('Failed to save transcript:', error);
      } finally {
        setSavingTranscript(null);
      }
    },
    [transcriptDrafts, updateItemTranscript]
  );

  const handleDriveTranscriptLoaded = useCallback(
    async (itemId: string, content: string) => {
      setTranscriptDrafts((prev) => ({ ...prev, [itemId]: content }));
      setSavingTranscript(itemId);
      try {
        await updateItemTranscript(itemId, content);
      } catch (error) {
        console.error('Failed to save Drive transcript:', error);
      } finally {
        setSavingTranscript(null);
      }
    },
    [updateItemTranscript]
  );

  const handleGenerateOne = useCallback(
    async (itemId: string) => {
      try {
        await generateForItem(itemId);
      } catch (error) {
        console.error('Generation failed:', error);
      }
    },
    [generateForItem]
  );

  const itemsWithTranscript = batchItems.filter((i) => i.transcript);
  const itemsGenerable = batchItems.filter(
    (i) =>
      i.transcript &&
      i.status !== 'generated' &&
      i.status !== 'generating' &&
      i.status !== 'copied'
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1F3D] flex items-center justify-center">
        <Loader2 className="text-[#C5A882] animate-spin" size={32} />
      </div>
    );
  }

  if (!syncSessionId) {
    return (
      <div className="min-h-screen bg-[#0A1F3D] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <WifiOff className="text-[#C5A882]/50 mx-auto" size={48} />
          <h1 className="text-xl font-serif text-white">No Companion Connected</h1>
          <p className="text-[#C5A882]/70 text-sm">
            Pair a companion device from the workflow page first, then add patients to the batch
            queue on the companion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1F3D] p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-[#E89C8A]" size={24} />
            <h1 className="text-xl font-serif text-white">Batch Workflow</h1>
            <span className="text-[#C5A882]/50 text-sm">
              {batchItems.length} patient{batchItems.length !== 1 ? 's' : ''} queued
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className="text-green-400" size={16} />
              <span className="text-xs text-green-400">Connected</span>
            </div>
            {itemsGenerable.length > 0 && (
              <button
                onClick={generateAll}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#d4887a] transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating {generationProgress.current}/{generationProgress.total}...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} />
                    Generate All ({itemsGenerable.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {batchItems.length === 0 && (
          <div className="bg-white/5 border border-dashed border-[#C5A882]/20 rounded-xl p-12 text-center space-y-3">
            <ClipboardPaste className="text-[#C5A882]/30 mx-auto" size={48} />
            <p className="text-[#C5A882]/50">
              No patients in queue. Add patients from the companion portal on your work desktop.
            </p>
          </div>
        )}

        {/* Batch items list */}
        <div className="space-y-4">
          {batchItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const isItemGenerating = generatingItemId === item.id;
            const draft = transcriptDrafts[item.id] ?? item.transcript ?? '';
            const hasTranscript = !!(item.transcript || draft.trim());
            const canGenerate =
              hasTranscript &&
              item.status !== 'generated' &&
              item.status !== 'generating' &&
              item.status !== 'copied';

            return (
              <div
                key={item.id}
                className="bg-white/5 border border-[#C5A882]/20 rounded-xl overflow-hidden"
              >
                {/* Item header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[#C5A882]/50">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div>
                      <p className="text-white font-medium">
                        {item.patient_first_name} {item.patient_last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-[#C5A882]/20 text-[#C5A882] px-2 py-0.5 rounded">
                          {item.setting}
                        </span>
                        <span className="text-xs bg-[#C5A882]/10 text-[#C5A882]/70 px-2 py-0.5 rounded">
                          {item.visit_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.error_message && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Error
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[item.status]} ${
                        item.status === 'generating' ? 'animate-pulse' : ''
                      }`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    {canGenerate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateOne(item.id);
                        }}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#E89C8A] text-white rounded-lg text-xs font-semibold hover:bg-[#d4887a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isItemGenerating ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Play size={12} />
                        )}
                        Generate
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-[#C5A882]/10 p-4 space-y-4">
                    {/* Prior note: fetching indicator */}
                    {fetchingPriorNote.has(item.id) && (
                      <div className="flex items-center gap-2 text-[#C5A882]/70 text-xs">
                        <Download size={12} className="animate-bounce" />
                        Fetching prior note...
                      </div>
                    )}

                    {/* Prior note: error/not found message */}
                    {!fetchingPriorNote.has(item.id) && priorNoteErrors[item.id] && !item.prior_note_content && (
                      <div className="flex items-center gap-2 text-amber-400/80 text-xs">
                        <AlertCircle size={12} />
                        {priorNoteErrors[item.id]}
                      </div>
                    )}

                    {/* Prior note preview */}
                    {item.prior_note_content && (
                      <div>
                        <p className="text-xs text-[#C5A882]/50 mb-1">
                          Prior Note ({item.prior_note_source})
                        </p>
                        <div className="bg-white/5 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                          <pre className="text-white/60 text-xs whitespace-pre-wrap font-mono">
                            {item.prior_note_content.slice(0, 500)}
                            {item.prior_note_content.length > 500 ? '...' : ''}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Google Drive transcript auto-fetch */}
                    <TranscriptSelector
                      patientName={`${item.patient_last_name}, ${item.patient_first_name}`}
                      onTranscriptLoaded={(content) => handleDriveTranscriptLoaded(item.id, content)}
                      disabled={isGenerating}
                    />

                    {/* Manual transcript input (fallback) */}
                    <div>
                      <p className="text-xs text-[#C5A882]/50 mb-1">Transcript</p>
                      <textarea
                        value={draft}
                        onChange={(e) =>
                          setTranscriptDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          if (draft !== (item.transcript ?? '')) {
                            handleTranscriptSave(item.id);
                          }
                        }}
                        placeholder="Paste transcript here..."
                        rows={6}
                        className="w-full bg-white/5 border border-[#C5A882]/20 rounded-lg px-3 py-2 text-white/90 placeholder-white/20 font-mono text-sm focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent resize-none"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-[#C5A882]/30">
                          {draft.trim().split(/\s+/).filter(Boolean).length} words
                        </p>
                        {savingTranscript === item.id && (
                          <span className="text-xs text-[#C5A882]/50 flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            Saving...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Error message */}
                    {item.error_message && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-400 text-xs">{item.error_message}</p>
                      </div>
                    )}

                    {/* Generated note preview */}
                    {item.generated_note_content && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="text-green-400" size={14} />
                          <p className="text-xs text-green-400">Generated Note</p>
                        </div>
                        <div className="bg-white/5 border border-green-500/20 rounded-lg px-3 py-2 max-h-48 overflow-y-auto">
                          <pre className="text-white/80 text-xs whitespace-pre-wrap font-mono">
                            {item.generated_note_content.slice(0, 1000)}
                            {item.generated_note_content.length > 1000 ? '...' : ''}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        {batchItems.length > 0 && (
          <div className="bg-white/5 border border-[#C5A882]/20 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-[#C5A882]/70">
                <span>{batchItems.filter((i) => i.status === 'generated' || i.status === 'copied').length}/{batchItems.length} generated</span>
                <span>{itemsWithTranscript.length}/{batchItems.length} with transcripts</span>
              </div>
              {batchItems.every((i) => i.status === 'generated' || i.status === 'copied') && (
                <span className="text-green-400 flex items-center gap-1 text-xs">
                  <CheckCircle2 size={14} />
                  All notes generated — copy from companion
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
