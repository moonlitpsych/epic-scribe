'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Scale, FileText, Copy, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Report {
  id: string;
  content: string;
  criteriaAssessment: {
    meets_criterion_1: boolean;
    meets_criterion_2: boolean;
    meets_criterion_3: boolean;
    meets_criterion_4: boolean;
    meets_criterion_5: boolean;
  };
  metadata?: {
    modelUsed: string;
    latencyMs: number;
    wordCount: number;
  };
}

const CRITERION_LABELS = [
  'Mental Illness',
  'Danger/Grave Disability',
  'Lacks Rational Decision-Making',
  'No Less Restrictive Alternative',
  'Adequate Care Available',
];

export default function DesignatedExaminerPage() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'input' | 'results'>('input');

  // Input state
  const [patientName, setPatientName] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [commitmentType, setCommitmentType] = useState<'30-day' | '60-day' | '90-day'>('30-day');
  const [transcript, setTranscript] = useState('');
  const [cheatSheetNotes, setCheatSheetNotes] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Results state
  const [report, setReport] = useState<Report | null>(null);
  const [editedReport, setEditedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const canGenerate = transcript.trim().length > 0 && patientName.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/designated-examiner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          patientName,
          hearingDate: hearingDate || undefined,
          commitmentType,
          cheatSheetNotes: cheatSheetNotes || undefined,
          clinicalNotes: clinicalNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const data = await response.json();
      setReport({
        id: data.reportId,
        content: data.report,
        criteriaAssessment: data.criteriaAssessment,
        metadata: data.metadata,
      });
      setEditedReport(data.report);
      setStep('results');
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setReport(null);
    setEditedReport('');
    setError(null);
    // Optionally clear inputs
    // setTranscript('');
    // setPatientName('');
    // setHearingDate('');
    // setCheatSheetNotes('');
  };

  const handleReset = () => {
    if (report) {
      setEditedReport(report.content);
    }
  };

  const allCriteriaMet = report
    ? Object.values(report.criteriaAssessment).every((v) => v === true)
    : false;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-[#5A6B7D]">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5A6B7D] mb-4">Please sign in to use this feature</p>
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-[#E89C8A]" />
              <h1 className="text-3xl font-serif text-[#0A1F3D]">
                Designated Examiner Workflow
              </h1>
            </div>
            <Link
              href="/workflow"
              className="text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors text-sm"
            >
              ← Back to Clinical Notes
            </Link>
          </div>
          <p className="text-[#5A6B7D] mb-4">
            Involuntary Commitment Assessment — Utah Mental Health Court
          </p>

          {/* New Presentation Helper Button */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  🎯 New: Court Presentation Helper
                </h3>
                <p className="text-sm text-gray-600">
                  Structured format for presenting to judges with all sections you need
                </p>
              </div>
              <Link
                href="/designated-examiner/presentation"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                Open Presentation Helper
              </Link>
            </div>
          </div>
        </div>

        {/* Input Step */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
            <h2 className="text-2xl font-serif text-[#0A1F3D] mb-6">
              Interview Information
            </h2>

            {/* Patient Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Last, First"
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Hearing Date
                </label>
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Commitment Length <span className="text-red-500">*</span>
                </label>
                <select
                  value={commitmentType}
                  onChange={(e) => setCommitmentType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                >
                  <option value="30-day">30 Days (Salt Lake County)</option>
                  <option value="60-day">60 Days (Outside SL County)</option>
                  <option value="90-day">90 Days (Extended)</option>
                </select>
              </div>
            </div>

            {/* Transcript Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                Interview Transcript <span className="text-red-500">*</span>
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste Google Meet transcript of the designated examiner interview here..."
                rows={12}
                className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-[#5A6B7D]">{wordCount} words</p>
                {transcript.trim().length === 0 && (
                  <p className="text-sm text-red-500">Transcript is required</p>
                )}
              </div>
            </div>

            {/* Cheat Sheet Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                Your Interview Notes (Optional)
              </label>
              <p className="text-xs text-[#5A6B7D] mb-2">
                Paste notes from your cheat sheet or any observations not captured in the transcript
              </p>
              <textarea
                value={cheatSheetNotes}
                onChange={(e) => setCheatSheetNotes(e.target.value)}
                placeholder="Example: Patient exhibited flat affect throughout interview. Made poor eye contact. Clothing disheveled..."
                rows={6}
                className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />
            </div>

            {/* Clinical Notes Context */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                Clinical Notes Context (Optional but Recommended)
              </label>
              <p className="text-xs text-[#5A6B7D] mb-2">
                Paste relevant sections from prior clinical notes to support your commitment argument. Include:
                prior hospitalizations, documented safety concerns, failed outpatient trials, medication non-compliance,
                violence history, or other historical context that strengthens the legal criteria.
              </p>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Example: Patient has 3 prior psychiatric hospitalizations in past 12 months. Last discharge 2 weeks ago with outpatient psychiatry and case management. Did not attend any follow-up appointments. Prior admission notes document SI with plan, access to means. History of assaulting family member during psychotic episode (2023-08-15)..."
                rows={8}
                className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C5A882]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Generate Commitment Assessment
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && report && (
          <div className="space-y-6">
            {/* Criteria Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
              <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">
                Utah Commitment Criteria Assessment
              </h3>

              {/* Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                {Object.entries(report.criteriaAssessment).map(([key, met], idx) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      met
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="text-xs text-gray-600 mb-1 font-medium">
                      Criterion {idx + 1}
                    </div>
                    <div className="text-xs text-gray-500 mb-2 h-8">
                      {CRITERION_LABELS[idx]}
                    </div>
                    <div
                      className={`text-sm font-bold flex items-center gap-1 ${
                        met ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {met ? (
                        <>
                          <CheckCircle2 size={14} />
                          MET
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} />
                          NOT MET
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Assessment */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  allCriteriaMet
                    ? 'bg-green-50 border-green-500'
                    : 'bg-amber-50 border-amber-500'
                }`}
              >
                <p className={`text-sm font-semibold ${
                  allCriteriaMet ? 'text-green-900' : 'text-amber-900'
                }`}>
                  <strong>Overall Assessment:</strong>{' '}
                  {allCriteriaMet
                    ? 'Patient meets ALL 5 criteria for involuntary commitment under Utah law'
                    : 'Patient does NOT meet all 5 criteria — commitment may not be appropriate'}
                </p>
              </div>

              {/* Metadata */}
              {report.metadata && (
                <div className="mt-4 pt-4 border-t border-[#C5A882]/20">
                  <div className="flex items-center justify-between text-xs text-[#5A6B7D]">
                    <span>Generated in {report.metadata.latencyMs}ms</span>
                    <span>{report.metadata.wordCount} words</span>
                    <span>Model: {report.metadata.modelUsed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Report Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A1F3D]">
                    Generated Assessment (Editable)
                  </h3>
                  <p className="text-sm text-[#5A6B7D] mt-1">
                    Review and edit before using in court testimony
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors text-sm"
                  >
                    <RotateCcw size={16} className="inline mr-1" />
                    Reset
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#D88A7A] transition-colors"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle2 size={18} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                value={editedReport}
                onChange={(e) => setEditedReport(e.target.value)}
                className="w-full h-[700px] px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
                >
                  ← Start New Assessment
                </button>

                <p className="text-xs text-[#5A6B7D]">
                  {editedReport.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
