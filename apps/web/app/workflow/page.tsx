'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkflowWizard from '@/components/workflow/WorkflowWizard';

/**
 * Unified Workflow Page
 * Combines template review and note generation into a cohesive wizard experience
 */
export default function WorkflowPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#E5DDD6] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <Link
              href="/home"
              className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/templates"
              className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Templates
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-serif text-[#0A1F3D] mb-2">
            Note Workflow
          </h1>
          <p className="text-[#5A6B7D]">
            Review your template, generate a note, and refine the output - all in one place
          </p>
        </div>

        <WorkflowWizard />
      </div>
    </div>
  );
}
