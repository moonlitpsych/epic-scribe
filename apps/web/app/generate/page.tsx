'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SETTINGS, VISIT_TYPES, Setting, VisitType } from '@epic-scribe/types';
import { moonlitTheme } from '@/lib/moonlit-theme';

// Force dynamic rendering since we use useSearchParams
export const dynamic = 'force-dynamic';

export default function GeneratePage() {
  const searchParams = useSearchParams();

  // Form state
  const [setting, setSetting] = useState<Setting>('HMHI Downtown RCC');
  const [visitType, setVisitType] = useState<string>('Intake');
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // State for encounter ID
  const [encounterId, setEncounterId] = useState<string | undefined>();

  // Auto-load transcript from URL parameters
  useEffect(() => {
    const encounterIdParam = searchParams?.get('encounterId');
    const transcriptId = searchParams?.get('transcriptId');
    const settingParam = searchParams?.get('setting');
    const visitTypeParam = searchParams?.get('visitType');

    if (encounterIdParam) {
      setEncounterId(encounterIdParam);
    }

    if (settingParam) {
      setSetting(settingParam as Setting);
    }

    if (visitTypeParam) {
      setVisitType(visitTypeParam);
    }

    if (transcriptId) {
      loadTranscriptFromDrive(transcriptId);
    }
  }, [searchParams]);

  // Load transcript content from Google Drive
  const loadTranscriptFromDrive = async (fileId: string) => {
    try {
      setLoadingTranscript(true);

      const response = await fetch(`/api/transcripts/${fileId}`);

      if (!response.ok) {
        throw new Error('Failed to load transcript');
      }

      const data = await response.json();
      setTranscript(data.content);
    } catch (error) {
      setErrors(['Failed to load transcript from Google Drive']);
      console.error(error);
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Get available visit types for the selected setting
  const getVisitTypesForSetting = (setting: Setting): string[] => {
    if (setting === 'Redwood Clinic MHI') {
      return ['Consultation Visit', 'Transfer of Care', 'Follow-up'];
    }
    return ['Intake', 'Transfer of Care', 'Follow-up'];
  };

  // Check if previous note is required
  const isPreviousNoteRequired = (): boolean => {
    return visitType === 'Transfer of Care' || visitType === 'Follow-up';
  };

  // Handle setting change
  const handleSettingChange = (newSetting: Setting) => {
    setSetting(newSetting);
    // Reset visit type if it's not available for new setting
    const availableTypes = getVisitTypesForSetting(newSetting);
    if (!availableTypes.includes(visitType)) {
      setVisitType(availableTypes[0]);
    }
  };

  // Preview prompt
  const handlePreviewPrompt = async () => {
    setErrors([]);
    setIsPreviewing(true);

    try {
      const response = await fetch('/api/prompts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId, // Include encounter ID to fetch patient context
          setting,
          visitType,
          transcript,
          priorNote: previousNote
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors([error.message || 'Failed to preview prompt']);
        return;
      }

      const data = await response.json();
      setPromptPreview(data.prompt);
      setShowPromptModal(true);
    } catch (error) {
      setErrors(['Failed to preview prompt']);
      console.error(error);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Generate note
  const handleGenerateNote = async () => {
    // Validation
    const validationErrors: string[] = [];

    if (!transcript.trim()) {
      validationErrors.push('Transcript is required');
    }

    if (isPreviousNoteRequired() && !previousNote.trim()) {
      validationErrors.push(`Previous note is required for ${visitType} visits`);
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsGenerating(true);
    setGeneratedNote('');
    setReceipt(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId, // Include encounter ID to fetch patient context
          setting,
          visitType,
          transcript,
          priorNote: previousNote || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors([error.message || 'Failed to generate note']);
        return;
      }

      const data = await response.json();
      setGeneratedNote(data.note);
      setReceipt(data.receipt);
    } catch (error) {
      setErrors(['Failed to generate note. Please try again.']);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedNote);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Load sample data
  const loadSampleData = () => {
    setTranscript(`Patient is a young adult artist presenting for initial psychiatric evaluation. She reports long-standing anxiety dating back to childhood, describing it as "a lifetime of walking on eggshells." She grew up out of state in a home environment characterized by significant parental conflict where she served as a mediator and emotional support for both parents, leading to chronic hypervigilance and anxiety.

She moved to the area over a decade ago after getting married. Her husband works in medical research at the local university. She works as an artist at a shop in a nearby town, specializing in fantasy and fairy tale themed artwork. She reports a supportive relationship with her husband, who works in mental health and has observed notable changes in her behavior around her parents - describing her as "shutting down" and "turning into a different person" when they visit, in contrast to her confident professional persona.

She has been on Lexapro 10mg daily for approximately 2-3 years with good efficacy for anxiety management. However, she reports significant emotional blunting, particularly noting inability to feel excitement or positive emotions. She describes getting a new job and feeling excited cognitively but unable to experience the emotional component, stating "I cannot chemically feel that way." She is motivated to taper off Lexapro to "fully live" and experience the full range of emotions while managing anxiety through therapy.

Current anxiety is well-controlled on medication. She denies current suicidal or homicidal ideation, history of psychiatric hospitalizations, manic episodes, psychotic symptoms, or eating disorder. No formal ADHD or autism diagnosis, though her husband has suggested possible autism spectrum traits based on sensory sensitivities and overstimulation. She reports hyperfocus ability, particularly with her artwork where she can work for 8 hours without breaks.

Substance use includes occasional marijuana use (approximately once weekly for stress relief) and coffee (2 cups daily maximum). Denies nicotine or other substance use.

She has never participated in therapy previously and is motivated to begin. She lives in a nearby mountain town with her husband. She presents as insightful, articulate, and engaged in treatment planning.`);

    setPreviousNote('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Generate Epic Note
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Configuration Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Setting Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Setting
              </label>
              <select
                value={setting}
                onChange={(e) => handleSettingChange(e.target.value as Setting)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {SETTINGS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Visit Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visit Type
                {isPreviousNoteRequired() && (
                  <span className="text-red-500 ml-1">* Previous note required</span>
                )}
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {getVisitTypesForSetting(setting).map(vt => (
                  <option key={vt} value={vt}>{vt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transcript Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transcript <span className="text-red-500">*</span>
              {loadingTranscript && (
                <span className="ml-2 text-sm text-blue-600">Loading from Google Drive...</span>
              )}
              <button
                onClick={loadSampleData}
                disabled={loadingTranscript}
                className="ml-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
              >
                Load Sample Data
              </button>
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              placeholder={loadingTranscript ? "Loading transcript from Google Drive..." : "Paste the session transcript here..."}
              disabled={loadingTranscript}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              {transcript.split(/\s+/).filter(w => w).length} words
            </p>
          </div>

          {/* Previous Note (Optional/Required based on visit type) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Previous Note
              {isPreviousNoteRequired() ? (
                <span className="text-red-500 ml-1">* Required for {visitType}</span>
              ) : (
                <span className="text-gray-500 ml-1">(Optional)</span>
              )}
            </label>
            <textarea
              value={previousNote}
              onChange={(e) => setPreviousNote(e.target.value)}
              rows={6}
              placeholder={isPreviousNoteRequired()
                ? "Previous note is required for context..."
                : "Optionally paste a previous note for context..."}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                isPreviousNoteRequired() && !previousNote ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {previousNote && (
              <p className="text-sm text-gray-500 mt-1">
                {previousNote.split(/\s+/).filter(w => w).length} words
              </p>
            )}
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handlePreviewPrompt}
              disabled={isGenerating || isPreviewing || !transcript}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isPreviewing ? 'Loading...' : 'Preview Prompt'}
            </button>
            <button
              onClick={handleGenerateNote}
              disabled={isGenerating || !transcript || (isPreviousNoteRequired() && !previousNote)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Note'}
            </button>
          </div>

          {/* Generated Note Output */}
          {generatedNote && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generated Note
                </h2>
                <div className="flex gap-2 items-center">
                  {receipt && (
                    <div className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      <span className="text-gray-600 dark:text-gray-400">Hash: </span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {receipt.promptHash}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
                {generatedNote}
              </div>

              {/* Comprehensive Validation Results - Moonlit Error Style */}
              {receipt?.validationResult && !receipt.validationResult.valid && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{
                    backgroundColor: moonlitTheme.colors.error.bg,
                    border: `1px solid ${moonlitTheme.colors.error.border}`
                  }}
                >
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 mt-0.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style={{ color: moonlitTheme.colors.error.icon }}
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: moonlitTheme.colors.error.text }}
                      >
                        Note Structure Errors - Manual Correction Required:
                      </p>
                      <ul
                        className="list-disc list-inside text-sm space-y-1"
                        style={{ color: moonlitTheme.colors.error.text }}
                      >
                        {receipt.validationResult.errors.map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warnings */}
              {receipt?.validationResult?.warnings && receipt.validationResult.warnings.length > 0 && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{
                    backgroundColor: moonlitTheme.colors.warning.bg,
                    border: `1px solid ${moonlitTheme.colors.warning.border}`
                  }}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-5 w-5 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style={{ color: moonlitTheme.colors.warning.icon }}
                    >
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: moonlitTheme.colors.warning.text }}
                      >
                        Note Warnings - Review Recommended:
                      </p>
                      <ul
                        className="list-disc list-inside text-sm space-y-1"
                        style={{ color: moonlitTheme.colors.warning.text }}
                      >
                        {receipt.validationResult.warnings.map((warning: string, idx: number) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Validation Issues (SmartTools specific) */}
              {receipt?.validationIssues && receipt.validationIssues.length > 0 && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{
                    backgroundColor: moonlitTheme.colors.info.bg,
                    border: `1px solid ${moonlitTheme.colors.info.border}`
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: moonlitTheme.colors.info.text }}
                  >
                    SmartTools Issues:
                  </p>
                  <ul
                    className="list-disc list-inside text-sm"
                    style={{ color: moonlitTheme.colors.info.text }}
                  >
                    {receipt.validationIssues.map((issue: any, idx: number) => (
                      <li key={idx}>
                        {issue.message}
                        {issue.suggestion && (
                          <span style={{ color: moonlitTheme.colors.text.muted }}> - {issue.suggestion}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message if Valid */}
              {receipt?.validationResult && receipt.validationResult.valid && !receipt?.validationIssues && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{
                    backgroundColor: moonlitTheme.colors.success.bg,
                    border: `1px solid ${moonlitTheme.colors.success.border}`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style={{ color: moonlitTheme.colors.success.icon }}
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p
                      className="text-sm font-medium"
                      style={{ color: moonlitTheme.colors.success.text }}
                    >
                      ✅ Note structure validated successfully - Ready for Epic
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prompt Preview Modal */}
        {showPromptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Compiled Prompt Preview
                </h3>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1">
                <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {promptPreview}
                </pre>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(promptPreview)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Copy Prompt
                </button>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}