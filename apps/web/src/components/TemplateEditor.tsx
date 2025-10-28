'use client';

import { useState, useEffect, useMemo } from 'react';
import { Template, Setting, VisitType, SETTINGS, VISIT_TYPES } from '@epic-scribe/types';
import { SmartToolsParser, SmartToolsTransformer } from '@epic-scribe/note-service/src/smarttools';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import { SmartToolsInserter } from './SmartToolsInserter';
import { SmartListEditModal } from './SmartListEditModal';
import { generateExampleOutput, generateSimpleExample } from '@/utils/generateExampleOutput';

const parser = new SmartToolsParser();
const transformer = new SmartToolsTransformer();

// Color scheme for sections
const SECTION_COLORS = [
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-yellow-50 border-yellow-200',
  'bg-purple-50 border-purple-200',
  'bg-pink-50 border-pink-200',
  'bg-indigo-50 border-indigo-200',
  'bg-red-50 border-red-200',
  'bg-orange-50 border-orange-200',
  'bg-teal-50 border-teal-200',
];

export function TemplateEditor() {
  const [selectedSetting, setSelectedSetting] = useState<Setting>('HMHI Downtown RCC');
  const [selectedVisitType, setSelectedVisitType] = useState<string>('Intake');
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<{ [key: string]: string }>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [showSmartToolsInserter, setShowSmartToolsInserter] = useState(false);
  const [insertTargetSection, setInsertTargetSection] = useState<string | null>(null);

  // SmartList modal state
  const [selectedSmartList, setSelectedSmartList] = useState<{ epicId: string; displayName?: string } | null>(null);
  const [showSmartListModal, setShowSmartListModal] = useState(false);

  // Dynamic example outputs
  const [sectionExamples, setSectionExamples] = useState<{ [key: string]: string }>({});

  // Load template when selection changes
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        // Try loading from API first (database or fallback to in-memory)
        const response = await fetch(`/api/templates?setting=${encodeURIComponent(selectedSetting)}&visitType=${encodeURIComponent(selectedVisitType)}`);

        if (response.ok) {
          const template = await response.json();
          if (template) {
            setCurrentTemplate(template);
            // Initialize section content
            const content: { [key: string]: string } = {};
            template.sections.forEach((section: any) => {
              content[section.name] = section.content;
            });
            setSectionContent(content);
          }
        } else {
          // Fallback to in-memory service if API fails
          const template = templateService.getTemplate(selectedSetting, selectedVisitType);
          if (template) {
            setCurrentTemplate(template);
            const content: { [key: string]: string } = {};
            template.sections.forEach(section => {
              content[section.name] = section.content;
            });
            setSectionContent(content);
          }
        }
      } catch (error) {
        console.error('Error loading template:', error);
        // Fallback to in-memory service on error
        const template = templateService.getTemplate(selectedSetting, selectedVisitType);
        if (template) {
          setCurrentTemplate(template);
          const content: { [key: string]: string } = {};
          template.sections.forEach(section => {
            content[section.name] = section.content;
          });
          setSectionContent(content);
        }
      }
    };

    loadTemplate();
  }, [selectedSetting, selectedVisitType]);

  // Get SmartTools statistics for current template
  const templateStats = useMemo(() => {
    if (!currentTemplate) return null;

    const fullContent = currentTemplate.sections.map(s => s.content).join('\n');
    return transformer.getSmartToolsSummary(fullContent);
  }, [currentTemplate]);

  // Get visit types for selected setting
  const availableVisitTypes = useMemo(() => {
    if (selectedSetting === 'Redwood Clinic MHI') {
      return ['Consultation Visit', 'Transfer of Care', 'Follow-up'];
    }
    return ['Intake', 'Transfer of Care', 'Follow-up'];
  }, [selectedSetting]);

  // Generate dynamic examples when section content changes
  useEffect(() => {
    const generateExamples = async () => {
      const newExamples: { [key: string]: string } = {};

      // Generate simple examples immediately for quick display
      for (const [sectionName, content] of Object.entries(sectionContent)) {
        if (content && content.trim()) {
          newExamples[sectionName] = generateSimpleExample(content);
        }
      }
      setSectionExamples(newExamples);

      // Then generate full examples with actual SmartList data
      for (const [sectionName, content] of Object.entries(sectionContent)) {
        if (content && content.trim()) {
          try {
            const fullExample = await generateExampleOutput(content);
            setSectionExamples(prev => ({
              ...prev,
              [sectionName]: fullExample
            }));
          } catch (error) {
            console.error(`Error generating example for ${sectionName}:`, error);
          }
        }
      }
    };

    generateExamples();
  }, [sectionContent]);

  const handleSectionEdit = (sectionName: string) => {
    setEditingSection(sectionName);
  };

  const handleSmartToolsInsert = (sectionName: string) => {
    setInsertTargetSection(sectionName);
    setEditingSection(sectionName);
    setShowSmartToolsInserter(true);
  };

  const handleSmartToolsInserted = (newContent: string) => {
    if (insertTargetSection) {
      setSectionContent({
        ...sectionContent,
        [insertTargetSection]: newContent
      });
      setShowSmartToolsInserter(false);
    }
  };

  const handleSmartListClick = (epicId: string, displayName?: string) => {
    setSelectedSmartList({ epicId, displayName });
    setShowSmartListModal(true);
  };

  const handleSmartListSave = () => {
    // Refresh the template or section content if needed
    // For now, we'll just close the modal
    setShowSmartListModal(false);
    setSelectedSmartList(null);
  };

  const handleSectionSave = async (sectionName: string) => {
    if (currentTemplate) {
      try {
        // Get the correct template ID - database uses template_id (snake_case)
        const templateId = (currentTemplate as any).template_id || currentTemplate.templateId;

        // Call the API to persist the template changes
        const response = await fetch('/api/templates', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: templateId,
            setting: selectedSetting,
            visitType: selectedVisitType,
            sectionName: sectionName,
            content: sectionContent[sectionName],
            editReason: 'Manual edit from template editor'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save template section');
        }

        // Also update the in-memory service for immediate UI updates
        templateService.updateSection(
          currentTemplate.templateId,
          sectionName,
          sectionContent[sectionName]
        );

        setEditingSection(null);

        // Optionally show success message
        console.log(`Successfully saved ${sectionName} section`);
      } catch (error) {
        console.error('Error saving template section:', error);
        alert('Failed to save template section. Please try again.');
      }
    }
  };

  const handleSectionCancel = (sectionName: string) => {
    if (currentTemplate) {
      const section = currentTemplate.sections.find(s => s.name === sectionName);
      if (section) {
        setSectionContent({
          ...sectionContent,
          [sectionName]: section.content
        });
      }
      setEditingSection(null);
    }
  };

  const renderSection = (section: any, index: number) => {
    const isEditing = editingSection === section.name;
    const colorClass = SECTION_COLORS[index % SECTION_COLORS.length];

    return (
      <div key={section.name} className={`border-2 rounded-lg p-4 ${colorClass} transition-all`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{section.name}</h3>
            <span className="text-xs text-gray-500">Section {section.order}</span>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => handleSectionEdit(section.name)}
                  className="px-3 py-1 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleSmartToolsInsert(section.name)}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Add SmartTool
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSectionSave(section.name)}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => handleSectionCancel(section.name)}
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={sectionContent[section.name]}
            onChange={(e) => setSectionContent({
              ...sectionContent,
              [section.name]: e.target.value
            })}
            className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <div>
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
                {renderHighlightedContent(sectionContent[section.name])}
              </pre>
            </div>
            {sectionExamples[section.name] && (
              <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-xs font-semibold text-gray-500">Example output:</span>
                <pre className="text-xs text-gray-600 mt-1 italic whitespace-pre-wrap font-sans">
                  {sectionExamples[section.name]}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SmartTools in this section */}
        <div className="mt-2 flex flex-wrap gap-1">
          {parser.extractSmartLinkIdentifiers(sectionContent[section.name]).map(id => (
            <span key={id} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              @{id}@
            </span>
          ))}
          {(() => {
            // Parse the content to extract SmartList information including display names
            const parsed = parser.parse(sectionContent[section.name]);
            const smartLists = parsed.smartLists || [];

            // Create a unique list based on epicId
            const uniqueSmartLists = smartLists.reduce((acc: any[], sl: any) => {
              if (!acc.find(item => item.epicId === sl.epicId)) {
                acc.push(sl);
              }
              return acc;
            }, []);

            return uniqueSmartLists.map((smartList: any) => (
              <button
                key={smartList.epicId}
                onClick={() => handleSmartListClick(smartList.epicId, smartList.display)}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
                title={`Click to view/edit ${smartList.display || 'SmartList'}`}
              >
                {smartList.display || `List:${smartList.epicId}`}
              </button>
            ));
          })()}
          {sectionContent[section.name].includes('***') && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
              Wildcard
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderHighlightedContent = (text: string) => {
    const positions = parser.getHighlightPositions(text);
    if (positions.length === 0) return text;

    const elements: JSX.Element[] = [];
    let lastEnd = 0;

    positions.forEach((pos, index) => {
      if (pos.start > lastEnd) {
        elements.push(
          <span key={`text-${index}`}>{text.substring(lastEnd, pos.start)}</span>
        );
      }

      const colorClass =
        pos.type === 'smartlink' ? 'text-blue-600 font-semibold' :
        pos.type === 'dotphrase' ? 'text-green-600 font-semibold' :
        pos.type === 'wildcard' ? 'text-yellow-600 font-semibold' :
        'text-purple-600 font-semibold';

      elements.push(
        <span key={`highlight-${index}`} className={colorClass}>
          {text.substring(pos.start, pos.end)}
        </span>
      );

      lastEnd = pos.end;
    });

    if (lastEnd < text.length) {
      elements.push(
        <span key="text-final">{text.substring(lastEnd)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Quick Navigation */}
      <div className="flex justify-end gap-2">
        <a
          href="/smartlists"
          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          SmartList Manager
        </a>
        <a
          href="/demo"
          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Parser Demo
        </a>
      </div>

      {/* SmartTools Inserter Modal */}
      {showSmartToolsInserter && insertTargetSection && (
        <SmartToolsInserter
          currentContent={sectionContent[insertTargetSection] || ''}
          onInsert={handleSmartToolsInserted}
          onClose={() => {
            setShowSmartToolsInserter(false);
            setInsertTargetSection(null);
            setEditingSection(null);
          }}
        />
      )}

      {/* SmartList Edit Modal */}
      {showSmartListModal && selectedSmartList && (
        <SmartListEditModal
          epicId={selectedSmartList.epicId}
          displayName={selectedSmartList.displayName}
          onClose={() => {
            setShowSmartListModal(false);
            setSelectedSmartList(null);
          }}
          onSave={handleSmartListSave}
          readOnly={false}
        />
      )}

      {/* Template Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Select Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Setting
            </label>
            <select
              value={selectedSetting}
              onChange={(e) => setSelectedSetting(e.target.value as Setting)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {SETTINGS.map(setting => (
                <option key={setting} value={setting}>{setting}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visit Type
            </label>
            <select
              value={selectedVisitType}
              onChange={(e) => setSelectedVisitType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {availableVisitTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {currentTemplate && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-600">Template ID:</span>
                <span className="ml-2 font-mono text-sm">{currentTemplate.templateId}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Version:</span>
                <span className="ml-2 font-mono text-sm">v{currentTemplate.version}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Statistics */}
      {currentTemplate && templateStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">SmartTools Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {templateStats.counts.smartLinks}
              </div>
              <div className="text-sm text-gray-600">SmartLinks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {templateStats.counts.dotPhrases}
              </div>
              <div className="text-sm text-gray-600">DotPhrases</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {templateStats.counts.wildcards}
              </div>
              <div className="text-sm text-gray-600">Wildcards</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {templateStats.counts.smartLists}
              </div>
              <div className="text-sm text-gray-600">SmartLists</div>
            </div>
          </div>
        </div>
      )}

      {/* Template Sections */}
      {currentTemplate && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Template Sections</h2>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
          </div>

          {previewMode ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Full Template Preview</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {currentTemplate.sections.map(s =>
                    `${s.name.toUpperCase()}\n${sectionContent[s.name]}\n`
                  ).join('\n')}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTemplate.sections
                .sort((a, b) => a.order - b.order)
                .map((section, index) => renderSection(section, index))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}