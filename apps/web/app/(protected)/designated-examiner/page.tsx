'use client';

import { useSession } from 'next-auth/react';
import { DEWorkflowWizard } from '@/components/designated-examiner/DEWorkflowWizard';

export default function DesignatedExaminerPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#C5A882] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#5A6B7D]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5A6B7D] mb-4">Please sign in to use this feature</p>
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <DEWorkflowWizard />;
}
