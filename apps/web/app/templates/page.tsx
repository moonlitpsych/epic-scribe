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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <Link
              href="/home"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/workflow"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Workflow
            </Link>
            <Link
              href="/designated-examiner"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Designated Examiner
            </Link>
          </div>
          <AuthStatus />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Template Manager
          </h1>
          <p className="text-lg text-gray-600">
            Manage Epic note templates for all settings and visit types
          </p>
        </div>

        <TemplateEditor />
      </div>
    </main>
  );
}