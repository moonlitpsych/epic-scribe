'use client';

import { useState, useEffect } from 'react';
import { TemplateEditor } from '@/components/TemplateEditor';

export default function TemplatesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
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