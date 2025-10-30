'use client';

import { useState, useEffect } from 'react';
import { Setting, SETTINGS, TemplateSection } from '@epic-scribe/types';
import { Copy, ArrowRight } from 'lucide-react';

interface SectionCloneModalProps {
  sourceSetting: Setting;
  sourceVisitType: string;
  sourceSection: TemplateSection;
  onClose: () => void;
  onClone: (targetSetting: Setting, targetVisitType: string, targetSectionName: string, isNewSection: boolean) => Promise<void>;
}

const VISIT_TYPES_MAP: Record<Setting, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
};

export function SectionCloneModal({
  sourceSetting,
  sourceVisitType,
  sourceSection,
  onClose,
  onClone
}: SectionCloneModalProps) {
  const [targetSetting, setTargetSetting] = useState<Setting>(sourceSetting);
  const [targetVisitType, setTargetVisitType] = useState<string>(sourceVisitType);
  const [targetTemplate, setTargetTemplate] = useState<any>(null);
  const [targetSectionName, setTargetSectionName] = useState<string>('');
  const [isNewSection, setIsNewSection] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Load target template when setting/visit type changes
  useEffect(() => {
    const loadTargetTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const response = await fetch(
          `/api/templates?setting=${encodeURIComponent(targetSetting)}&visitType=${encodeURIComponent(targetVisitType)}`
        );
        if (response.ok) {
          const template = await response.json();
          setTargetTemplate(template);

          // Auto-select matching section if exists
          const matchingSection = template.sections.find(
            (s: TemplateSection) => s.name === sourceSection.name
          );
          if (matchingSection) {
            setTargetSectionName(matchingSection.name);
            setIsNewSection(false);
          } else {
            setTargetSectionName('');
            setIsNewSection(false);
          }
        }
      } catch (error) {
        console.error('Error loading target template:', error);
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadTargetTemplate();
  }, [targetSetting, targetVisitType, sourceSection.name]);

  const handleClone = async () => {
    if (!targetSectionName.trim()) {
      alert('Please select or enter a target section name');
      return;
    }

    setLoading(true);
    try {
      await onClone(targetSetting, targetVisitType, targetSectionName, isNewSection);
      onClose();
    } catch (error) {
      console.error('Error cloning section:', error);
      alert('Failed to clone section. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableVisitTypes = VISIT_TYPES_MAP[targetSetting] || [];

  const isSameTemplate =
    sourceSetting === targetSetting &&
    sourceVisitType === targetVisitType;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-[#0A1F3D]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Copy className="h-6 w-6 text-[#E89C8A]" />
              <h2 className="text-2xl font-serif text-white">Clone Section</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Source Info */}
          <div className="mb-6 p-4 bg-[#F5F1ED] rounded-lg border border-[#C5A882]/30">
            <h3 className="text-sm font-semibold text-[#0A1F3D] mb-2">Source</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-[#5A6B7D]">Template:</span>{' '}
                <span className="font-medium text-[#0A1F3D]">{sourceSetting} - {sourceVisitType}</span>
              </p>
              <p>
                <span className="text-[#5A6B7D]">Section:</span>{' '}
                <span className="font-medium text-[#0A1F3D]">{sourceSection.name}</span>
              </p>
            </div>

            {/* Content Preview */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-[#5A6B7D] mb-2">Content Preview:</p>
              <pre className="text-xs font-mono bg-white p-3 rounded border border-[#C5A882]/20 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {sourceSection.content}
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-center my-4">
            <ArrowRight className="h-6 w-6 text-[#E89C8A]" />
          </div>

          {/* Target Selection */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-[#C5A882]/30">
            <h3 className="text-sm font-semibold text-[#0A1F3D] mb-4">Target Template</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Setting
                </label>
                <select
                  value={targetSetting}
                  onChange={(e) => setTargetSetting(e.target.value as Setting)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                >
                  {SETTINGS.map(setting => (
                    <option key={setting} value={setting}>{setting}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Visit Type
                </label>
                <select
                  value={targetVisitType}
                  onChange={(e) => setTargetVisitType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                >
                  {availableVisitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingTemplate ? (
              <div className="text-center py-4 text-[#5A6B7D]">
                Loading template sections...
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                    Target Section
                  </label>

                  <div className="space-y-2">
                    {/* Existing sections */}
                    {targetTemplate?.sections && targetTemplate.sections.length > 0 && (
                      <div>
                        <label className="flex items-center space-x-2 mb-2">
                          <input
                            type="radio"
                            checked={!isNewSection}
                            onChange={() => setIsNewSection(false)}
                            className="text-[#E89C8A] focus:ring-[#E89C8A]"
                          />
                          <span className="text-sm text-[#0A1F3D]">Replace existing section</span>
                        </label>
                        <select
                          value={targetSectionName}
                          onChange={(e) => {
                            setTargetSectionName(e.target.value);
                            setIsNewSection(false);
                          }}
                          disabled={isNewSection}
                          className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select a section...</option>
                          {targetTemplate.sections
                            .sort((a: TemplateSection, b: TemplateSection) => a.order - b.order)
                            .map((section: TemplateSection) => (
                              <option key={section.order} value={section.name}>
                                {section.order}. {section.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* New section */}
                    <div>
                      <label className="flex items-center space-x-2 mb-2">
                        <input
                          type="radio"
                          checked={isNewSection}
                          onChange={() => setIsNewSection(true)}
                          className="text-[#E89C8A] focus:ring-[#E89C8A]"
                        />
                        <span className="text-sm text-[#0A1F3D]">Create new section</span>
                      </label>
                      <input
                        type="text"
                        value={isNewSection ? targetSectionName : ''}
                        onChange={(e) => {
                          setTargetSectionName(e.target.value);
                          setIsNewSection(true);
                        }}
                        disabled={!isNewSection}
                        placeholder="Enter new section name..."
                        className="w-full px-3 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {isSameTemplate && !isNewSection && targetSectionName === sourceSection.name && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ You are cloning to the same section. This will replace the existing content.
                    </p>
                  </div>
                )}

                {isNewSection && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ A new section will be created at the end of the template.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#0A1F3D] bg-white border border-[#C5A882]/30 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={loading || loadingTemplate || !targetSectionName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#E89C8A] rounded-lg hover:bg-[#0A1F3D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cloning...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Clone Section
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
