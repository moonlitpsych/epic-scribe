'use client';

import { useState } from 'react';
import { GenerateNoteRequest, GenerateNoteResponse } from '@epic-scribe/types';

// Sample transcript for testing
const SAMPLE_TRANSCRIPT = `
Doctor: Good morning, how have you been since our last visit?

Patient: Not great, honestly. I've been feeling really down for the past month, maybe even longer. It's been getting worse.

Doctor: Can you tell me more about what you mean by feeling down?

Patient: I just have no energy, no motivation. I used to love playing guitar and going hiking with my kids, but I haven't done either in weeks. Nothing feels enjoyable anymore.

Doctor: How's your sleep been?

Patient: Terrible. I fall asleep okay around 10 PM, but I wake up at 3 or 4 AM and can't get back to sleep. I just lie there with my mind racing about everything that's wrong.

Doctor: And your appetite?

Patient: I've lost about 15 pounds in the last two months. Food just doesn't appeal to me. My wife keeps trying to get me to eat, but I'm just not hungry.

Doctor: Have you had any thoughts of harming yourself?

Patient: I've had some passive thoughts, like wondering if everyone would be better off without me, but I would never actually do anything. I have my kids to think about.

Doctor: Have you ever been hospitalized for psychiatric reasons?

Patient: Yes, once back in 2018. I was at University Hospital for about a week for severe depression. That's when they started me on sertraline.

Doctor: Any history of suicide attempts?

Patient: No, never. Even when things were really bad in 2018, I never attempted anything.

Doctor: Do you drink alcohol or use any substances?

Patient: I have a couple beers on the weekends, nothing excessive. I don't use any drugs. I used to smoke cigarettes but quit 5 years ago.

Doctor: Tell me about your living situation and support system.

Patient: I live with my wife and two kids, ages 8 and 12. My wife is very supportive, but I can tell this is wearing on her. I was working as a software engineer but got laid off 2 months ago, which has made everything worse.

Doctor: Any trauma or difficult experiences in your past?

Patient: My parents divorced when I was young, and there was a lot of fighting. But nothing too traumatic, no abuse or anything like that.
`;

export default function TestPsychiatricPage() {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [generatedNote, setGeneratedNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visitType, setVisitType] = useState<'Intake' | 'Follow-up'>('Intake');

  const generateNote = async () => {
    setLoading(true);
    setError('');
    setGeneratedNote('');

    try {
      const request: GenerateNoteRequest = {
        setting: 'HMHI Downtown RCC',
        visitType: visitType,
        transcript,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate note');
      }

      const data: GenerateNoteResponse = await response.json();
      setGeneratedNote(data.note);

      if (data.validationIssues && data.validationIssues.length > 0) {
        console.warn('Validation issues:', data.validationIssues);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Test Psychiatric Note Generation
        </h1>
        <p className="text-gray-600 mb-8">
          Testing the focused psychiatric note template with enhanced HPI detail and structured sections
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcript Input */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transcript
            </h2>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
              placeholder="Paste or type transcript here..."
            />

            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Visit Type:</label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as 'Intake' | 'Follow-up')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="Intake">Intake (Comprehensive ROS)</option>
                  <option value="Follow-up">Follow-up (Focused ROS)</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {transcript.split(/\s+/).length} words
                </div>
                <button
                  onClick={generateNote}
                  disabled={loading || !transcript}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Note'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Generated Note Output */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Generated Note
              </h2>
              {generatedNote && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedNote);
                    alert('Note copied to clipboard!');
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Copy
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && !generatedNote && (
              <div className="h-96 flex items-center justify-center text-gray-400">
                Generated note will appear here
              </div>
            )}

            {!loading && generatedNote && (
              <div className="h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                  {generatedNote}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Key Features of Focused Psychiatric Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>✨ Enhanced HPI:</strong> Detailed narrative with higher temperature (0.7) for rich clinical detail
            </div>
            <div>
              <strong>📋 SmartList Integration:</strong> All ROS, MSE, and social history items use SmartLists
            </div>
            <div>
              <strong>🧠 Structured Formulation:</strong> Exact 4-paragraph format with biopsychosocial model
            </div>
            <div>
              <strong>💊 Formatted Plan:</strong> Clear sections for meds, therapy, labs, and follow-up
            </div>
            <div>
              <strong>🎯 Section-Specific Instructions:</strong> Each section has tailored generation rules
            </div>
            <div>
              <strong>📝 Epic-Ready:</strong> SmartLinks converted to DotPhrases, no bullets or numbered lists
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}