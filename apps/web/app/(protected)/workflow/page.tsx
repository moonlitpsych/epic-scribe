'use client';

import { Suspense } from 'react';
import WorkflowWizard from '@/components/workflow/WorkflowWizard';

function WorkflowContent() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading text-[var(--text-primary)] mb-2 tracking-tight">Note Generation Workflow</h1>
          <p className="text-[var(--text-secondary)]">
            Generate Epic-ready psychiatry notes with SmartTools
          </p>
        </div>

        <WorkflowWizard />
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading workflow...</div>
      </div>
    }>
      <WorkflowContent />
    </Suspense>
  );
}
