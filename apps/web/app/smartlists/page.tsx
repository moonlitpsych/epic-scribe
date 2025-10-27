'use client';

import { useState, useEffect } from 'react';
import { SmartListEditor } from '@/components/SmartListEditor';
import Link from 'next/link';

export default function SmartListsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SmartList Manager</h1>
              <p className="text-sm text-gray-600">Manage Epic SmartList options and configurations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/smartlists/demo"
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Prompt Expansion Demo
            </Link>
            <Link
              href="/templates"
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Templates
            </Link>
            <Link
              href="/demo"
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Parser Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <SmartListEditor />
      </div>
    </main>
  );
}