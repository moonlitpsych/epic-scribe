'use client';

import { useState, useEffect } from 'react';
import { Link2, X, Loader2, Wifi, WifiOff, Unplug } from 'lucide-react';

interface CompanionPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasPairedDevice: boolean;
  isConnected: boolean;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  onGenerateCode: () => Promise<string>;
  onDisconnect: () => Promise<void>;
}

export default function CompanionPairingModal({
  isOpen,
  onClose,
  hasPairedDevice,
  isConnected,
  pairingCode,
  pairingExpiresAt,
  onGenerateCode,
  onDisconnect,
}: CompanionPairingModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!pairingExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(pairingExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiresAt]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateCode();
    } catch (error) {
      console.error('Failed to generate code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link2 className="text-[#E89C8A]" size={20} />
            <h3 className="text-lg font-semibold text-[#0A1F3D]">Link Work Device</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {hasPairedDevice ? (
          // Already paired - show status
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              {isConnected ? (
                <Wifi className="text-green-600" size={20} />
              ) : (
                <WifiOff className="text-amber-500" size={20} />
              )}
              <div>
                <p className="text-green-800 font-medium">
                  {isConnected ? 'Companion Connected' : 'Companion Paired'}
                </p>
                <p className="text-green-600 text-sm">
                  {isConnected
                    ? 'Real-time sync is active'
                    : 'Waiting for real-time connection...'}
                </p>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Unplug size={16} />
              )}
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Device'}
            </button>
          </div>
        ) : (
          // Not paired - show code generation
          <div className="space-y-4">
            {pairingCode && timeLeft !== null && timeLeft > 0 ? (
              <>
                <div className="text-center p-6 bg-[#F5F1ED] rounded-lg">
                  <p className="text-sm text-[#5A6B7D] mb-2">Enter this code on your work device</p>
                  <p className="text-4xl font-mono font-bold tracking-[0.3em] text-[#0A1F3D]">
                    {pairingCode}
                  </p>
                  <p className="text-sm text-[#5A6B7D] mt-3">
                    Expires in {formatTime(timeLeft)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    On your work desktop, go to{' '}
                    <span className="font-mono font-medium">epic-scribe.vercel.app/companion</span>
                    {' '}and enter this code.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[#5A6B7D] text-sm">
                  Generate a one-time code to link your work desktop. Once linked, you can paste prior notes
                  on your work device and they will appear here instantly. Generated notes will sync back
                  to your work device for pasting into Epic.
                </p>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Link2 size={20} />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate Pairing Code'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
