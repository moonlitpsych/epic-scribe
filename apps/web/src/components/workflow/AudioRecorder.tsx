'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, FileAudio, CheckCircle } from 'lucide-react';

export type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'transcribing' | 'completed';

interface AudioRecorderProps {
  onTranscriptReady: (text: string) => void;
  disabled?: boolean;
  patientName?: string;
  /** Prominent card layout for Setup view */
  showInline?: boolean;
  /** Auto-transcribe on stop (default true) */
  autoTranscribe?: boolean;
  /** Callback when recording state changes */
  onRecordingStateChange?: (state: RecordingState) => void;
}

export default function AudioRecorder({
  onTranscriptReady,
  disabled,
  patientName,
  showInline = false,
  autoTranscribe = true,
  onRecordingStateChange,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blobSize, setBlobSize] = useState<number | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [transcriptPreview, setTranscriptPreview] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Waveform refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Notify parent of state changes
  useEffect(() => {
    onRecordingStateChange?.(state);
  }, [state, onRecordingStateChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
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

  // Waveform visualization — draw frequency bars on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.min(bufferLength, 64);
      const barWidth = width / barCount;
      const gap = 1;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(2, value * height);
        const x = i * barWidth;
        const y = height - barHeight;

        ctx.fillStyle = `rgba(16, 185, 129, ${0.4 + value * 0.6})`; // emerald with dynamic opacity
        ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
      }
    };

    draw();
  }, []);

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const transcribe = useCallback(async (blob?: Blob) => {
    const audioBlob = blob || blobRef.current;
    if (!audioBlob) return;

    setError(null);
    setState('transcribing');
    setTranscriptionStatus('Transcribing with Gemini...');

    try {
      const headers: Record<string, string> = {
        'Content-Type': audioBlob.type,
      };
      if (patientName) {
        headers['X-Patient-Name'] = patientName;
      }

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers,
        body: audioBlob,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Transcription failed (${res.status})`);
      }

      const data = await res.json();
      const preview = data.transcript.slice(0, 200) + (data.transcript.length > 200 ? '...' : '');
      setTranscriptPreview(preview);
      setTranscriptionStatus('Transcript ready');
      setState('completed');
      onTranscriptReady(data.transcript);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Transcription failed');
      setState('recorded');
      setTranscriptionStatus('');
    }
  }, [onTranscriptReady, patientName]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscriptPreview('');
    setTranscriptionStatus('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Set up Web Audio API for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Prefer webm/opus, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000,
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

        stopWaveform();
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
          analyserRef.current = null;
        }

        if (autoTranscribe) {
          // Skip 'recorded' state — go straight to transcribing
          transcribe(blob);
        } else {
          setState('recorded');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // collect chunks every second

      setElapsed(0);
      setState('recording');
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

      // Start waveform
      drawWaveform();
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError('Could not access microphone. Please allow microphone permissions.');
    }
  }, [autoTranscribe, transcribe, drawWaveform, stopWaveform]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    blobRef.current = null;
    setBlobSize(null);
    setElapsed(0);
    setError(null);
    setTranscriptPreview('');
    setTranscriptionStatus('');
    stopWaveform();
  }, [stopWaveform]);

  const isProcessing = state === 'uploading' || state === 'transcribing';

  // ─── Inline (prominent) mode for Setup & Record view ───
  if (showInline) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileAudio className="text-[var(--accent-primary)]" size={20} />
          <span className="text-base font-medium text-[var(--text-primary)]">Record Encounter</span>
        </div>

        {/* Idle — big Start Recording button */}
        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold text-[var(--text-inverse)] bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic size={22} />
            Start Recording
          </button>
        )}

        {/* Recording — waveform + timer + stop */}
        {state === 'recording' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-lg font-mono text-[var(--error-text)]">{formatTime(elapsed)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              >
                <Square size={14} />
                Stop Recording
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={48}
              className="w-full h-12 rounded-[2px] bg-[var(--bg-surface-2)]"
            />
          </div>
        )}

        {/* Recorded (only when autoTranscribe=false) */}
        {state === 'recorded' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--accent-primary)]">
              {formatTime(elapsed)} &middot; {blobSize ? formatSize(blobSize) : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => transcribe()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-inverse)] bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                Transcribe
              </button>
            </div>
          </div>
        )}

        {/* Transcribing — progressive status */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 size={20} className="animate-spin text-[var(--accent-primary)]" />
            <span className="text-sm text-[var(--accent-primary)]">{transcriptionStatus || 'Transcribing...'}</span>
          </div>
        )}

        {/* Completed — green checkmark + preview */}
        {state === 'completed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-[var(--success-text)]" />
              <span className="text-sm font-medium text-[var(--success-text)]">Transcript ready</span>
              <span className="text-xs text-[var(--text-muted)] ml-auto">
                {formatTime(elapsed)} &middot; {blobSize ? formatSize(blobSize) : ''}
              </span>
            </div>
            {transcriptPreview && (
              <p className="text-sm text-[var(--text-secondary)] line-clamp-3 font-mono bg-[var(--bg-surface-2)] p-3 rounded-[2px]">
                {transcriptPreview}
              </p>
            )}
            <button
              onClick={reset}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline"
            >
              Record again
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-[var(--error-text)]">{error}</p>
        )}
      </div>
    );
  }

  // ─── Compact mode (original layout) ───
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
            <canvas
              ref={canvasRef}
              width={200}
              height={24}
              className="flex-1 h-6 rounded-[2px] bg-[var(--bg-surface)]"
            />
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
                onClick={() => transcribe()}
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
            {transcriptionStatus || 'Transcribing...'}
          </div>
        )}

        {state === 'completed' && (
          <div className="ml-auto flex items-center gap-2">
            <CheckCircle size={16} className="text-[var(--success-text)]" />
            <span className="text-xs text-[var(--success-text)]">Transcript ready</span>
            <button
              onClick={reset}
              className="ml-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline"
            >
              Re-record
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-[var(--error-text)]">{error}</p>
      )}
    </div>
  );
}
