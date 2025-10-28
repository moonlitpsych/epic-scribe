'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { moonlitTheme } from '@/lib/moonlit-theme';

interface SmartListOption {
  value: string;
  order: number;
  is_default?: boolean;
}

interface QuickAddSmartListProps {
  onAdd: (smartList: any) => void;
  onClose: () => void;
}

export function QuickAddSmartList({ onAdd, onClose }: QuickAddSmartListProps) {
  const [category, setCategory] = useState('Psychiatric ROS');
  const [displayName, setDisplayName] = useState('');
  const [epicId, setEpicId] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  const categories = [
    'Psychiatric ROS',
    'Substance Use',
    'Social History',
    'Mental Status Exam',
    'Past Psychiatric History',
    'Assessment',
    'Plan',
    'Medications'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse options from textarea (one per line)
    const options = optionsText
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => ({
        value: line.trim(),
        order: index + 1,
        is_default: line.trim() === defaultValue
      }));

    // Create SmartList object in the same format as the catalog
    const smartList = {
      identifier: displayName,
      epicId,
      displayName,
      group: category,
      options
    };

    onAdd(smartList);
    onClose();
  };

  // Template options for quick fill
  const fillTemplate = () => {
    const templates: Record<string, string> = {
      'severity': 'None\nMild\nModerate\nSevere\nNot assessed',
      'frequency': 'Never\nRarely\nOccasionally\nFrequently\nConstantly\nNot assessed',
      'yes-no': 'No\nYes\nUnclear\nNot assessed',
      'mood': 'Euthymic\nDepressed\nAnxious\nIrritable\nElevated\nMixed\nLabile',
      'function': 'Normal\nMildly impaired\nModerately impaired\nSeverely impaired\nNot assessed'
    };

    // Show template selector (simplified for now - just use severity)
    setOptionsText(templates.severity);
    setDefaultValue('Not assessed');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Moonlit cream background */}
        <div
          className="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          style={{ backgroundColor: moonlitTheme.colors.cream }}
        >
          <h2
            className="text-2xl font-semibold"
            style={{
              color: moonlitTheme.colors.navy,
              fontFamily: moonlitTheme.typography.fontFamily.serif
            }}
          >
            Quick Add SmartList
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-all duration-200 hover:bg-white hover:bg-opacity-60"
            style={{ color: moonlitTheme.colors.text.secondary }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with scrollable content */}
        <div className="p-6 overflow-y-auto flex-1">

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: moonlitTheme.colors.navy }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'white',
                '--tw-ring-color': moonlitTheme.colors.terracotta
              } as any}
              required
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Display Name */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: moonlitTheme.colors.navy }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Sleep Quality"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': moonlitTheme.colors.terracotta
              } as any}
              required
            />
            <p className="text-xs mt-1.5" style={{ color: moonlitTheme.colors.text.muted }}>
              This will be shown in the UI and used as the identifier
            </p>
          </div>

          {/* Epic ID */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: moonlitTheme.colors.navy }}
            >
              Epic ID
            </label>
            <input
              type="text"
              value={epicId}
              onChange={(e) => setEpicId(e.target.value)}
              placeholder="e.g., 304120106"
              pattern="[0-9]+"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': moonlitTheme.colors.terracotta
              } as any}
              required
            />
            <p className="text-xs mt-1.5" style={{ color: moonlitTheme.colors.text.muted }}>
              Must match the Epic SmartList ID exactly
            </p>
          </div>

          {/* Options */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: moonlitTheme.colors.navy }}
            >
              Options (one per line)
            </label>
            <div className="relative">
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Normal&#10;Mildly impaired&#10;Moderately impaired&#10;Severely impaired&#10;Not assessed"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 font-mono text-sm transition-all duration-200 focus:ring-2 focus:border-transparent"
                style={{
                  '--tw-ring-color': moonlitTheme.colors.terracotta,
                  minHeight: '180px'
                } as any}
                rows={8}
                required
              />
              <button
                type="button"
                onClick={fillTemplate}
                className="absolute top-2 right-2 text-xs px-3 py-1.5 rounded-md transition-all duration-200"
                style={{
                  backgroundColor: moonlitTheme.colors.cream,
                  color: moonlitTheme.colors.terracotta,
                  border: `1px solid ${moonlitTheme.colors.terracotta}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = moonlitTheme.colors.terracotta;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = moonlitTheme.colors.cream;
                  e.currentTarget.style.color = moonlitTheme.colors.terracotta;
                }}
              >
                Use Template
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: moonlitTheme.colors.text.muted }}>
              💡 Tip: Include "Not assessed" as the last option for safety
            </p>
          </div>

          {/* Default Value */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: moonlitTheme.colors.navy }}
            >
              Default Value (Optional)
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g., Not assessed"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': moonlitTheme.colors.terracotta
              } as any}
            />
            <p className="text-xs mt-1.5" style={{ color: moonlitTheme.colors.text.muted }}>
              Must match one of the options above exactly
            </p>
          </div>

          {/* Preview */}
          {displayName && optionsText && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: moonlitTheme.colors.cream }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{
                  color: moonlitTheme.colors.navy,
                  fontFamily: moonlitTheme.typography.fontFamily.serif
                }}
              >
                Preview
              </h3>
              <p className="text-sm" style={{ color: moonlitTheme.colors.text.primary }}>
                <span className="font-semibold">{displayName}</span> ({category})
              </p>
              <p className="text-xs mt-1" style={{ color: moonlitTheme.colors.text.muted }}>
                Epic ID: {epicId || '[Not set]'}
              </p>
              <ul className="mt-3 text-sm space-y-1" style={{ color: moonlitTheme.colors.text.primary }}>
                {optionsText.split('\n').filter(line => line.trim()).map((option, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: moonlitTheme.colors.text.muted }}>
                      {idx + 1}.
                    </span>
                    {option.trim()}
                    {option.trim() === defaultValue && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: moonlitTheme.colors.success.bg,
                          color: moonlitTheme.colors.success.text
                        }}
                      >
                        default
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: moonlitTheme.colors.gray[200] }}>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              style={{
                backgroundColor: moonlitTheme.colors.tan,
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#B59872';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = moonlitTheme.colors.tan;
              }}
            >
              <Plus className="w-5 h-5" />
              Add SmartList
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              style={{
                border: `1px solid ${moonlitTheme.colors.tan}`,
                color: moonlitTheme.colors.tan,
                backgroundColor: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = moonlitTheme.colors.cream;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Cancel
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}