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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-surface)] rounded-[2px] shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-surface-2)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Copy className="h-6 w-6 text-[var(--accent-warm)]" />
              <h2 className="text-2xl font-heading text-[var(--text-primary)]">Clone Section</h2>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
          <div className="mb-6 p-4 bg-[var(--bg-surface-2)] rounded-[2px] border border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Source</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-[var(--text-secondary)]">Template:</span>{' '}
                <span className="font-medium text-[var(--text-primary)]">{sourceSetting} - {sourceVisitType}</span>
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Section:</span>{' '}
                <span className="font-medium text-[var(--text-primary)]">{sourceSection.name}</span>
              </p>
            </div>

            {/* Content Preview */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Content Preview:</p>
              <pre className="text-xs font-mono bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-default)] max-h-32 overflow-y-auto whitespace-pre-wrap">
                {sourceSection.content}
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-center my-4">
            <ArrowRight className="h-6 w-6 text-[var(--accent-warm)]" />
          </div>

          {/* Target Selection */}
          <div className="mb-6 p-4 bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Target Template</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Setting
                </label>
                <select
                  value={targetSetting}
                  onChange={(e) => setTargetSetting(e.target.value as Setting)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                >
                  {SETTINGS.map(setting => (
                    <option key={setting} value={setting}>{setting}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Visit Type
                </label>
                <select
                  value={targetVisitType}
                  onChange={(e) => setTargetVisitType(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                >
                  {availableVisitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingTemplate ? (
              <div className="text-center py-4 text-[var(--text-secondary)]">
                Loading template sections...
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
                            className="text-[var(--accent-warm)] focus:ring-[var(--accent-warm)]"
                          />
                          <span className="text-sm text-[var(--text-primary)]">Replace existing section</span>
                        </label>
                        <select
                          value={targetSectionName}
                          onChange={(e) => {
                            setTargetSectionName(e.target.value);
                            setIsNewSection(false);
                          }}
                          disabled={isNewSection}
                          className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent disabled:bg-[var(--bg-surface-2)] disabled:cursor-not-allowed bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
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
                          className="text-[var(--accent-warm)] focus:ring-[var(--accent-warm)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">Create new section</span>
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
                        className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[2px] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent disabled:bg-[var(--bg-surface-2)] disabled:cursor-not-allowed bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {isSameTemplate && !isNewSection && targetSectionName === sourceSection.name && (
                  <div className="mt-3 p-3 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px]">
                    <p className="text-sm text-[var(--warning-text)]">
                      ⚠️ You are cloning to the same section. This will replace the existing content.
                    </p>
                  </div>
                )}

                {isNewSection && (
                  <div className="mt-3 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px]">
                    <p className="text-sm text-[var(--info-text)]">
                      ℹ️ A new section will be created at the end of the template.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-surface-2)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[2px] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={loading || loadingTemplate || !targetSectionName.trim()}
            className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded-[2px] hover:bg-[var(--accent-primary-hover)] transition-colors disabled:bg-[var(--bg-hover)] disabled:cursor-not-allowed flex items-center gap-2"
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
