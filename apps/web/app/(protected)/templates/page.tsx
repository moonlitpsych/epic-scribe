'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplateEditor } from '@/components/TemplateEditor';
import AuthStatus from '@/components/AuthStatus';

export default function TemplatesPage() {
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
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <Link
              href="/home"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/workflow"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Workflow
            </Link>
            <Link
              href="/designated-examiner"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Designated Examiner
            </Link>
          </div>
          <AuthStatus />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-heading text-[var(--text-primary)] mb-2">
            Template Manager
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Manage Epic note templates for all settings and visit types
          </p>
        </div>

        <TemplateEditor />
      </div>
    </main>
  );
}
