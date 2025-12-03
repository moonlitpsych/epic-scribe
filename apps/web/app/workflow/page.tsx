'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import WorkflowWizard from '@/components/workflow/WorkflowWizard';
import AuthStatus from '@/components/AuthStatus';

/**
 * Unified Workflow Page
 * Combines template review and note generation into a cohesive wizard experience
 */
export default function WorkflowPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#E5DDD6] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0A1F3D] border-r-transparent"></div>
          <p className="mt-4 text-[#5A6B7D]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
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
              href="/patients"
              className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Patients
            </Link>
            <Link
              href="/templates"
              className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/designated-examiner"
              className="text-sm text-[#5A6B7D] hover:text-[#0A1F3D] transition-colors"
            >
              Designated Examiner
            </Link>
          </div>
          <AuthStatus />
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
