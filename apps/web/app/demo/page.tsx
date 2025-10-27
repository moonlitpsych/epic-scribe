'use client';

import { useState, useEffect } from 'react';
import { SmartToolsDemo } from '@/components/SmartToolsDemo';

export default function DemoPage() {
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
            Epic Scribe - SmartTools Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test the SmartTools parser and transformer with Epic SmartTools elements
          </p>
        </div>

        <SmartToolsDemo />
      </div>
    </main>
  );
}