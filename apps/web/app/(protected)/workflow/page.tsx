'use client';

import { Suspense } from 'react';
import WorkflowWizard from '@/components/workflow/WorkflowWizard';

function WorkflowContent() {
  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-[#0A1F3D] mb-2">Note Generation Workflow</h1>
          <p className="text-[#5A6B7D]">
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
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-[#5A6B7D]">Loading workflow...</div>
      </div>
    }>
      <WorkflowContent />
    </Suspense>
  );
}
