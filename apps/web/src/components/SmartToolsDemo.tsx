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
  smartlink: 'bg-blue-100 text-blue-800 border-blue-300',
  dotphrase: 'bg-green-100 text-green-800 border-green-300',
  wildcard: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  smartlist: 'bg-purple-100 text-purple-800 border-purple-300',
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Input Text</h2>
          <button
            onClick={() => setInputText(SAMPLE_TEXT)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
          >
            Reset to Sample
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Enter text with SmartTools elements..."
        />
      </div>

      {/* Statistics Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">SmartTools Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{summary.counts.smartLinks}</div>
            <div className="text-sm text-gray-600">SmartLinks (@id@)</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{summary.counts.dotPhrases}</div>
            <div className="text-sm text-gray-600">DotPhrases (.id)</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{summary.counts.wildcards}</div>
            <div className="text-sm text-gray-600">Wildcards (***)</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{summary.counts.smartLists}</div>
            <div className="text-sm text-gray-600">SmartLists ({`{}`})</div>
          </div>
        </div>
      </div>

      {/* Tabs for Parser/Transformer */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('parser')}
              className={`py-3 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'parser'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                <h3 className="text-lg font-semibold">Highlighted Text</h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={highlightEnabled}
                    onChange={(e) => setHighlightEnabled(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Enable Highlighting</span>
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {renderHighlightedText(inputText)}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.smartlink}`}>
                    @SmartLink@
                  </span>
                  <span className="text-sm text-gray-600">SmartLinks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.dotphrase}`}>
                    .DotPhrase
                  </span>
                  <span className="text-sm text-gray-600">DotPhrases</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.wildcard}`}>
                    ***
                  </span>
                  <span className="text-sm text-gray-600">Wildcards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${HIGHLIGHT_COLORS.smartlist}`}>
                    {`{List:ID}`}
                  </span>
                  <span className="text-sm text-gray-600">SmartLists</span>
                </div>
              </div>

              {/* Detailed Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {summary.smartLinks.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">SmartLinks Found:</h4>
                    <ul className="space-y-1">
                      {[...new Set(summary.smartLinks)].map((id, idx) => (
                        <li key={idx} className="text-sm font-mono text-blue-600">
                          @{id}@ → .{id}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.smartLists.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">SmartLists Found:</h4>
                    <ul className="space-y-1">
                      {summary.smartLists.map((list, idx) => (
                        <li key={idx} className="text-sm font-mono text-purple-600">
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
              <h3 className="text-lg font-semibold">Transformed Output</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    SmartLinks → DotPhrases Conversion
                  </span>
                </div>
                <div className="overflow-x-auto">
                  {renderHighlightedText(transformedText)}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
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