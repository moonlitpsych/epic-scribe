'use client';

import { useState, useEffect } from 'react';
import { Template, Setting, SETTINGS } from '@epic-scribe/types';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import SmartListExpander from './SmartListExpander';
import { SmartToolsParser } from '@epic-scribe/note-service/src/smarttools';

const parser = new SmartToolsParser();

interface TemplateReviewStepProps {
  onTemplateSelected: (setting: Setting, visitType: string, template: Template) => void;
  onNext: () => void;
  initialSetting?: Setting;
  initialVisitType?: string;
}

const VISIT_TYPES: Record<Setting, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
  'Teenscope South': ['Intake', 'Follow-up'],
};

export default function TemplateReviewStep({
  onTemplateSelected,
  onNext,
  initialSetting,
  initialVisitType,
}: TemplateReviewStepProps) {
  const [setting, setSetting] = useState<Setting | undefined>(initialSetting);
  const [visitType, setVisitType] = useState<string | undefined>(initialVisitType);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // Load template when setting/visitType change
  useEffect(() => {
    if (setting && visitType) {
      loadTemplate(setting, visitType);
    }
  }, [setting, visitType]);

  const loadTemplate = async (s: Setting, vt: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates?setting=${encodeURIComponent(s)}&visitType=${encodeURIComponent(vt)}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();
      setTemplate(data);
      onTemplateSelected(s, vt, data);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSetting = e.target.value as Setting;
    setSetting(newSetting);
    // Reset visit type when setting changes
    const firstVisitType = VISIT_TYPES[newSetting][0];
    setVisitType(firstVisitType);
  };

  const handleVisitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVisitType(e.target.value);
  };

  const canProceed = !!template && !loading;

  return (
    <div className="space-y-6">
      {/* Template Selection Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-4">Select Template</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Setting
            </label>
            <select
              value={setting || ''}
              onChange={handleSettingChange}
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            >
              <option value="">Select a setting...</option>
              {SETTINGS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Visit Type
            </label>
            <select
              value={visitType || ''}
              onChange={handleVisitTypeChange}
              disabled={!setting}
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select visit type...</option>
              {setting &&
                VISIT_TYPES[setting].map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {template && (
          <div className="mt-4 p-3 bg-[#F5F1ED] rounded-lg">
            <p className="text-sm text-[#0A1F3D]">
              <span className="font-semibold">Template:</span> {template.name}
            </p>
            <p className="text-sm text-[#5A6B7D] mt-1">
              {template.sections?.length || 0} sections • Version {template.version}
            </p>
          </div>
        )}
      </div>

      {/* Template Preview */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
          <p className="text-center text-[#5A6B7D]">Loading template...</p>
        </div>
      )}

      {template && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setShowTemplatePreview(!showTemplatePreview)}
            className="w-full p-6 flex items-center justify-between hover:bg-[#F5F1ED]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {showTemplatePreview ? (
                <ChevronDown size={20} className="text-[#5A6B7D]" />
              ) : (
                <ChevronRight size={20} className="text-[#5A6B7D]" />
              )}
              <div className="text-left">
                <h2 className="text-xl font-serif text-[#0A1F3D]">Template Preview</h2>
                <p className="text-sm text-[#5A6B7D]">
                  {showTemplatePreview ? 'Click to collapse' : 'Click to review template structure and SmartLists'}
                </p>
              </div>
            </div>
            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-sm text-[#E89C8A] hover:text-[#0A1F3D] transition-colors"
            >
              <ExternalLink size={16} />
              Edit template
            </a>
          </button>

          {/* Collapsible Content */}
          {showTemplatePreview && (
            <div className="px-6 pb-6 border-t border-[#C5A882]/20">
              <p className="text-sm text-[#5A6B7D] my-4">
                Review the template structure and SmartList options below. This template will be used to generate your note.
              </p>

              <div className="space-y-4">
                {(template.sections || [])
                  .sort((a, b) => a.order - b.order)
                  .map((section) => {
                    const parsed = parser.parse(section.content);
                    const hasSmartLists = parsed.smartLists && parsed.smartLists.length > 0;

                    return (
                      <div
                        key={section.order}
                        className="border border-[#C5A882]/20 rounded-lg p-4 bg-[#F5F1ED]"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-[#E89C8A] bg-white px-2 py-1 rounded">
                            Section {section.order}
                          </span>
                          <h3 className="text-lg font-semibold text-[#0A1F3D]">
                            {section.name}
                          </h3>
                        </div>

                        <pre className="text-sm font-mono bg-white p-3 rounded border border-[#C5A882]/20 whitespace-pre-wrap overflow-x-auto mb-3">
                          {section.content}
                        </pre>

                        {hasSmartLists && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-[#0A1F3D]">SmartLists in this section:</p>
                            {parsed.smartLists.map((sl, idx) => (
                              <SmartListExpander
                                key={`${sl.epicId}-${idx}`}
                                epicId={sl.epicId}
                                displayText={sl.text}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      {canProceed && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-[#E89C8A] text-white rounded-lg hover:bg-[#0A1F3D] transition-colors font-semibold"
          >
            Next: Generate Note
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
