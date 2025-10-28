'use client';

import { useState, useEffect } from 'react';
import { SmartListEditor } from '@/components/SmartListEditor';
import { QuickAddSmartList } from '@/components/QuickAddSmartList';
import { moonlitTheme } from '@/lib/moonlit-theme';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function SmartListsPage() {
  const [mounted, setMounted] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddSmartList = async (smartList: any) => {
    try {
      // Get current catalog
      const response = await fetch('/api/smartlists');
      const data = await response.json();

      // Create a unique key for the new SmartList
      const key = smartList.identifier.toLowerCase().replace(/\s+/g, '');

      // Add the new SmartList to the catalog
      const updatedCatalog = {
        ...data,
        smartLists: {
          ...data.smartLists,
          [key]: smartList
        }
      };

      // Save the updated catalog
      await fetch('/api/smartlists', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCatalog)
      });

      // Refresh the SmartListEditor by forcing a re-mount
      setMounted(false);
      setTimeout(() => setMounted(true), 100);

      // Show success message (could add a toast here)
      console.log('SmartList added successfully:', smartList);
    } catch (error) {
      console.error('Error adding SmartList:', error);
      alert('Failed to add SmartList. Please try again.');
    }
  };

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
            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-4 py-2 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              style={{
                backgroundColor: moonlitTheme.colors.tan
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#B59872'; // Slightly darker tan on hover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = moonlitTheme.colors.tan;
              }}
            >
              <Plus className="w-4 h-4" />
              Quick Add SmartList
            </button>
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

      {/* QuickAdd Modal */}
      {showQuickAdd && (
        <QuickAddSmartList
          onAdd={handleAddSmartList}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </main>
  );
}