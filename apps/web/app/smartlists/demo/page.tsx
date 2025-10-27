'use client';

import { useState, useEffect } from 'react';

export default function SmartListDemoPage() {
  const [selectedLists, setSelectedLists] = useState<string[]>(['mood', 'affect', 'appearance']);
  const [promptOutput, setPromptOutput] = useState<string>('');
  const [sampleNote, setSampleNote] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Sample template section with SmartLists
  const sampleTemplate = `MENTAL STATUS EXAMINATION:
Appearance: {Appearance:304120201}
Behavior: {Behavior:304120202}
Eye Contact: {Eye Contact:304120203}
Speech: {Speech:304120204}
Mood: {Mood:304120205}
Affect: {Affect:304120206}
Thought Process: {Thought Process:304120207}
Thought Content: {Thought Content:304120208}
Perceptual Disturbances: {Perceptual Disturbances:304120209}
Suicidal Ideation: {Suicidal Ideation:304120210}
Homicidal Ideation: {Homicidal Ideation:304120211}
Insight: {Insight:304120212}
Judgment: {Judgment:304120213}`;

  // Sample filled note with SmartList selections
  const sampleFilledNote = `MENTAL STATUS EXAMINATION:
Appearance: {Appearance:304120201:: "Well-groomed, appropriate dress"}
Behavior: {Behavior:304120202:: "Cooperative"}
Eye Contact: {Eye Contact:304120203:: "Good"}
Speech: {Speech:304120204:: "Normal rate and tone"}
Mood: {Mood:304120205:: "Anxious"}
Affect: {Affect:304120206:: "Congruent with mood"}
Thought Process: {Thought Process:304120207:: "Linear and goal-directed"}
Thought Content: {Thought Content:304120208:: "No psychosis"}
Perceptual Disturbances: {Perceptual Disturbances:304120209:: "None"}
Suicidal Ideation: {Suicidal Ideation:304120210:: "Denies"}
Homicidal Ideation: {Homicidal Ideation:304120211:: "Denies"}
Insight: {Insight:304120212:: "Fair"}
Judgment: {Judgment:304120213:: "Fair"}`;

  useEffect(() => {
    // Generate prompt expansion for selected SmartLists
    generatePromptExpansion();
  }, [selectedLists]);

  const generatePromptExpansion = async () => {
    try {
      const response = await fetch('/api/smartlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exportForPrompt',
          smartListIds: selectedLists,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPromptOutput(data.prompt);
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
  };

  const validateNote = async () => {
    if (!sampleNote) return;

    try {
      const response = await fetch('/api/smartlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validateSelections',
          noteContent: sampleNote,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      }
    } catch (error) {
      console.error('Error validating note:', error);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SmartList Prompt Expansion Demo
          </h1>
          <p className="text-lg text-gray-600">
            See how SmartLists are expanded for the LLM to understand and select appropriate values
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Template with SmartLists</h2>
              <pre className="bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto">
                {sampleTemplate}
              </pre>
              <p className="text-sm text-gray-500 mt-2">
                Each {'{Display:EpicID}'} placeholder will be expanded with allowed values for the LLM
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Example Filled Note</h2>
              <div className="space-y-3">
                <textarea
                  value={sampleNote || sampleFilledNote}
                  onChange={(e) => setSampleNote(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="Paste or edit a note with SmartList selections..."
                />
                <button
                  onClick={validateNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Validate SmartList Selections
                </button>

                {validationResult && (
                  <div className={`p-4 rounded-md ${
                    validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <h3 className={`font-semibold ${
                      validationResult.valid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.valid ? '✅ All SmartList selections are valid!' : '❌ Validation errors found:'}
                    </h3>
                    {!validationResult.valid && (
                      <ul className="mt-2 space-y-1">
                        {validationResult.errors.map((error, i) => (
                          <li key={i} className="text-sm text-red-700">• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Expansion Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">LLM Prompt Expansion</h2>
            <p className="text-sm text-gray-600 mb-4">
              This is what gets included in the prompt to help the LLM select appropriate values:
            </p>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {promptOutput || 'Loading SmartList definitions...'}
              </pre>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Template contains SmartList placeholders like {'{Mood:304120205}'}</li>
                <li>2. System expands each SmartList with all allowed values</li>
                <li>3. LLM selects appropriate value based on transcript</li>
                <li>4. Output format: {'{Mood:304120205:: "Anxious"}'}</li>
                <li>5. System validates selected values are in allowed set</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <h3 className="font-semibold text-yellow-900 mb-2">Key Benefits:</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>• Ensures Epic compatibility with exact option values</li>
                <li>• Prevents hallucination of invalid options</li>
                <li>• Guides LLM with defaults and most common choices</li>
                <li>• Validates output before sending to Epic</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}