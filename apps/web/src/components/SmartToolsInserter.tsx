'use client';

import { useState, useEffect } from 'react';
import smartListsCatalog from '../../../../configs/smartlists-catalog.json';

interface SmartToolsInserterProps {
  onInsert: (content: string) => void;
  onClose: () => void;
  currentContent: string;
}

export function SmartToolsInserter({ onInsert, onClose, currentContent }: SmartToolsInserterProps) {
  const [selectedTab, setSelectedTab] = useState<'individual' | 'groups' | 'wildcards'>('groups');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSmartLists, setSelectedSmartLists] = useState<Set<string>>(new Set());
  const [insertPosition, setInsertPosition] = useState<'replace' | 'append'>('append');

  // Build the content to insert
  const buildInsertContent = () => {
    const parts: string[] = [];

    if (selectedGroup) {
      const group = smartListsCatalog.groups[selectedGroup as keyof typeof smartListsCatalog.groups];
      if (group) {
        parts.push(`${group.name}:`);
        group.smartLists.forEach(listId => {
          const smartList = smartListsCatalog.smartLists[listId as keyof typeof smartListsCatalog.smartLists];
          if (smartList) {
            parts.push(`${smartList.displayName}: {${smartList.displayName}:${smartList.epicId}}`);
          }
        });
      }
    } else if (selectedSmartLists.size > 0) {
      selectedSmartLists.forEach(listId => {
        const smartList = smartListsCatalog.smartLists[listId as keyof typeof smartListsCatalog.smartLists];
        if (smartList) {
          parts.push(`${smartList.displayName}: {${smartList.displayName}:${smartList.epicId}}`);
        }
      });
    }

    return parts.join('\n');
  };

  const handleInsert = () => {
    const newContent = buildInsertContent();
    if (newContent) {
      if (insertPosition === 'replace') {
        onInsert(newContent);
      } else {
        onInsert(currentContent ? `${currentContent}\n\n${newContent}` : newContent);
      }
    }
  };

  const toggleSmartList = (listId: string) => {
    const newSet = new Set(selectedSmartLists);
    if (newSet.has(listId)) {
      newSet.delete(listId);
    } else {
      newSet.add(listId);
    }
    setSelectedSmartLists(newSet);
  };

  const selectGroup = (groupName: string) => {
    if (selectedGroup === groupName) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(groupName);
      // Clear individual selections when selecting a group
      setSelectedSmartLists(new Set());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Insert Epic SmartTools</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setSelectedTab('groups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              SmartList Groups
            </button>
            <button
              onClick={() => setSelectedTab('individual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'individual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Individual SmartLists
            </button>
            <button
              onClick={() => setSelectedTab('wildcards')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'wildcards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Wildcards & SmartLinks
            </button>
          </nav>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {selectedTab === 'groups' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Select a pre-configured group of SmartLists to insert all at once.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(smartListsCatalog.groups).map(([key, group]) => (
                  <div
                    key={key}
                    onClick={() => selectGroup(key)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedGroup === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                    <div className="text-xs text-gray-500">
                      Contains {group.smartLists.length} SmartLists
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.smartLists.slice(0, 5).map(listId => {
                        const list = smartListsCatalog.smartLists[listId as keyof typeof smartListsCatalog.smartLists];
                        return (
                          <span
                            key={listId}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                          >
                            {list.displayName}
                          </span>
                        );
                      })}
                      {group.smartLists.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{group.smartLists.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'individual' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Select individual SmartLists to insert. You can choose multiple items.
              </p>

              {Object.entries(
                Object.entries(smartListsCatalog.smartLists).reduce((acc, [key, list]) => {
                  const group = list.group || 'Other';
                  if (!acc[group]) acc[group] = [];
                  acc[group].push({ key, ...list });
                  return acc;
                }, {} as Record<string, any[]>)
              ).map(([groupName, lists]) => (
                <div key={groupName} className="mb-6">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">{groupName}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lists.map(list => (
                      <label
                        key={list.key}
                        className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSmartLists.has(list.key)}
                          onChange={() => toggleSmartList(list.key)}
                          className="mr-2"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{list.displayName}</div>
                          <div className="text-xs text-gray-500">ID: {list.epicId}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'wildcards' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Insert wildcards or common SmartLinks into your template.
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Wildcard</h3>
                  <button
                    onClick={() => onInsert(currentContent ? `${currentContent}\n***` : '***')}
                    className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                  >
                    <span className="text-lg mr-2">***</span>
                    Insert Wildcard
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholder for free-text content from transcript
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Common SmartLinks</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '@FNAME@', '@LNAME@', '@age@', '@MRN@', '@DATE@',
                      '@DIAGNOSIS@', '@MEDS@', '@ALLERGIES@', '@LABS@'
                    ].map(link => (
                      <button
                        key={link}
                        onClick={() => onInsert(currentContent ? `${currentContent} ${link}` : link)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-sm"
                      >
                        {link}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={insertPosition === 'append'}
                  onChange={() => setInsertPosition('append')}
                  className="mr-2"
                />
                <span className="text-sm">Add to existing content</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={insertPosition === 'replace'}
                  onChange={() => setInsertPosition('replace')}
                  className="mr-2"
                />
                <span className="text-sm">Replace all content</span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInsert}
                disabled={!selectedGroup && selectedSmartLists.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Insert SmartTools
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}