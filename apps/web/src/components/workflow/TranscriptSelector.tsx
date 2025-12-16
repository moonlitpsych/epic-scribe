'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface TranscriptSelectorProps {
  encounterId?: string | null;
  patientName?: string | null;
  onTranscriptLoaded: (content: string) => void;
  disabled?: boolean;
}

export default function TranscriptSelector({
  encounterId,
  patientName,
  onTranscriptLoaded,
  disabled = false,
}: TranscriptSelectorProps) {
  const [transcripts, setTranscripts] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFileId, setLoadedFileId] = useState<string | null>(null);

  // Fetch transcripts when encounter or patient changes
  useEffect(() => {
    if (encounterId || patientName) {
      fetchTranscripts();
    } else {
      setTranscripts([]);
      setError(null);
      setLoadedFileId(null);
    }
  }, [encounterId, patientName]);

  const fetchTranscripts = async () => {
    if (!encounterId && !patientName) return;

    setLoading(true);
    setError(null);

    try {
      // Use encounter-based search if we have an encounter, otherwise search by patient name
      const url = encounterId
        ? `/api/encounters/${encounterId}/transcripts`
        : `/api/transcripts/search?patientName=${encodeURIComponent(patientName || '')}`;

      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch transcripts');
      }

      const data = await response.json();
      setTranscripts(data.transcripts || []);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transcripts');
    } finally {
      setLoading(false);
    }
  };

  const loadTranscript = async (fileId: string) => {
    setLoadingFileId(fileId);
    setError(null);

    try {
      const response = await fetch(`/api/transcripts/${fileId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load transcript');
      }

      const data = await response.json();
      onTranscriptLoaded(data.content);
      setLoadedFileId(fileId);
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoadingFileId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Clean up transcript name for display
  const formatName = (name: string) => {
    // Remove common suffixes and clean up
    return name
      .replace(/\.(txt|vtt|sbv|srt)$/i, '')
      .replace(/ - Transcript$/i, '')
      .replace(/Transcript$/i, '')
      .trim() || name;
  };

  if (!encounterId && !patientName) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="text-purple-600" size={20} />
          <h4 className="font-semibold text-purple-900">Google Drive Transcripts</h4>
        </div>
        <button
          onClick={fetchTranscripts}
          disabled={loading || disabled}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && transcripts.length === 0 ? (
        <div className="flex items-center gap-2 text-purple-700 py-4">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Searching Google Drive for transcripts...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-2">{error}</div>
      ) : transcripts.length === 0 ? (
        <p className="text-sm text-purple-700 py-2">
          No transcripts found for this encounter. Make sure the Google Meet recording has finished processing.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-purple-600 mb-2">
            Found {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}. Click to load into the transcript field.
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {transcripts.map((file) => (
              <button
                key={file.id}
                onClick={() => loadTranscript(file.id)}
                disabled={disabled || loadingFileId === file.id}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all
                  ${loadedFileId === file.id
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {formatName(file.name)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(file.modifiedTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {loadingFileId === file.id ? (
                      <Loader2 size={18} className="text-purple-600 animate-spin" />
                    ) : loadedFileId === file.id ? (
                      <CheckCircle size={18} className="text-green-600" />
                    ) : (
                      <Download size={18} className="text-purple-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
