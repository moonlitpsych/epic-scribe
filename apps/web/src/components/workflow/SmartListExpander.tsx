'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface SmartListExpanderProps {
  epicId: string;
  displayText: string;
}

interface SmartList {
  identifier: string;
  epicId: string;
  displayName: string;
  options: Array<{
    value: string;
    order: number;
    is_default?: boolean;
  }>;
}

export default function SmartListExpander({ epicId, displayText }: SmartListExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [smartList, setSmartList] = useState<SmartList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && !smartList && !loading) {
      fetchSmartList();
    }
  }, [isExpanded]);

  const fetchSmartList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/smartlists?epicId=${epicId}`);
      if (!response.ok) throw new Error('SmartList not found');
      const data = await response.json();
      // API returns array, get first item
      const list = Array.isArray(data) ? data[0] : data;
      setSmartList(list);
    } catch (err) {
      setError('Failed to load options');
      console.error('Error fetching SmartList:', err);
    } finally {
      setLoading(false);
    }
  };

  const optionCount = smartList?.options.length || '?';

  return (
    <div className="border border-[#C5A882]/30 rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white hover:bg-[#F5F1ED] transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-[#E89C8A] bg-[#F5F1ED] px-2 py-1 rounded">
            {displayText}
          </span>
          <span className="text-xs text-[#5A6B7D]">
            {smartList ? `${optionCount} options` : 'View options'}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expandable Options List */}
      {isExpanded && (
        <div className="border-t border-[#C5A882]/20 bg-[#F5F1ED] p-4">
          {loading && (
            <p className="text-sm text-[#5A6B7D]">Loading options...</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {smartList && !loading && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#0A1F3D] mb-2 uppercase tracking-wide">
                Available Options:
              </p>
              {smartList.options
                .sort((a, b) => a.order - b.order)
                .map((option, idx) => (
                  <div
                    key={idx}
                    className={`
                      flex items-center gap-2 text-sm py-1 px-2 rounded
                      ${option.is_default ? 'bg-white border border-[#C5A882]/30' : ''}
                    `}
                  >
                    {option.is_default && (
                      <CheckCircle2 size={14} className="text-[#E89C8A] flex-shrink-0" />
                    )}
                    <span className="text-xs text-[#5A6B7D] w-6">
                      {option.order}.
                    </span>
                    <span className="text-[#0A1F3D]">{option.value}</span>
                    {option.is_default && (
                      <span className="text-xs text-[#E89C8A] ml-auto">default</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
