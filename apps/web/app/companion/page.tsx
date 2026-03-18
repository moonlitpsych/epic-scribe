'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Link2,
  Copy,
  CheckCircle2,
  Wifi,
  WifiOff,
  User,
  Loader2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Trash2,
  FileText,
  ClipboardPaste,
} from 'lucide-react';

// Create a lightweight Supabase client for Realtime only (anon key, client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SETTINGS = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Moonlit Psychiatry',
  'BHIDC therapy',
  'Teenscope South',
] as const;

const VISIT_TYPES = [
  'Intake',
  'Consultation Visit',
  'Transfer of Care',
  'Follow-up',
  'First Visit',
] as const;

interface BatchItem {
  id: string;
  sync_session_id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  setting: string;
  visit_type: string;
  prior_note_content: string | null;
  prior_note_source: string | null;
  transcript: string | null;
  generated_note_content: string | null;
  status: string;
  error_message: string | null;
  sort_order: number;
}

interface PatientResult {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-default)]',
  ready: 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]',
  generating: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  generated: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  copied: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  ready: 'Ready',
  generating: 'Generating...',
  generated: 'Generated',
  copied: 'Copied',
};

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

  // Batch queue state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<string>(SETTINGS[0]);
  const [selectedVisitType, setSelectedVisitType] = useState<string>(VISIT_TYPES[0]);

  // Patient search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Expanded items for prior note editing
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [priorNoteDrafts, setPriorNoteDrafts] = useState<Record<string, string>>({});

  // UI state
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fetchingPriorNote, setFetchingPriorNote] = useState<string | null>(null);
  const [sendingPriorNote, setSendingPriorNote] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const batchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('companion_device_token');
    const storedSessionId = localStorage.getItem('companion_session_id');
    const storedSetting = localStorage.getItem('companion_sticky_setting');
    const storedVisitType = localStorage.getItem('companion_sticky_visit_type');

    if (storedSetting) setSelectedSetting(storedSetting);
    if (storedVisitType) setSelectedVisitType(storedVisitType);

    if (storedToken && storedSessionId) {
      setDeviceToken(storedToken);
      setSessionId(storedSessionId);
      hydrate(storedToken);
    }
  }, []);

  // Persist sticky setting/visit type
  useEffect(() => {
    localStorage.setItem('companion_sticky_setting', selectedSetting);
  }, [selectedSetting]);

  useEffect(() => {
    localStorage.setItem('companion_sticky_visit_type', selectedVisitType);
  }, [selectedVisitType]);

  // Set up Realtime subscriptions when session is active
  useEffect(() => {
    if (!sessionId || !deviceToken) return;

    // Session changes (revoke detection)
    const sessionChannel = supabase
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
          if (newData.status === 'revoked' || newData.status === 'expired') {
            setSessionRevoked(true);
            setIsConnected(false);
            localStorage.removeItem('companion_device_token');
            localStorage.removeItem('companion_session_id');
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = sessionChannel;

    // Batch queue changes (live updates from laptop)
    const batchChannel = supabase
      .channel(`batch_queue_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_queue_items',
          filter: `sync_session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as BatchItem;
            setBatchItems((prev) =>
              [...prev, newItem].sort((a, b) => a.sort_order - b.sort_order)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as BatchItem;
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

    batchChannelRef.current = batchChannel;

    return () => {
      sessionChannel.unsubscribe();
      batchChannel.unsubscribe();
      channelRef.current = null;
      batchChannelRef.current = null;
    };
  }, [sessionId, deviceToken]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hydrate = async (token: string) => {
    try {
      // Hydrate session status
      const syncResponse = await fetch('/api/companion/sync', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!syncResponse.ok) {
        localStorage.removeItem('companion_device_token');
        localStorage.removeItem('companion_session_id');
        setDeviceToken(null);
        setSessionId(null);
        return;
      }

      const syncData = await syncResponse.json();
      if (syncData.status === 'revoked' || syncData.status === 'expired') {
        setSessionRevoked(true);
        localStorage.removeItem('companion_device_token');
        localStorage.removeItem('companion_session_id');
        return;
      }

      // Hydrate batch queue
      const batchResponse = await fetch('/api/companion/batch', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (batchResponse.ok) {
        const batchData = await batchResponse.json();
        setBatchItems(batchData.items || []);
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

  const handleDisconnect = () => {
    localStorage.removeItem('companion_device_token');
    localStorage.removeItem('companion_session_id');
    setDeviceToken(null);
    setSessionId(null);
    setIsConnected(false);
    setBatchItems([]);
    setSessionRevoked(false);
  };

  // Patient search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!deviceToken) return;
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/companion/patients?q=${encodeURIComponent(query.trim())}`,
          { headers: { Authorization: `Bearer ${deviceToken}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.patients || []);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('[Companion] Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleAddPatient = async (patient: PatientResult) => {
    if (!deviceToken) return;

    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const response = await fetch('/api/companion/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify({
          patientId: patient.id,
          setting: selectedSetting,
          visitType: selectedVisitType,
          sortOrder: batchItems.length,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[Companion] Failed to add patient:', data.error);
      }
      // Realtime will add the item to the list
    } catch (error) {
      console.error('[Companion] Failed to add patient:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!deviceToken) return;

    try {
      await fetch(`/api/companion/batch/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${deviceToken}` },
      });
      // Realtime will remove the item
    } catch (error) {
      console.error('[Companion] Failed to remove item:', error);
    }
  };

  const handleSavePriorNote = async (itemId: string) => {
    if (!deviceToken) return;
    const content = priorNoteDrafts[itemId];
    if (!content?.trim()) return;

    setSendingPriorNote(itemId);

    try {
      const response = await fetch(`/api/companion/batch/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify({
          priorNoteContent: content.trim(),
          priorNoteSource: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prior note');
      }
    } catch (error) {
      console.error('[Companion] Failed to save prior note:', error);
    } finally {
      setSendingPriorNote(null);
    }
  };

  const handleFetchPriorNote = async (itemId: string) => {
    if (!deviceToken) return;

    setFetchingPriorNote(itemId);

    try {
      const response = await fetch(`/api/companion/batch/${itemId}/fetch-prior-note`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${deviceToken}` },
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || 'No prior note found');
      }
      // Realtime will update the item
    } catch (error) {
      console.error('[Companion] Failed to fetch prior note:', error);
      alert('Failed to fetch prior note');
    } finally {
      setFetchingPriorNote(null);
    }
  };

  const handleMarkNoPriorNote = async (itemId: string) => {
    if (!deviceToken) return;

    try {
      await fetch(`/api/companion/batch/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify({ priorNoteSource: 'none' }),
      });
    } catch (error) {
      console.error('[Companion] Failed to mark no prior note:', error);
    }
  };

  const handleCopyGeneratedNote = useCallback(async (itemId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(itemId);
      setTimeout(() => setCopySuccess(null), 2000);

      // Mark as copied via API
      const token = localStorage.getItem('companion_device_token');
      if (token) {
        await fetch(`/api/companion/batch/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'copied' }),
        });
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pairing screen
  if (!deviceToken || sessionRevoked) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Link2 className="text-[var(--accent-warm)]" size={32} />
              <h1 className="text-3xl font-heading text-[var(--text-primary)]">Epic Scribe</h1>
            </div>
            <p className="text-[var(--accent-warm)] text-lg">Companion Portal</p>
            <p className="text-[var(--text-secondary)] text-sm mt-2">
              Link this device to sync notes with your laptop
            </p>
          </div>

          {sessionRevoked && (
            <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded p-4 text-center">
              <p className="text-[var(--warning-text)] text-sm">
                Session was disconnected. Enter a new pairing code to reconnect.
              </p>
            </div>
          )}

          <div className="bg-[var(--bg-surface-2)] backdrop-blur rounded-[2px] p-8 space-y-6">
            <div>
              <label className="block text-[var(--accent-warm)] text-sm font-medium mb-2">
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
                className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded px-4 py-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePair();
                }}
              />
            </div>

            {pairingError && (
              <p className="text-[var(--error-text)] text-sm text-center">{pairingError}</p>
            )}

            <button
              onClick={handlePair}
              disabled={isPairing || pairingCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-warm)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-warm-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPairing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Link2 size={20} />
              )}
              {isPairing ? 'Connecting...' : 'Connect'}
            </button>

            <p className="text-[var(--text-muted)] text-xs text-center">
              Get a pairing code from your Epic Scribe workflow page
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard (paired) — Batch Queue View
  const generatedCount = batchItems.filter(
    (i) => i.status === 'generated' || i.status === 'copied'
  ).length;
  const readyCount = batchItems.filter(
    (i) => i.status === 'ready' || i.status === 'generated' || i.status === 'copied'
  ).length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="text-[var(--accent-warm)]" size={24} />
            <h1 className="text-xl font-heading text-[var(--text-primary)]">Companion Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="text-[var(--success-text)]" size={16} />
              ) : (
                <WifiOff className="text-[var(--error-text)]" size={16} />
              )}
              <span className={`text-xs ${isConnected ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}`}>
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Add Patient Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] p-4 space-y-3">
          <h2 className="text-sm font-medium text-[var(--accent-warm)]">Add Patient to Queue</h2>

          {/* Setting + Visit Type dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Setting</label>
              <select
                value={selectedSetting}
                onChange={(e) => setSelectedSetting(e.target.value)}
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded px-3 py-2 text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              >
                {SETTINGS.map((s) => (
                  <option key={s} value={s} className="bg-[var(--bg-base)]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Visit Type</label>
              <select
                value={selectedVisitType}
                onChange={(e) => setSelectedVisitType(e.target.value)}
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded px-3 py-2 text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
              >
                {VISIT_TYPES.map((v) => (
                  <option key={v} value={v} className="bg-[var(--bg-base)]">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Patient search */}
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded px-3 py-2">
              {isSearching ? (
                <Loader2 size={16} className="text-[var(--text-muted)] animate-spin flex-shrink-0" />
              ) : (
                <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
              )}
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                placeholder="Search patients by name..."
                className="flex-1 bg-transparent border-none text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none ml-2"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                >
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] max-h-60 overflow-y-auto">
                {searchResults.map((patient) => {
                  const alreadyInQueue = batchItems.some(
                    (i) => i.patient_id === patient.id
                  );
                  return (
                    <button
                      key={patient.id}
                      onClick={() => !alreadyInQueue && handleAddPatient(patient)}
                      disabled={alreadyInQueue}
                      className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 transition-colors ${
                        alreadyInQueue
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[var(--text-primary)] text-sm font-medium">
                            {patient.last_name}, {patient.first_name}
                          </p>
                          <p className="text-[var(--text-muted)] text-xs">
                            {patient.date_of_birth
                              ? new Date(patient.date_of_birth).toLocaleDateString()
                              : 'No DOB'}
                            {patient.email && ` · ${patient.email}`}
                          </p>
                        </div>
                        {alreadyInQueue ? (
                          <span className="text-xs text-[var(--text-muted)]">In queue</span>
                        ) : (
                          <Plus size={16} className="text-[var(--accent-warm)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Batch Queue */}
        {batchItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--accent-warm)]">
                Patient Queue ({batchItems.length})
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                {generatedCount}/{batchItems.length} generated
              </span>
            </div>

            {batchItems.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const hasPriorNote = !!item.prior_note_content;
              const hasGeneratedNote = !!item.generated_note_content;
              const isCopied = copySuccess === item.id || item.status === 'copied';
              const draft = priorNoteDrafts[item.id] ?? item.prior_note_content ?? '';

              return (
                <div
                  key={item.id}
                  className={`bg-[var(--bg-surface)] border rounded-[2px] overflow-hidden transition-colors ${
                    STATUS_COLORS[item.status]?.split(' ').pop() || 'border-[var(--border-default)]'
                  }`}
                >
                  {/* Item header */}
                  <div className="flex items-center justify-between p-3">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <button className="text-[var(--text-muted)]">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <User className="text-[var(--text-muted)] flex-shrink-0" size={16} />
                      <div className="min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {item.patient_first_name} {item.patient_last_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-[var(--bg-surface-2)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                            {item.setting}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{item.visit_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          STATUS_COLORS[item.status] || ''
                        } ${item.status === 'generating' ? 'animate-pulse' : ''}`}
                      >
                        {STATUS_LABELS[item.status] || item.status}
                      </span>

                      {/* Copy button for generated notes */}
                      {hasGeneratedNote && (
                        <button
                          onClick={() =>
                            handleCopyGeneratedNote(item.id, item.generated_note_content!)
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            isCopied
                              ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)]'
                              : 'bg-[var(--accent-warm)] text-[var(--text-inverse)] hover:bg-[var(--accent-warm-hover)]'
                          }`}
                        >
                          {isCopied ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--error-text)] transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-subtle)] p-3 space-y-3">
                      {/* Prior note section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-[var(--text-muted)]">
                            Prior Note
                            {item.prior_note_source && (
                              <span className="ml-1 text-[var(--text-muted)]">
                                ({item.prior_note_source})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {/* Auto-fetch button */}
                            <button
                              onClick={() => handleFetchPriorNote(item.id)}
                              disabled={fetchingPriorNote === item.id}
                              className="flex items-center gap-1 text-xs text-[var(--accent-warm)] hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors"
                            >
                              {fetchingPriorNote === item.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Download size={10} />
                              )}
                              Auto-fetch
                            </button>
                            {/* No prior note needed */}
                            {item.status === 'pending' && !hasPriorNote && (
                              <button
                                onClick={() => handleMarkNoPriorNote(item.id)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                Skip
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={draft}
                          onChange={(e) =>
                            setPriorNoteDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Paste prior note from Epic..."
                          rows={4}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-3 py-2 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] font-mono text-xs focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent resize-none"
                        />

                        {draft.trim() && draft !== (item.prior_note_content ?? '') && (
                          <button
                            onClick={() => handleSavePriorNote(item.id)}
                            disabled={sendingPriorNote === item.id}
                            className="mt-1 flex items-center gap-1 px-3 py-1 bg-[var(--accent-warm)] text-[var(--text-inverse)] rounded text-xs font-semibold hover:bg-[var(--accent-warm-hover)] disabled:opacity-50 transition-colors"
                          >
                            {sendingPriorNote === item.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <ClipboardPaste size={10} />
                            )}
                            Save Prior Note
                          </button>
                        )}
                      </div>

                      {/* Generated note preview */}
                      {hasGeneratedNote && (
                        <div>
                          <p className="text-xs text-[var(--success-text)] mb-1 flex items-center gap-1">
                            <FileText size={10} />
                            Generated Note
                          </p>
                          <div className="bg-[var(--bg-surface)] border border-[var(--success-border)] rounded-[2px] px-3 py-2 max-h-48 overflow-y-auto">
                            <pre className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap font-mono">
                              {item.generated_note_content}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Error message */}
                      {item.error_message && (
                        <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] p-2">
                          <p className="text-[var(--error-text)] text-xs">{item.error_message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary footer */}
        {batchItems.length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              {readyCount}/{batchItems.length} prepped ·{' '}
              {generatedCount}/{batchItems.length} generated
              {batchItems.length > 0 &&
                batchItems.every(
                  (i) => i.status === 'generated' || i.status === 'copied'
                ) && (
                  <span className="text-[var(--success-text)] ml-2">
                    All done! Copy each note above.
                  </span>
                )}
            </p>
          </div>
        )}

        {/* Empty state */}
        {batchItems.length === 0 && (
          <div className="bg-[var(--bg-surface)] border border-dashed border-[var(--border-default)] rounded-[2px] p-8 text-center space-y-2">
            <User className="text-[var(--text-muted)] mx-auto" size={36} />
            <p className="text-[var(--text-muted)] text-sm">
              Search for patients above to add them to your batch queue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
