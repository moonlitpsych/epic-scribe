'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, FileAudio } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AudioRecorderProps {
  onTranscriptReady: (text: string) => void;
  disabled?: boolean;
  patientName?: string;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'transcribing';

export default function AudioRecorder({ onTranscriptReady, disabled, patientName }: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blobSize, setBlobSize] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Prefer webm/opus, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setBlobSize(blob.size);
        setState('recorded');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // collect chunks every second

      setElapsed(0);
      setState('recording');
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError('Could not access microphone. Please allow microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const transcribe = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;

    setError(null);

    // Upload to Supabase Storage
    setState('uploading');
    const timestamp = Date.now();
    const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
    const storagePath = `recordings/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('encounter-recordings')
      .upload(storagePath, blob, { contentType: blob.type, upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setError(`Upload failed: ${uploadError.message}`);
      setState('recorded');
      return;
    }

    // Call transcribe API
    setState('transcribing');
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, patientName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Transcription failed (${res.status})`);
      }

      const data = await res.json();
      onTranscriptReady(data.transcript);
      setState('idle');
      blobRef.current = null;
      setBlobSize(null);
      setElapsed(0);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Transcription failed');
      setState('recorded');
    }
  }, [onTranscriptReady, patientName]);

  const reset = useCallback(() => {
    setState('idle');
    blobRef.current = null;
    setBlobSize(null);
    setElapsed(0);
    setError(null);
  }, []);

  const isProcessing = state === 'uploading' || state === 'transcribing';

  return (
    <div className="mb-4 p-4 bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-[2px]">
      <div className="flex items-center gap-3">
        <FileAudio className="text-[var(--accent-primary)] flex-shrink-0" size={18} />
        <span className="text-sm font-medium text-[var(--accent-primary)]">Record Encounter</span>

        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-inverse)] bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic size={16} />
            Record
          </button>
        )}

        {state === 'recording' && (
          <>
            <div className="flex items-center gap-2 ml-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-mono text-[var(--error-text)]">{formatTime(elapsed)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          </>
        )}

        {state === 'recorded' && (
          <>
            <span className="text-sm text-[var(--accent-primary)] ml-2">
              {formatTime(elapsed)} &middot; {blobSize ? formatSize(blobSize) : ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Discard
              </button>
              <button
                onClick={transcribe}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-inverse)] bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                Transcribe
              </button>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="ml-auto flex items-center gap-2 text-sm text-[var(--accent-primary)]">
            <Loader2 size={16} className="animate-spin" />
            {state === 'uploading' ? 'Uploading...' : 'Transcribing...'}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-[var(--error-text)]">{error}</p>
      )}
    </div>
  );
}
