'use client';

import { useState, useEffect } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { Check, ArrowLeft, ArrowRight, Sparkles, Copy, Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string | null;
  notes?: string | null;
}

interface Encounter {
  id: string;
  setting: string;
  visit_type: string;
  scheduled_start: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface PromptReceipt {
  promptVersion: string;
  promptHash: string;
  validationResult?: ValidationResult;
}

// Settings and visit types
const SETTINGS: Setting[] = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Moonlit Psychiatry',
  'BHIDC therapy',
];

const VISIT_TYPES: Record<string, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
};

type Step = 'input' | 'results';

interface PatientGenerateTabProps {
  patient: Patient;
  encounters: Encounter[];
  preselectedEncounterId?: string | null;
  onNoteGenerated?: () => void;
}

export default function PatientGenerateTab({
  patient,
  encounters,
  preselectedEncounterId,
  onNoteGenerated,
}: PatientGenerateTabProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('input');

  // Template selection
  const [setting, setSetting] = useState<Setting>(SETTINGS[0]);
  const [visitType, setVisitType] = useState(VISIT_TYPES[SETTINGS[0]][0]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Encounter selection
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(preselectedEncounterId || null);

  // Input
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');
  const [collateralTranscript, setCollateralTranscript] = useState('');

  // Results
  const [generatedNote, setGeneratedNote] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [receipt, setReceipt] = useState<PromptReceipt | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load template when setting/visit type changes
  useEffect(() => {
    const loadTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const response = await fetch(
          `/api/templates?setting=${encodeURIComponent(setting)}&visitType=${encodeURIComponent(visitType)}`
        );
        if (response.ok) {
          const data = await response.json();
          setTemplate(data.template);
        }
      } catch (error) {
        console.error('Failed to load template:', error);
      } finally {
        setLoadingTemplate(false);
      }
    };
    loadTemplate();
  }, [setting, visitType]);

  // Auto-select setting/visitType from encounter if selected
  useEffect(() => {
    if (selectedEncounterId) {
      const encounter = encounters.find((e) => e.id === selectedEncounterId);
      if (encounter) {
        setSetting(encounter.setting as Setting);
        setVisitType(encounter.visit_type);
      }
    }
  }, [selectedEncounterId, encounters]);

  const handleSettingChange = (newSetting: Setting) => {
    setSetting(newSetting);
    setVisitType(VISIT_TYPES[newSetting][0]);
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      alert('Please enter a transcript');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting,
          visitType,
          transcript,
          priorNote: previousNote || undefined,
          collateralTranscript: collateralTranscript || undefined,
          patientId: patient.id,
          encounterId: selectedEncounterId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setGeneratedNote(data.note);
      setEditedNote(data.note);
      setReceipt(data.receipt);
      setValidationResult(data.receipt?.validationResult || null);
      setCurrentStep('results');
    } catch (error) {
      console.error('Error generating note:', error);
      alert('Failed to generate note. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!template || !receipt) {
      alert('Missing required data to save note');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const templateId = (template as any).template_id || (template as any).templateId;

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          encounterId: selectedEncounterId || undefined,
          templateId,
          promptVersion: receipt.promptVersion,
          promptHash: receipt.promptHash,
          generatedContent: generatedNote,
          finalNoteContent: editedNote,
          isFinal: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save note');
      }

      setSaveSuccess(true);
      onNoteGenerated?.();
    } catch (error) {
      console.error('Error saving note:', error);
      alert(error instanceof Error ? error.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep('input');
    setGeneratedNote('');
    setEditedNote('');
    setReceipt(null);
    setValidationResult(null);
    setSaveSuccess(false);
  };

  // Check if setting needs collateral transcript
  const needsCollateral = setting === 'Davis Behavioral Health' || setting === 'Redwood Clinic MHI';
  const needsPreviousNote = visitType === 'Transfer of Care' || visitType === 'Follow-up';

  return (
    <div className="space-y-6">
      {/* Patient Info Banner */}
      <div className="bg-[#0A1F3D] rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Generating note for</p>
            <p className="text-xl font-semibold">
              {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Template</p>
            <p className="font-medium">{setting} - {visitType}</p>
          </div>
        </div>
      </div>

      {currentStep === 'input' && (
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
            <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">Template Selection</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Setting */}
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">Setting</label>
                <select
                  value={setting}
                  onChange={(e) => handleSettingChange(e.target.value as Setting)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent bg-white"
                >
                  {SETTINGS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">Visit Type</label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent bg-white"
                >
                  {VISIT_TYPES[setting].map((vt) => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Link to Encounter */}
            {encounters.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#0A1F3D] mb-1">
                  Link to Encounter <span className="text-[#5A6B7D] font-normal">(optional)</span>
                </label>
                <select
                  value={selectedEncounterId || ''}
                  onChange={(e) => setSelectedEncounterId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent bg-white"
                >
                  <option value="">No encounter linked</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {new Date(enc.scheduled_start).toLocaleDateString()} - {enc.setting} - {enc.visit_type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Transcript Input */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
            <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">Transcript</h3>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your session transcript here..."
              className="w-full h-64 px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />
            <p className="mt-2 text-xs text-[#5A6B7D]">
              {transcript.length} characters
            </p>
          </div>

          {/* Previous Note (for TOC/Follow-up) */}
          {needsPreviousNote && (
            <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
              <h3 className="text-lg font-semibold text-[#0A1F3D] mb-2">Previous Note</h3>
              <p className="text-sm text-[#5A6B7D] mb-4">
                For {visitType} visits, paste the most recent note for continuity
              </p>
              <textarea
                value={previousNote}
                onChange={(e) => setPreviousNote(e.target.value)}
                placeholder="Paste the previous note here..."
                className="w-full h-48 px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              />
            </div>
          )}

          {/* Collateral/Staffing Transcript */}
          {needsCollateral && (
            <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
              <h3 className="text-lg font-semibold text-[#0A1F3D] mb-2">Staffing Transcript</h3>
              <p className="text-sm text-[#5A6B7D] mb-4">
                {setting} uses separate staffing recordings
              </p>
              <textarea
                value={collateralTranscript}
                onChange={(e) => setCollateralTranscript(e.target.value)}
                placeholder="Paste the staffing transcript here..."
                className="w-full h-48 px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !transcript.trim() || loadingTemplate}
              className="flex items-center gap-2 px-6 py-3 bg-[#E89C8A] text-white rounded-lg hover:bg-[#D4826F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Note
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'results' && (
        <div className="space-y-6">
          {/* Validation Status */}
          {validationResult && (
            <div className={`rounded-xl p-4 ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-start gap-3">
                {validationResult.valid ? (
                  <CheckCircle className="text-green-600 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                )}
                <div>
                  <p className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-amber-800'}`}>
                    {validationResult.valid ? 'Note validated successfully' : 'Validation warnings'}
                  </p>
                  {validationResult.warnings.length > 0 && (
                    <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                      {validationResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Generated Note */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C5A882]/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0A1F3D]">Generated Note</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors text-sm"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <textarea
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              className="w-full h-96 px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm"
            />

            <p className="mt-2 text-xs text-[#5A6B7D]">
              {editedNote.length} characters | Edit the note above before saving
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-4 py-2 text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              <RotateCcw size={18} />
              Start Over
            </button>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle size={16} />
                  Note saved!
                </span>
              )}
              <button
                onClick={handleSaveNote}
                disabled={isSaving || saveSuccess}
                className="flex items-center gap-2 px-6 py-3 bg-[#0A1F3D] text-white rounded-lg hover:bg-[#0A1F3D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSaving ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
