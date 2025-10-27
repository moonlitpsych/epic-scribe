'use client';

import { useState, useEffect } from 'react';
import smartListsCatalog from '../../../../configs/smartlists-catalog.json';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SmartListOption {
  value: string;
  order: number;
  is_default?: boolean;
}

interface SmartList {
  identifier: string;
  epicId: string;
  displayName: string;
  group?: string;
  options: SmartListOption[];
}

// Sortable Item Component
function SortableItem({
  option,
  index,
  onValueChange,
  onDefaultChange,
  onRemove
}: {
  option: SmartListOption;
  index: number;
  onValueChange: (value: string) => void;
  onDefaultChange: (checked: boolean) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-gray-50 rounded-md ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      <div className="w-12 text-center text-sm text-gray-500">
        #{option.order}
      </div>

      <input
        type="text"
        value={option.value}
        onChange={(e) => onValueChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={option.is_default || false}
          onChange={(e) => onDefaultChange(e.target.checked)}
          className="mr-2"
        />
        <span className="text-sm text-gray-600">Default</span>
      </label>

      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:text-red-700"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export function SmartListEditor() {
  const [smartLists, setSmartLists] = useState<Record<string, SmartList>>({});
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<SmartList | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showAddNew, setShowAddNew] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load SmartLists from catalog
  useEffect(() => {
    const lists: Record<string, SmartList> = {};
    Object.entries(smartListsCatalog.smartLists).forEach(([key, list]) => {
      lists[key] = {
        ...list,
        identifier: list.identifier || key,
      };
    });
    setSmartLists(lists);
  }, []);

  // Get unique groups
  const groups = Array.from(new Set(
    Object.values(smartLists).map(list => list.group || 'Other')
  )).sort();

  // Filter SmartLists
  const filteredLists = Object.entries(smartLists).filter(([key, list]) => {
    const matchesSearch = searchTerm === '' ||
      list.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.epicId.includes(searchTerm) ||
      list.identifier.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = selectedGroup === 'all' || list.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  const handleEditList = (listKey: string) => {
    setSelectedList(listKey);
    setEditingList(JSON.parse(JSON.stringify(smartLists[listKey])));
  };

  const handleSaveList = async () => {
    if (editingList && selectedList) {
      const updatedLists = {
        ...smartLists,
        [selectedList]: editingList
      };

      setSmartLists(updatedLists);

      // Save to backend
      try {
        const response = await fetch('/api/smartlists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLists),
        });

        if (!response.ok) {
          throw new Error('Failed to save SmartList');
        }

        // Show success feedback (you could add a toast notification here)
        console.log('SmartList saved successfully');
      } catch (error) {
        console.error('Error saving SmartList:', error);
        // Revert on error
        setSmartLists(smartLists);
      }

      setEditingList(null);
      setSelectedList(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setSelectedList(null);
  };

  const handleAddOption = () => {
    if (editingList) {
      // Add new option at the beginning (top of list)
      const newOption = { value: 'New option', order: 1, is_default: false };

      // Shift all existing options down by 1
      const updatedOptions = editingList.options.map(opt => ({
        ...opt,
        order: opt.order + 1,
        is_default: opt.is_default // Keep existing defaults
      }));

      setEditingList({
        ...editingList,
        options: [newOption, ...updatedOptions]
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (editingList) {
      const newOptions = editingList.options.filter((_, i) => i !== index);
      // Reorder remaining options
      newOptions.forEach((opt, i) => {
        opt.order = i + 1;
      });
      setEditingList({
        ...editingList,
        options: newOptions
      });
    }
  };

  const handleOptionChange = (index: number, field: keyof SmartListOption, value: any) => {
    if (editingList) {
      const newOptions = [...editingList.options];
      newOptions[index] = {
        ...newOptions[index],
        [field]: value
      };

      // If setting as default, clear other defaults
      if (field === 'is_default' && value === true) {
        newOptions.forEach((opt, i) => {
          if (i !== index) opt.is_default = false;
        });
      }

      setEditingList({
        ...editingList,
        options: newOptions
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && editingList) {
      const oldIndex = parseInt(active.id.toString().replace('option-', ''));
      const newIndex = parseInt(over?.id.toString().replace('option-', '') || '0');

      const newOptions = arrayMove(editingList.options, oldIndex, newIndex);

      // Update order numbers
      newOptions.forEach((opt, i) => {
        opt.order = i + 1;
      });

      setEditingList({
        ...editingList,
        options: newOptions
      });
    }
  };

  const handleExport = () => {
    const dataToExport = Object.values(smartLists);

    if (exportFormat === 'json') {
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartlists.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      let csv = 'identifier,epicId,displayName,group,option_value,option_order,is_default\n';
      dataToExport.forEach(list => {
        list.options.forEach(opt => {
          csv += `"${list.identifier}","${list.epicId}","${list.displayName}","${list.group || ''}","${opt.value}",${opt.order},${opt.is_default || false}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartlists.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateNew = () => {
    const newKey = `custom_${Date.now()}`;
    const newList: SmartList = {
      identifier: 'New SmartList',
      epicId: '999999999',
      displayName: 'New SmartList',
      group: 'Custom',
      options: [
        { value: 'Option 1', order: 1, is_default: true },
        { value: 'Option 2', order: 2 }
      ]
    };

    setSmartLists({
      ...smartLists,
      [newKey]: newList
    });

    setSelectedList(newKey);
    setEditingList(newList);
    setShowAddNew(false);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - List View */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-semibold mb-4">SmartList Manager</h2>

          {/* Search and Filter */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by name or Epic ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateNew}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              + New SmartList
            </button>

            <div className="flex gap-1">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="px-2 py-1 border border-gray-300 rounded-l-md text-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={handleExport}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        {/* SmartList Items */}
        <div className="p-4 space-y-2">
          {filteredLists.map(([key, list]) => (
            <div
              key={key}
              onClick={() => handleEditList(key)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedList === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{list.displayName}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    Epic ID: {list.epicId}
                  </div>
                  {list.group && (
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {list.group}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {list.options.length} options
                  </div>
                  {list.options.find(o => o.is_default) && (
                    <div className="text-xs text-blue-600 mt-1">
                      Default: {list.options.find(o => o.is_default)?.value}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredLists.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No SmartLists found matching your criteria
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {editingList ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-semibold mb-4">Edit SmartList</h3>

                {/* SmartList Properties */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editingList.displayName}
                      onChange={(e) => setEditingList({
                        ...editingList,
                        displayName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Epic ID
                    </label>
                    <input
                      type="text"
                      value={editingList.epicId}
                      onChange={(e) => setEditingList({
                        ...editingList,
                        epicId: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Identifier
                    </label>
                    <input
                      type="text"
                      value={editingList.identifier}
                      onChange={(e) => setEditingList({
                        ...editingList,
                        identifier: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group
                    </label>
                    <input
                      type="text"
                      value={editingList.group || ''}
                      onChange={(e) => setEditingList({
                        ...editingList,
                        group: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mental Status Exam"
                    />
                  </div>
                </div>

                {/* Template Placeholder Display */}
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-700 mb-1">Template Placeholder:</div>
                  <code className="text-purple-600 font-mono">
                    {`{${editingList.displayName}:${editingList.epicId}}`}
                  </code>
                </div>
              </div>

              {/* Options Editor */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Options</h4>
                  <button
                    onClick={handleAddOption}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    + Add Option
                  </button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editingList.options.map((_, i) => `option-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {editingList.options.map((option, index) => (
                        <SortableItem
                          key={`option-${index}`}
                          option={option}
                          index={index}
                          onValueChange={(value) => handleOptionChange(index, 'value', value)}
                          onDefaultChange={(checked) => handleOptionChange(index, 'is_default', checked)}
                          onRemove={() => handleRemoveOption(index)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {editingList.options.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No options defined. Click "Add Option" to create one.
                  </div>
                )}

                {/* Save/Cancel Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveList}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-1">No SmartList Selected</h3>
              <p className="text-sm">Select a SmartList from the left panel to edit its options</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}