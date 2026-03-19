'use client';

import { useState } from 'react';
import { Template, Setting, EpicChartData } from '@epic-scribe/types';
import { PromptReceipt } from '@/types/prompt';
import SetupRecordStep, { SetupData } from './SetupRecordStep';
import ReviewGenerateStep from './ReviewGenerateStep';
import NoteResultsStep from './NoteResultsStep';
import CompanionPairingModal from './CompanionPairingModal';
import { useSyncSession } from '@/hooks/useSyncSession';
import { Check, Link2, Wifi } from 'lucide-react';

type Step = 'setup' | 'review-generate' | 'results';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string;
  notes?: string;
}

export default function WorkflowWizard() {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('setup');

  // Template selection
  const [setting, setSetting] = useState<Setting>();
  const [visitType, setVisitType] = useState<string>();
  const [template, setTemplate] = useState<Template | null>(null);

  // Patient selection
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);

  // Generation inputs
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');

  // Results
  const [generatedNote, setGeneratedNote] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [receipt, setReceipt] = useState<PromptReceipt | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Epic chart data
  const [extractedEpicData, setExtractedEpicData] = useState<EpicChartData | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // Companion sync
  const {
    hasPairedDevice,
    isConnected: companionConnected,
    companionPriorNote,
    sendGeneratedNote,
    sendPatientContext,
    generatePairingCode,
    disconnectDevice,
    pairingCode: currentPairingCode,
    pairingExpiresAt,
  } = useSyncSession();

  // ─── Step navigation ───

  const handleSetupComplete = (data: SetupData) => {
    setSetting(data.setting);
    setVisitType(data.visitType);
    setTemplate(data.template);
    setSelectedPatient(data.patient as any);
    setEncounterId(data.encounterId);
    setTranscript(data.transcript);
    setCurrentStep('review-generate');
  };

  const handleSkipRecording = (data: Omit<SetupData, 'transcript'>) => {
    setSetting(data.setting);
    setVisitType(data.visitType);
    setTemplate(data.template);
    setSelectedPatient(data.patient as any);
    setEncounterId(data.encounterId);
    setTranscript('');
    setCurrentStep('review-generate');
  };

  const handleBackToSetup = () => {
    setCurrentStep('setup');
  };

  const handleGenerate = async (trans: string, prevNote: string, patient: Patient | null, encId: string | null, epicChartDataRaw?: string, questionnairesCompleted?: boolean) => {
    setTranscript(trans);
    setPreviousNote(prevNote);
    if (patient) setSelectedPatient(patient);
    setEncounterId(encId);
    setIsGenerating(true);

    // Sync patient context to companion
    if (hasPairedDevice && patient) {
      sendPatientContext({
        firstName: patient.first_name,
        lastName: patient.last_name,
        setting: setting as string,
        visitType,
        status: 'generating',
      });
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting,
          visitType,
          transcript: trans,
          priorNote: prevNote || undefined,
          epicChartData: epicChartDataRaw || undefined,
          questionnairesCompleted: questionnairesCompleted || undefined,
          patientId: patient?.id,
          encounterId: encId,
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
      if (data.receipt?.epicChartData) {
        setExtractedEpicData(data.receipt.epicChartData);
      }
      setCurrentStep('results');

      if (hasPairedDevice) {
        sendGeneratedNote(data.note);
      }
    } catch (error) {
      console.error('Error generating note:', error);
      alert('Failed to generate note. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToGenerate = () => {
    setCurrentStep('review-generate');
  };

  const handleStartOver = () => {
    setCurrentStep('setup');
    setTranscript('');
    setPreviousNote('');
    setGeneratedNote('');
    setEditedNote('');
    setReceipt(null);
    setValidationResult(null);
    setSelectedPatient(null);
    setEncounterId(null);
    setExtractedEpicData(null);
  };

  const handleSaveNote = async () => {
    if (!template || !receipt || !selectedPatient) {
      alert('Missing required data to save note. Please ensure a patient is selected.');
      return;
    }

    try {
      const templateId = (template as any).template_id || (template as any).templateId;

      if (!templateId) {
        console.error('Template ID not found. Template object:', template);
        throw new Error('Template ID is missing from template object');
      }

      console.log('[SaveNote] Preparing to save note:', {
        templateId,
        promptVersion: receipt.promptVersion,
        promptHash: receipt.promptHash,
        hasGeneratedContent: !!generatedNote,
        hasFinalContent: !!editedNote,
        patientId: selectedPatient.id,
        encounterId: encounterId || 'none',
        hasEpicChartData: !!extractedEpicData,
      });

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          encounterId: encounterId || undefined,
          templateId,
          promptVersion: receipt.promptVersion,
          promptHash: receipt.promptHash,
          generatedContent: generatedNote,
          finalNoteContent: editedNote,
          isFinal: true,
          epicChartData: extractedEpicData || undefined,
          setting: setting || undefined,
          visitType: visitType || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SaveNote] API error:', errorData);
        throw new Error(errorData.message || 'Failed to save note');
      }

      const data = await response.json();
      console.log('[SaveNote] Note saved successfully:', data.note);
    } catch (error) {
      console.error('[SaveNote] Error saving note:', error);
      throw error;
    }
  };

  // Progress indicator
  const steps = [
    { key: 'setup', label: 'Setup & Record' },
    { key: 'review-generate', label: 'Review & Generate' },
    { key: 'results', label: 'Results' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1" />
          <button
            onClick={() => setShowPairingModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
              hasPairedDevice
                ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]'
                : 'bg-[#13101f] text-[#a78bfa] border border-[#2a2050] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {hasPairedDevice ? <Wifi size={14} /> : <Link2 size={14} />}
            {hasPairedDevice ? 'Companion Linked' : 'Link Work Device'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2
                      ${isComplete ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)]' : ''}
                      ${isCurrent ? 'bg-[var(--accent-warm)] text-[var(--text-inverse)]' : ''}
                      ${isUpcoming ? 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-2 border-[var(--border-default)]' : ''}
                    `}
                  >
                    {isComplete ? <Check size={20} /> : index + 1}
                  </div>
                  <div
                    className={`
                      text-sm font-medium whitespace-nowrap
                      ${isComplete || isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}
                    `}
                  >
                    {step.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-4 rounded
                      ${isComplete ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface-2)]'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'setup' && (
        <SetupRecordStep
          onSetupComplete={handleSetupComplete}
          onSkipRecording={handleSkipRecording}
          initialPatient={selectedPatient}
          initialSetting={setting}
          initialVisitType={visitType}
          initialEncounterId={encounterId}
        />
      )}

      {currentStep === 'review-generate' && template && selectedPatient && (
        <ReviewGenerateStep
          setting={setting!}
          visitType={visitType!}
          template={template}
          patient={selectedPatient as any}
          encounterId={encounterId}
          initialTranscript={transcript}
          companionPriorNote={companionPriorNote}
          onGenerate={handleGenerate}
          onBack={handleBackToSetup}
          isGenerating={isGenerating}
        />
      )}

      {currentStep === 'results' && template && (
        <NoteResultsStep
          template={template}
          generatedNote={generatedNote}
          editedNote={editedNote}
          onEditedNoteChange={setEditedNote}
          validationResult={validationResult}
          onRegenerate={handleBackToGenerate}
          onStartOver={handleStartOver}
          onSaveNote={selectedPatient ? handleSaveNote : undefined}
          setting={setting!}
          visitType={visitType!}
          selectedPatient={selectedPatient}
          onPatientSelect={setSelectedPatient}
          hasPairedDevice={hasPairedDevice}
        />
      )}

      {/* Companion Pairing Modal */}
      <CompanionPairingModal
        isOpen={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        hasPairedDevice={hasPairedDevice}
        isConnected={companionConnected}
        pairingCode={currentPairingCode}
        pairingExpiresAt={pairingExpiresAt}
        onGenerateCode={generatePairingCode}
        onDisconnect={disconnectDevice}
      />
    </div>
  );
}
