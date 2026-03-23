'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AudioRecorder from '@/components/workflow/AudioRecorder';

export default function RecordPage() {
  const [transcript, setTranscript] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTranscript = useCallback(async (text: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/transcripts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          deviceInfo: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      setSaved(true);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveError(err.message || 'Failed to save transcript');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleTranscriptReady = useCallback((text: string) => {
    setTranscript(text);
    saveTranscript(text);
  }, [saveTranscript]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = transcript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [transcript]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading text-[var(--text-primary)] tracking-tight">Record</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Record a visit. Transcript saves to your workflow.
        </p>
      </div>

      <AudioRecorder
        showInline={true}
        autoTranscribe={true}
        onTranscriptReady={handleTranscriptReady}
      />

      {/* Transcript output */}
      {transcript && (
        <div className="mt-6 space-y-4">
          <pre className="max-h-[50vh] overflow-y-auto p-4 text-sm font-mono text-[var(--text-secondary)] bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-[2px] whitespace-pre-wrap">
            {transcript}
          </pre>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-[var(--success-text)]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>

            {saving && (
              <span className="text-sm text-[var(--text-muted)]">Saving...</span>
            )}
            {saved && !saving && (
              <span className="text-sm text-[var(--success-text)]">Saved</span>
            )}
            {saveError && (
              <span className="text-sm text-[var(--error-text)]">{saveError}</span>
            )}

            <Link
              href="/flow"
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-inverse)] bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Open Flow
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            This transcript will appear in your workflow automatically.
          </p>
        </div>
      )}
    </div>
  );
}
