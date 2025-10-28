'use client';

import { useState, useEffect } from 'react';
import { X, Save, Edit3, Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { moonlitTheme } from '@/lib/moonlit-theme';
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

interface SmartListEditModalProps {
  epicId: string;
  displayName?: string;
  onClose: () => void;
  onSave?: (smartList: SmartList) => void;
  readOnly?: boolean;
}

// Sortable option item component
function SortableOption({
  option,
  index,
  isDefault,
  onUpdate,
  onDelete,
  onSetDefault,
  readOnly
}: {
  option: SmartListOption;
  index: number;
  isDefault: boolean;
  onUpdate: (value: string) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `option-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
    >
      {!readOnly && (
        <button
          type="button"
          className="cursor-move text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <span className="text-xs font-mono text-gray-400 w-6">
        {index + 1}.
      </span>

      {readOnly ? (
        <span className="flex-1 px-2 py-1" style={{ color: moonlitTheme.colors.text.primary }}>
          {option.value}
        </span>
      ) : (
        <input
          type="text"
          value={option.value}
          onChange={(e) => onUpdate(e.target.value)}
          className="flex-1 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
          style={{ color: moonlitTheme.colors.text.primary }}
        />
      )}

      {isDefault && (
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: moonlitTheme.colors.success.bg,
            color: moonlitTheme.colors.success.text
          }}
        >
          default
        </span>
      )}

      {!readOnly && (
        <>
          {!isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              className="text-xs px-2 py-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Set as default"
            >
              Set default
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete option"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function SmartListEditModal({
  epicId,
  displayName: initialDisplayName,
  onClose,
  onSave,
  readOnly: initialReadOnly = false
}: SmartListEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smartList, setSmartList] = useState<SmartList | null>(null);
  const [options, setOptions] = useState<SmartListOption[]>([]);
  const [editMode, setEditMode] = useState(!initialReadOnly);
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [defaultOptionIndex, setDefaultOptionIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch SmartList data on mount
  useEffect(() => {
    const fetchSmartList = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/smartlists?epicId=${epicId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SmartList');
        }

        const data = await response.json();
        if (data && data.length > 0) {
          const smartListData = data[0]; // API returns array
          setSmartList(smartListData);
          setOptions([...smartListData.options].sort((a, b) => a.order - b.order));
          setDisplayName(smartListData.displayName);

          // Find default option
          const defaultIdx = smartListData.options.findIndex((opt: SmartListOption) => opt.is_default);
          setDefaultOptionIndex(defaultIdx);
        } else {
          throw new Error('SmartList not found');
        }
      } catch (err) {
        console.error('Error fetching SmartList:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SmartList');
      } finally {
        setLoading(false);
      }
    };

    if (epicId) {
      fetchSmartList();
    }
  }, [epicId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('option-', ''));
      const newIndex = parseInt(over.id.toString().replace('option-', ''));

      setOptions((items) => {
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return newItems.map((item, idx) => ({
          ...item,
          order: idx + 1
        }));
      });

      // Update default index if it moved
      if (defaultOptionIndex === oldIndex) {
        setDefaultOptionIndex(newIndex);
      } else if (defaultOptionIndex === newIndex) {
        setDefaultOptionIndex(oldIndex);
      }
    }
  };

  const handleAddOption = () => {
    const newOption: SmartListOption = {
      value: '',
      order: options.length + 1,
      is_default: false
    };
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], value };
    setOptions(updated);
  };

  const handleDeleteOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    // Reorder remaining options
    const reordered = updated.map((opt, idx) => ({
      ...opt,
      order: idx + 1,
      is_default: defaultOptionIndex === index ? false : opt.is_default
    }));
    setOptions(reordered);

    // Update default index
    if (defaultOptionIndex === index) {
      setDefaultOptionIndex(-1);
    } else if (defaultOptionIndex > index) {
      setDefaultOptionIndex(defaultOptionIndex - 1);
    }
  };

  const handleSetDefault = (index: number) => {
    const updated = options.map((opt, idx) => ({
      ...opt,
      is_default: idx === index
    }));
    setOptions(updated);
    setDefaultOptionIndex(index);
  };

  const handleSave = async () => {
    if (!smartList) return;

    setSaving(true);
    setError(null);

    try {
      const updatedSmartList: SmartList = {
        ...smartList,
        displayName,
        options: options.map((opt, idx) => ({
          ...opt,
          order: idx + 1,
          is_default: idx === defaultOptionIndex
        }))
      };

      // Save to API
      const response = await fetch('/api/smartlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updatedSmartList]) // API expects array
      });

      if (!response.ok) {
        throw new Error('Failed to save SmartList');
      }

      if (onSave) {
        onSave(updatedSmartList);
      }

      onClose();
    } catch (err) {
      console.error('Error saving SmartList:', err);
      setError(err instanceof Error ? err.message : 'Failed to save SmartList');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="text-gray-600">Loading SmartList...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !smartList) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <X className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">SmartList Not Found</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Close
              </button>
              <a
                href="/smartlists"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Open SmartList Editor
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          style={{ backgroundColor: moonlitTheme.colors.cream }}
        >
          <div>
            <h2
              className="text-2xl font-semibold"
              style={{
                color: moonlitTheme.colors.navy,
                fontFamily: moonlitTheme.typography.fontFamily.serif
              }}
            >
              {editMode ? 'Edit SmartList' : 'View SmartList'}
            </h2>
            <p className="text-sm mt-1" style={{ color: moonlitTheme.colors.text.muted }}>
              {initialDisplayName || `SmartList ${epicId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-all duration-200 hover:bg-white hover:bg-opacity-60"
            style={{ color: moonlitTheme.colors.text.secondary }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: moonlitTheme.colors.error.bg,
                color: moonlitTheme.colors.error.text
              }}
            >
              {error}
            </div>
          )}

          {smartList && (
            <div className="space-y-6">
              {/* SmartList Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: moonlitTheme.colors.navy }}
                  >
                    Display Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 focus:ring-2 focus:border-transparent"
                      style={{
                        '--tw-ring-color': moonlitTheme.colors.terracotta
                      } as any}
                    />
                  ) : (
                    <p className="px-4 py-2.5" style={{ color: moonlitTheme.colors.text.primary }}>
                      {displayName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: moonlitTheme.colors.navy }}
                  >
                    Epic ID
                  </label>
                  <p className="px-4 py-2.5 font-mono text-sm" style={{ color: moonlitTheme.colors.text.primary }}>
                    {epicId}
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: moonlitTheme.colors.navy }}
                  >
                    Category
                  </label>
                  <p className="px-4 py-2.5" style={{ color: moonlitTheme.colors.text.primary }}>
                    {smartList.group || 'Uncategorized'}
                  </p>
                </div>
              </div>

              {/* Placeholder Format */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: moonlitTheme.colors.cream }}
              >
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: moonlitTheme.colors.navy }}
                >
                  Template Placeholder Format
                </label>
                <code className="text-sm font-mono" style={{ color: moonlitTheme.colors.terracotta }}>
                  {`{${displayName}:${epicId}}`}
                </code>
              </div>

              {/* Options */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: moonlitTheme.colors.navy }}
                  >
                    Options ({options.length})
                  </label>
                  {editMode && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-1.5 text-sm rounded-lg transition-all duration-200 flex items-center gap-1"
                      style={{
                        backgroundColor: moonlitTheme.colors.terracotta,
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#D88B7A';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = moonlitTheme.colors.terracotta;
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Option
                    </button>
                  )}
                </div>

                <div
                  className="space-y-2 p-4 rounded-lg border-2 border-dashed"
                  style={{ borderColor: moonlitTheme.colors.gray[300] }}
                >
                  {options.length > 0 ? (
                    editMode ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={options.map((_, i) => `option-${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {options.map((option, index) => (
                            <SortableOption
                              key={`option-${index}`}
                              option={option}
                              index={index}
                              isDefault={index === defaultOptionIndex}
                              onUpdate={(value) => handleUpdateOption(index, value)}
                              onDelete={() => handleDeleteOption(index)}
                              onSetDefault={() => handleSetDefault(index)}
                              readOnly={!editMode}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg"
                        >
                          <span className="text-xs font-mono text-gray-400 w-6">
                            {index + 1}.
                          </span>
                          <span className="flex-1" style={{ color: moonlitTheme.colors.text.primary }}>
                            {option.value}
                          </span>
                          {option.is_default && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: moonlitTheme.colors.success.bg,
                                color: moonlitTheme.colors.success.text
                              }}
                            >
                              default
                            </span>
                          )}
                        </div>
                      ))
                    )
                  ) : (
                    <p className="text-center text-gray-400 py-8">
                      No options defined. Click "Add Option" to get started.
                    </p>
                  )}
                </div>

                {editMode && (
                  <p className="text-xs mt-2" style={{ color: moonlitTheme.colors.text.muted }}>
                    💡 Drag options to reorder. Include "Not assessed" as a safety option.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <a
            href="/smartlists"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2"
            style={{
              border: `1px solid ${moonlitTheme.colors.terracotta}`,
              color: moonlitTheme.colors.terracotta,
              backgroundColor: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = moonlitTheme.colors.cream;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Editor
          </a>

          <div className="flex gap-3">
            {editMode && !initialReadOnly && (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  style={{
                    border: `1px solid ${moonlitTheme.colors.gray[300]}`,
                    color: moonlitTheme.colors.text.secondary,
                    backgroundColor: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = moonlitTheme.colors.gray[100];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Cancel Edit
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                  style={{
                    backgroundColor: moonlitTheme.colors.tan,
                    color: 'white',
                    opacity: saving ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#B59872';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = moonlitTheme.colors.tan;
                  }}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}

            {!editMode && !initialReadOnly && (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                  style={{
                    backgroundColor: moonlitTheme.colors.terracotta,
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#D88B7A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = moonlitTheme.colors.terracotta;
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Options
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  style={{
                    border: `1px solid ${moonlitTheme.colors.gray[300]}`,
                    color: moonlitTheme.colors.text.secondary,
                    backgroundColor: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = moonlitTheme.colors.gray[100];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Close
                </button>
              </>
            )}

            {initialReadOnly && (
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: moonlitTheme.colors.tan,
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#B59872';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = moonlitTheme.colors.tan;
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}