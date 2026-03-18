'use client';

import { useSession } from 'next-auth/react';
import { DEWorkflowWizard } from '@/components/designated-examiner/DEWorkflowWizard';

export default function DesignatedExaminerPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[var(--accent-warm)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">Please sign in to use this feature</p>
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <DEWorkflowWizard />;
}
