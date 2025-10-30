'use client';

import { useState } from 'react';
import { Template, Setting } from '@epic-scribe/types';
import { PromptReceipt } from '@/types/prompt';
import TemplateReviewStep from './TemplateReviewStep';
import GenerateInputStep from './GenerateInputStep';
import NoteResultsStep from './NoteResultsStep';
import { Check } from 'lucide-react';

type Step = 'review' | 'generate' | 'results';

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
  const [currentStep, setCurrentStep] = useState<Step>('review');

  // Template selection (Step 1)
  const [setting, setSetting] = useState<Setting>();
  const [visitType, setVisitType] = useState<string>();
  const [template, setTemplate] = useState<Template | null>(null);

  // Patient selection (Step 2)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);

  // Generation inputs (Step 2)
  const [transcript, setTranscript] = useState('');
  const [previousNote, setPreviousNote] = useState('');

  // Results (Step 3)
  const [generatedNote, setGeneratedNote] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [receipt, setReceipt] = useState<PromptReceipt | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);

  // Step navigation handlers
  const handleTemplateSelected = (sel: Setting, vt: string, tmpl: Template) => {
    setSetting(sel);
    setVisitType(vt);
    setTemplate(tmpl);
  };

  const handleNextToGenerate = () => {
    if (template) {
      setCurrentStep('generate');
    }
  };

  const handleGenerate = async (trans: string, prevNote: string, patient: Patient | null, encId: string | null) => {
    setTranscript(trans);
    setPreviousNote(prevNote);
    setSelectedPatient(patient);
    setEncounterId(encId);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting,
          visitType,
          transcript: trans,
          priorNote: prevNote || undefined,
          patientId: patient?.id,
          encounterId: encId,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setGeneratedNote(data.note);
      setEditedNote(data.note); // Initialize editable version
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

  const handleBackToReview = () => {
    setCurrentStep('review');
  };

  const handleBackToGenerate = () => {
    setCurrentStep('generate');
  };

  const handleStartOver = () => {
    setCurrentStep('review');
    setTranscript('');
    setPreviousNote('');
    setGeneratedNote('');
    setEditedNote('');
    setReceipt(null);
    setValidationResult(null);
  };

  const handleSaveNote = async () => {
    if (!template || !receipt || !selectedPatient) {
      alert('Missing required data to save note. Please ensure a patient is selected.');
      return;
    }

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          encounterId: encounterId || undefined,
          templateId: template.templateId,
          promptVersion: receipt.promptVersion,
          promptHash: receipt.promptHash,
          generatedContent: generatedNote,
          finalNoteContent: editedNote,
          isFinal: true, // Mark as finalized when user clicks Save
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save note');
      }

      const data = await response.json();
      console.log('Note saved successfully:', data.note);

      // Note is now saved to database with patient association
    } catch (error) {
      console.error('Error saving note:', error);
      throw error; // Re-throw so the button component can handle the error
    }
  };

  // Progress indicator
  const steps = [
    { key: 'review', label: 'Review Template' },
    { key: 'generate', label: 'Generate Note' },
    { key: 'results', label: 'Results' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
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
                      ${isComplete ? 'bg-[#0A1F3D] text-white' : ''}
                      ${isCurrent ? 'bg-[#E89C8A] text-white' : ''}
                      ${isUpcoming ? 'bg-[#F5F1ED] text-[#5A6B7D] border-2 border-[#C5A882]/30' : ''}
                    `}
                  >
                    {isComplete ? <Check size={20} /> : index + 1}
                  </div>
                  <div
                    className={`
                      text-sm font-medium whitespace-nowrap
                      ${isComplete || isCurrent ? 'text-[#0A1F3D]' : 'text-[#5A6B7D]'}
                    `}
                  >
                    {step.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-4 rounded
                      ${isComplete ? 'bg-[#0A1F3D]' : 'bg-[#F5F1ED]'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'review' && (
        <TemplateReviewStep
          onTemplateSelected={handleTemplateSelected}
          onNext={handleNextToGenerate}
          initialSetting={setting}
          initialVisitType={visitType}
        />
      )}

      {currentStep === 'generate' && template && (
        <GenerateInputStep
          setting={setting!}
          visitType={visitType!}
          template={template}
          onGenerate={handleGenerate}
          onBack={handleBackToReview}
          isGenerating={isGenerating}
          initialTranscript={transcript}
          initialPreviousNote={previousNote}
          selectedPatient={selectedPatient}
          encounterId={encounterId}
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
        />
      )}
    </div>
  );
}
