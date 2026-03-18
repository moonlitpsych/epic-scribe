'use client';

import { useState, useCallback, useMemo } from 'react';
import { SmartToolsParser, SmartToolsTransformer } from '@epic-scribe/note-service/src/smarttools';
import { ParsedSmartTools } from '@epic-scribe/types';

const parser = new SmartToolsParser();
const transformer = new SmartToolsTransformer();

// Sample text with various SmartTools elements
const SAMPLE_TEXT = `UNIVERSITY HEALTHCARE
Psychiatry Progress Note

Patient: @FNAME@ @LNAME@ (@age@ years old)
MRN: @MRN@
Visit Date: @DATE@

Chief Complaint: @RFV@

Vital Signs: @lastvitals@

History of Present Illness:
***

Current Medications:
Patient reports taking @MEDS@ as prescribed. Compliance has been {Medication Compliance:304120104}.

Psychiatric Review of Systems:
Sleep: {Sleep Quality:304120105}
Appetite: {Appetite:304120106}
Mood: {Mood:304120107}
Anxiety: {Anxiety Level:304120108}

The patient denies any current suicidal ideation. Risk assessment: {Risk Level:304120109}.

Mental Status Exam:
***

Assessment:
Patient is a @age@ year old with @DIAGNOSIS@ who presents today for medication management.
Current symptoms indicate {Symptom Severity:304120110}.

Plan:
1. Continue current medications
2. Follow-up in {Follow-up Timeframe:304120111}
3. Labs: @LABS@
4. Psychotherapy referral: {Therapy Referral:304120112}

Next appointment: .nextappt
Provider: .provider`;

const HIGHLIGHT_COLORS = {
  smartlink: 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]',
  dotphrase: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  wildcard: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  smartlist: 'bg-[#13101f] text-[#c084fc] border-[#2a2050]',
};

