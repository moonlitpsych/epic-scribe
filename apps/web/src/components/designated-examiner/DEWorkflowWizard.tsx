'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scale, AlertCircle, Clock, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

import { StepProgressBar } from './StepProgressBar';
import { Step1DocumentationInput } from './Step1DocumentationInput';
import { Step2AnalysisResults } from './Step2AnalysisResults';
import { Step3InterviewQuestions } from './Step3InterviewQuestions';
import { Step4FinalDetermination } from './Step4FinalDetermination';
import { Step5TestimonyView } from './Step5TestimonyView';
import { WORKFLOW_STEP_LABELS } from '@/types/designated-examiner';

import type {
  WorkflowStep,
  DEWorkflowReport,
  CreateWorkflowInput,
  InterviewAnswers,
} from '@/types/designated-examiner';

interface DEWorkflowWizardProps {
  initialWorkflowId?: string;
}

export function DEWorkflowWizard({ initialWorkflowId }: DEWorkflowWizardProps) {
  const [workflowId, setWorkflowId] = useState<string | null>(initialWorkflowId || null);
  const [workflow, setWorkflow] = useState<DEWorkflowReport | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inProgressWorkflows, setInProgressWorkflows] = useState<DEWorkflowReport[]>([]);
  const [showWorkflowList, setShowWorkflowList] = useState(!initialWorkflowId);

  // Load existing workflow if ID provided
  const loadWorkflow = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/designated-examiner/workflow/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load workflow');
      }

      const data = await response.json();
      setWorkflow(data.workflow);
      setCurrentStep(data.workflow.workflow_step || 1);
    } catch (err) {
      console.error('Error loading workflow:', err);
      setError('Failed to load workflow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch in-progress workflows on mount
  const fetchInProgressWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/designated-examiner/workflow?status=in_progress');
      if (response.ok) {
        const data = await response.json();
        setInProgressWorkflows(data.workflows || []);
      }
    } catch (err) {
      console.error('Error fetching in-progress workflows:', err);
    }
  }, []);

  useEffect(() => {
    if (initialWorkflowId) {
      loadWorkflow(initialWorkflowId);
      setShowWorkflowList(false);
    } else {
      fetchInProgressWorkflows();
    }
  }, [initialWorkflowId, loadWorkflow, fetchInProgressWorkflows]);

  // Resume an in-progress workflow
  const handleResumeWorkflow = (id: string) => {
    setWorkflowId(id);
    loadWorkflow(id);
    setShowWorkflowList(false);
  };

  // Start a brand new workflow
  const handleStartNewWorkflow = () => {
    setShowWorkflowList(false);
    setWorkflowId(null);
    setWorkflow(null);
    setCurrentStep(1);
  };

  // Step 1: Create workflow and run analysis
  const handleStep1Submit = async (data: CreateWorkflowInput) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Create the workflow
      const createResponse = await fetch('/api/designated-examiner/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create workflow');
      }

      const createData = await createResponse.json();
      const newWorkflowId = createData.workflow.id;
      setWorkflowId(newWorkflowId);

      // Immediately run analysis (Step 2)
      const analyzeResponse = await fetch(
        `/api/designated-examiner/workflow/${newWorkflowId}/analyze`,
        {
          method: 'POST',
        }
      );

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analyzeData = await analyzeResponse.json();
      setWorkflow(analyzeData.workflow);
      setCurrentStep(2);
    } catch (err) {
      console.error('Error in step 1:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2 -> Step 3: Continue to interview
  const handleStep2Continue = () => {
    setCurrentStep(3);
  };

  // Step 3: Save interview answers
  const handleSaveAnswers = async (answers: InterviewAnswers) => {
    if (!workflowId) return;

    try {
      const response = await fetch(
        `/api/designated-examiner/workflow/${workflowId}/interview`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interview_answers: answers }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save answers');
      }

      const data = await response.json();
      setWorkflow(data.workflow);
    } catch (err) {
      console.error('Error saving answers:', err);
      throw err;
    }
  };

  // Step 3 -> Step 4: Generate final determination
  const handleStep3Continue = async () => {
    if (!workflowId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // First save any pending answers
      if (workflow?.interview_answers) {
        await handleSaveAnswers(workflow.interview_answers);
      }

      // Run final determination
      const response = await fetch(
        `/api/designated-examiner/workflow/${workflowId}/determine`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Final determination failed');
      }

      const data = await response.json();
      setWorkflow(data.workflow);
      setCurrentStep(4);
    } catch (err) {
      console.error('Error in step 3:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4 -> Step 5: View testimony
  const handleStep4Continue = async () => {
    if (!workflowId) return;

    // Update workflow to step 5
    try {
      const response = await fetch(
        `/api/designated-examiner/workflow/${workflowId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_step: 5,
            workflow_status: 'completed',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWorkflow(data.workflow);
      }
    } catch (err) {
      console.error('Error updating workflow:', err);
    }

    setCurrentStep(5);
  };

  // Start new assessment (goes back to landing page)
  const handleStartNew = () => {
    setWorkflowId(null);
    setWorkflow(null);
    setCurrentStep(1);
    setError(null);
    setShowWorkflowList(true);
    fetchInProgressWorkflows();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[var(--accent-warm)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Landing page with in-progress workflows
  if (showWorkflowList && !workflowId) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-8 w-8 text-[var(--accent-warm)]" />
              <h1 className="text-3xl font-heading text-[var(--text-primary)]">
                Designated Examiner Workflow
              </h1>
            </div>
            <p className="text-[var(--text-secondary)]">
              Involuntary Commitment Assessment — Utah Mental Health Court
            </p>
          </div>

          {/* Start New Button */}
          <button
            onClick={handleStartNewWorkflow}
            className="w-full mb-8 flex items-center justify-center gap-3 px-6 py-5 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-all"
          >
            <Plus size={24} />
            <span className="text-lg font-medium">Start New Assessment</span>
          </button>

          {/* In-Progress Workflows */}
          {inProgressWorkflows.length > 0 && (
            <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-surface-2)]">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-[var(--accent-warm)]" />
                  <h2 className="font-semibold text-[var(--text-primary)]">In-Progress Assessments</h2>
                  <span className="text-sm text-[var(--text-secondary)]">({inProgressWorkflows.length})</span>
                </div>
              </div>
              <div className="divide-y divide-[var(--border-default)]">
                {inProgressWorkflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => handleResumeWorkflow(wf.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)]">{wf.patient_name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Step {wf.workflow_step}: {WORKFLOW_STEP_LABELS[wf.workflow_step as WorkflowStep]}
                        </span>
                        {wf.hearing_date && (
                          <span className="text-sm text-[var(--text-secondary)]">
                            Hearing: {new Date(wf.hearing_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--accent-warm)]">
                      <span className="text-sm font-medium">Resume</span>
                      <ChevronRight size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {inProgressWorkflows.length === 0 && (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No in-progress assessments.</p>
              <p className="text-sm mt-1">Click &quot;Start New Assessment&quot; to begin.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-[var(--accent-warm)]" />
              <h1 className="text-3xl font-heading text-[var(--text-primary)]">
                Designated Examiner Workflow
              </h1>
            </div>
            <Link
              href="/flow"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              ← Back to Clinical Notes
            </Link>
          </div>
          <p className="text-[var(--text-secondary)]">
            Involuntary Commitment Assessment — Utah Mental Health Court
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <StepProgressBar currentStep={currentStep} isProcessing={isProcessing} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-[2px] flex items-start gap-3">
            <AlertCircle className="text-[var(--error-text)] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-[var(--error-text)]">Error</p>
              <p className="text-sm text-[var(--error-text)]">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          {currentStep === 1 && (
            <Step1DocumentationInput
              initialData={workflow || undefined}
              onSubmit={handleStep1Submit}
              isLoading={isProcessing}
            />
          )}

          {currentStep === 2 && workflow?.initial_analysis && workflow?.clarifying_questions && (
            <Step2AnalysisResults
              analysis={workflow.initial_analysis}
              questions={workflow.clarifying_questions}
              onContinue={handleStep2Continue}
            />
          )}

          {currentStep === 3 && workflow?.clarifying_questions && (
            <Step3InterviewQuestions
              questions={workflow.clarifying_questions}
              initialAnswers={workflow.interview_answers}
              onSaveAnswers={handleSaveAnswers}
              onContinue={handleStep3Continue}
              isLoading={isProcessing}
            />
          )}

          {currentStep === 4 && workflow?.final_analysis && (
            <Step4FinalDetermination
              finalAnalysis={workflow.final_analysis}
              onContinue={handleStep4Continue}
            />
          )}

          {currentStep === 5 && workflow?.final_analysis && workflow?.final_recommendation && (
            <Step5TestimonyView
              patientName={workflow.patient_name}
              hearingDate={workflow.hearing_date}
              commitmentType={workflow.commitment_type}
              finalAnalysis={workflow.final_analysis}
              finalRecommendation={workflow.final_recommendation}
              onStartNew={handleStartNew}
            />
          )}
        </div>
      </div>
    </div>
  );
}
