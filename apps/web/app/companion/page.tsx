'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link2, Send, Copy, CheckCircle2, Wifi, WifiOff, ClipboardPaste, FileText, User, Loader2 } from 'lucide-react';

// Create a lightweight Supabase client for Realtime only (anon key, client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PatientContext {
  firstName?: string;
  lastName?: string;
  setting?: string;
  visitType?: string;
  status?: string;
}

export default function CompanionPage() {
  // Pairing state
  const [pairingCode, setPairingCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  // Session state
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);

  // Synced data
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [priorNoteContent, setPriorNoteContent] = useState('');
  const [generatedNoteContent, setGeneratedNoteContent] = useState<string | null>(null);
  const [generatedNoteUpdatedAt, setGeneratedNoteUpdatedAt] = useState<string | null>(null);

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('companion_device_token');
    const storedSessionId = localStorage.getItem('companion_session_id');

    if (storedToken && storedSessionId) {
      setDeviceToken(storedToken);
      setSessionId(storedSessionId);
      hydrate(storedToken);
    }
  }, []);

  // Set up Realtime subscription when session is active
  useEffect(() => {
    if (!sessionId || !deviceToken) return;

    const channel = supabase
      .channel(`sync_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newData = payload.new as any;

          // Check if session was revoked
          if (newData.status === 'revoked' || newData.status === 'expired') {
            setSessionRevoked(true);
            setIsConnected(false);
            localStorage.removeItem('companion_device_token');
            localStorage.removeItem('companion_session_id');
            return;
          }

          // Update patient context
          if (newData.patient_context) {
            setPatientContext(newData.patient_context);
          }

          // Update generated note
          if (newData.generated_note_content !== undefined) {
            setGeneratedNoteContent(newData.generated_note_content);
            setGeneratedNoteUpdatedAt(newData.generated_note_updated_at);
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
  }, [sessionId, deviceToken]);

  const hydrate = async (token: string) => {
    try {
      const response = await fetch('/api/companion/sync', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Token is invalid or session expired
        localStorage.removeItem('companion_device_token');
        localStorage.removeItem('companion_session_id');
        setDeviceToken(null);
        setSessionId(null);
        return;
      }

      const data = await response.json();
      setPatientContext(data.patientContext);
      setPriorNoteContent(data.priorNoteContent || '');
      setGeneratedNoteContent(data.generatedNoteContent);
      setGeneratedNoteUpdatedAt(data.generatedNoteUpdatedAt);

      if (data.status === 'revoked' || data.status === 'expired') {
        setSessionRevoked(true);
        localStorage.removeItem('companion_device_token');
        localStorage.removeItem('companion_session_id');
      }
    } catch (error) {
      console.error('[Companion] Hydration failed:', error);
    }
  };

  const handlePair = async () => {
    if (pairingCode.trim().length !== 6) {
      setPairingError('Enter a 6-digit pairing code');
      return;
    }

    setIsPairing(true);
    setPairingError(null);

    try {
      const response = await fetch('/api/companion/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairingCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPairingError(data.error || 'Invalid pairing code');
        return;
      }

      // Store credentials
      localStorage.setItem('companion_device_token', data.deviceToken);
      localStorage.setItem('companion_session_id', data.sessionId);
      setDeviceToken(data.deviceToken);
      setSessionId(data.sessionId);
      setSessionRevoked(false);
      setPairingCode('');
    } catch (error) {
      console.error('[Companion] Pairing failed:', error);
      setPairingError('Connection failed. Please try again.');
    } finally {
      setIsPairing(false);
    }
  };

  const handleSendPriorNote = async () => {
    if (!deviceToken || !priorNoteContent.trim()) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/companion/sync', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify({ priorNoteContent: priorNoteContent.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to send');
      }

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (error) {
      console.error('[Companion] Send failed:', error);
      alert('Failed to send prior note. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyGeneratedNote = useCallback(async () => {
    if (!generatedNoteContent) return;

    try {
      await navigator.clipboard.writeText(generatedNoteContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [generatedNoteContent]);

  const handleDisconnect = () => {
    localStorage.removeItem('companion_device_token');
    localStorage.removeItem('companion_session_id');
    setDeviceToken(null);
    setSessionId(null);
    setIsConnected(false);
    setPatientContext(null);
    setPriorNoteContent('');
    setGeneratedNoteContent(null);
    setSessionRevoked(false);
  };

  // Pairing screen
  if (!deviceToken || sessionRevoked) {
    return (
      <div className="min-h-screen bg-[#0A1F3D] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Link2 className="text-[#E89C8A]" size={32} />
              <h1 className="text-3xl font-serif text-white">Epic Scribe</h1>
            </div>
            <p className="text-[#C5A882] text-lg">Companion Portal</p>
            <p className="text-[#C5A882]/70 text-sm mt-2">
              Link this device to sync notes with your laptop
            </p>
          </div>

          {sessionRevoked && (
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 text-center">
              <p className="text-amber-300 text-sm">
                Session was disconnected. Enter a new pairing code to reconnect.
              </p>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur rounded-xl p-8 space-y-6">
            <div>
              <label className="block text-[#C5A882] text-sm font-medium mb-2">
                Pairing Code
              </label>
              <input
                type="text"
                value={pairingCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPairingCode(val);
                  setPairingError(null);
                }}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-white/10 border border-[#C5A882]/30 rounded-lg px-4 py-4 text-white placeholder-white/20 focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePair();
                }}
              />
            </div>

            {pairingError && (
              <p className="text-red-400 text-sm text-center">{pairingError}</p>
            )}

            <button
              onClick={handlePair}
              disabled={isPairing || pairingCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#E89C8A] text-white rounded-lg hover:bg-[#d4887a] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPairing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Link2 size={20} />
              )}
              {isPairing ? 'Connecting...' : 'Connect'}
            </button>

            <p className="text-[#C5A882]/50 text-xs text-center">
              Get a pairing code from your Epic Scribe workflow page
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard (paired)
  return (
    <div className="min-h-screen bg-[#0A1F3D] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="text-[#E89C8A]" size={24} />
            <h1 className="text-xl font-serif text-white">Companion Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="text-green-400" size={16} />
              ) : (
                <WifiOff className="text-red-400" size={16} />
              )}
              <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-[#C5A882]/50 hover:text-[#C5A882] transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Patient Context Bar */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-4">
          <div className="flex items-center gap-3">
            <User className="text-[#C5A882]" size={20} />
            {patientContext?.firstName ? (
              <div>
                <p className="text-white font-medium">
                  {patientContext.firstName} {patientContext.lastName}
                </p>
                <p className="text-[#C5A882]/70 text-sm">
                  {[patientContext.setting, patientContext.visitType].filter(Boolean).join(' · ')}
                  {patientContext.status && (
                    <span className="ml-2 text-xs bg-[#E89C8A]/20 text-[#E89C8A] px-2 py-0.5 rounded">
                      {patientContext.status}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-[#C5A882]/50 text-sm italic">
                Waiting for patient selection on laptop...
              </p>
            )}
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prior Note (send to laptop) */}
          <div className="bg-white/5 border border-[#C5A882]/20 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="text-[#C5A882]" size={18} />
              <h2 className="text-lg font-medium text-white">Prior Note</h2>
              <span className="text-[#C5A882]/50 text-xs">(paste from Epic)</span>
            </div>

            <textarea
              value={priorNoteContent}
              onChange={(e) => setPriorNoteContent(e.target.value)}
              placeholder="Paste the copied-forward note from Epic here..."
              rows={16}
              className="w-full bg-white/5 border border-[#C5A882]/20 rounded-lg px-4 py-3 text-white/90 placeholder-white/20 font-mono text-sm focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent resize-none"
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-[#C5A882]/50">
                {priorNoteContent.trim().split(/\s+/).filter(Boolean).length} words
              </p>
              <button
                onClick={handleSendPriorNote}
                disabled={isSending || !priorNoteContent.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  sendSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-[#E89C8A] text-white hover:bg-[#d4887a]'
                }`}
              >
                {isSending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : sendSuccess ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Send size={16} />
                )}
                {isSending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send to Laptop'}
              </button>
            </div>
          </div>

          {/* Generated Note (from laptop) */}
          <div className="bg-white/5 border border-[#C5A882]/20 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="text-[#C5A882]" size={18} />
              <h2 className="text-lg font-medium text-white">Generated Note</h2>
              {generatedNoteUpdatedAt && (
                <span className="text-[#C5A882]/50 text-xs">
                  {new Date(generatedNoteUpdatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {generatedNoteContent ? (
              <>
                <div className="bg-white/5 border border-[#C5A882]/20 rounded-lg px-4 py-3 max-h-[400px] overflow-y-auto">
                  <pre className="text-white/90 font-mono text-sm whitespace-pre-wrap">
                    {generatedNoteContent}
                  </pre>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#C5A882]/50">
                    {generatedNoteContent.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                  <button
                    onClick={handleCopyGeneratedNote}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      copySuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-[#E89C8A] text-white hover:bg-[#d4887a]'
                    }`}
                  >
                    {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px] border border-dashed border-[#C5A882]/20 rounded-lg">
                <div className="text-center space-y-2">
                  <Loader2 className="text-[#C5A882]/30 animate-spin mx-auto" size={32} />
                  <p className="text-[#C5A882]/50 text-sm">
                    Waiting for generated note from laptop...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
