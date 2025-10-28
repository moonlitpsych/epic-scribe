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

export default function WorkflowWizard() {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('review');

  // Template selection (Step 1)
  const [setting, setSetting] = useState<Setting>();
  const [visitType, setVisitType] = useState<string>();
  const [template, setTemplate] = useState<Template | null>(null);

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

  const handleGenerate = async (trans: string, prevNote: string) => {
    setTranscript(trans);
    setPreviousNote(prevNote);
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
          setting={setting!}
          visitType={visitType!}
        />
      )}
    </div>
  );
}