export function SmartToolsDemo() {
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [activeTab, setActiveTab] = useState<'parser' | 'transformer'>('parser');
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [transformedText, setTransformedText] = useState('');

  // Parse the input text
  const parsed: ParsedSmartTools = useMemo(() => parser.parse(inputText), [inputText]);

  // Get summary statistics
  const summary = useMemo(() => transformer.getSmartToolsSummary(inputText), [inputText]);

  // Transform text when tab changes
  const handleTransform = useCallback(() => {
    const transformed = transformer.convertSmartLinksToDotPhrases(inputText);
    setTransformedText(transformed);
  }, [inputText]);

  // Highlight text with SmartTools elements
  const renderHighlightedText = useCallback((text: string) => {
    if (!highlightEnabled) {
      return <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>;
    }

    const positions = parser.getHighlightPositions(text);

    if (positions.length === 0) {
      return <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>;
    }

    const elements: JSX.Element[] = [];
    let lastEnd = 0;

    positions.forEach((pos, index) => {
      // Add text before this position
      if (pos.start > lastEnd) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastEnd, pos.start)}
          </span>
        );
      }

      // Add highlighted element
      const highlightClass = HIGHLIGHT_COLORS[pos.type];
      elements.push(
        <span
          key={`highlight-${index}`}
          className={`inline-block px-1 rounded border ${highlightClass}`}
          title={`${pos.type}${pos.identifier ? `: ${pos.identifier}` : ''}`}
        >
          {text.substring(pos.start, pos.end)}
        </span>
      );

      lastEnd = pos.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      elements.push(
        <span key="text-final">{text.substring(lastEnd)}</span>
      );
    }

    return <pre className="whitespace-pre-wrap font-mono text-sm">{elements}</pre>;
  }, [highlightEnabled]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Input Text</h2>
          <button
            onClick={() => setInputText(SAMPLE_TEXT)}
            className="px-4 py-2 bg-[var(--bg-hover)] hover:bg-[var(--border-default)] rounded text-sm font-medium text-[var(--text-primary)] transition-colors"
          >
            Reset to Sample
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-64 p-4 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-mono text-sm focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent placeholder:text-[var(--text-muted)]"
          placeholder="Enter text with SmartTools elements..."
        />
      </div>

      {/* Statistics Panel */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">SmartTools Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--info-bg)] border border-[var(--info-border)] p-4 rounded-[2px]">
            <div className="text-3xl font-bold text-[var(--info-text)]">{summary.counts.smartLinks}</div>
            <div className="text-sm text-[var(--text-secondary)]">SmartLinks (@id@)</div>
          </div>
          <div className="bg-[var(--success-bg)] border border-[var(--success-border)] p-4 rounded-[2px]">
            <div className="text-3xl font-bold text-[var(--success-text)]">{summary.counts.dotPhrases}</div>
            <div className="text-sm text-[var(--text-secondary)]">DotPhrases (.id)</div>
          </div>
          <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] p-4 rounded-[2px]">
            <div className="text-3xl font-bold text-[var(--warning-text)]">{summary.counts.wildcards}</div>
            <div className="text-sm text-[var(--text-secondary)]">Wildcards (***)</div>
          </div>
          <div className="bg-[#13101f] border border-[#2a2050] p-4 rounded-[2px]">
            <div className="text-3xl font-bold text-[#c084fc]">{summary.counts.smartLists}</div>
            <div className="text-sm text-[var(--text-secondary)]">SmartLists ({`{}`})</div>
          </div>
        </div>
      </div>

      {/* Tabs for Parser/Transformer */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)]">
        <div className="border-b border-[var(--border-default)]">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('parser')}
              className={`py-3 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'parser'
                  ? 'border-[var(--accent-warm)] text-[var(--accent-warm)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Parser Output
            </button>
            <button
              onClick={() => {
                setActiveTab('transformer');
                handleTransform();
              }}
              className={`py-3 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'transformer'
                  ? 'border-[var(--accent-warm)] text-[var(--accent-warm)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Transformer Output
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'parser' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Highlighted Text</h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={highlightEnabled}
                    onChange={(e) => setHighlightEnabled(e.target.checked)}
                    className="rounded text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Enable Highlighting</span>
                </label>
              </div>

              <div className="bg-[var(--bg-surface-2)] p-4 rounded-[2px] overflow-x-auto">
                {renderHighlightedText(inputText)}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.smartlink}`}>
                    @SmartLink@
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">SmartLinks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.dotphrase}`}>
                    .DotPhrase
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">DotPhrases</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.wildcard}`}>
                    ***
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">Wildcards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.smartlist}`}>
                    {`{List:ID}`}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">SmartLists</span>
                </div>
              </div>

              {/* Detailed Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {summary.smartLinks.length > 0 && (
                  <div className="bg-[var(--info-bg)] border border-[var(--info-border)] p-4 rounded-[2px]">
                    <h4 className="font-semibold text-[var(--info-text)] mb-2">SmartLinks Found:</h4>
                    <ul className="space-y-1">
                      {[...new Set(summary.smartLinks)].map((id, idx) => (
                        <li key={idx} className="text-sm font-mono text-[var(--info-text)]">
                          @{id}@ → .{id}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.smartLists.length > 0 && (
                  <div className="bg-[#13101f] border border-[#2a2050] p-4 rounded-[2px]">
                    <h4 className="font-semibold text-[#c084fc] mb-2">SmartLists Found:</h4>
                    <ul className="space-y-1">
                      {summary.smartLists.map((list, idx) => (
                        <li key={idx} className="text-sm font-mono text-[#c084fc]">
                          {list.display} (ID: {list.epicId})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transformer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Transformed Output</h3>
              <div className="bg-[var(--bg-surface-2)] p-4 rounded-[2px]">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-[var(--success-bg)] text-[var(--success-text)] rounded-full text-sm font-medium">
                    SmartLinks → DotPhrases Conversion
                  </span>
                </div>
                <div className="overflow-x-auto">
                  {renderHighlightedText(transformedText)}
                </div>
              </div>

              <div className="bg-[var(--info-bg)] border-l-4 border-[var(--info-border)] p-4 rounded-[2px]">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-[var(--info-text)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-[var(--info-text)]">
                      All @SmartLinks@ have been converted to .DotPhrases for Epic compatibility.
                      This transformed text is ready to be pasted into Epic.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}