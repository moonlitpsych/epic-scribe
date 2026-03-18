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
  'Psycho-oncology (HCI)': ['Intake', 'Follow-up'],
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
      <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
        <h2 className="text-2xl font-heading text-[var(--text-primary)] mb-4 tracking-tight">Select Template</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Setting
            </label>
            <select
              value={setting || ''}
              onChange={handleSettingChange}
              className="w-full px-4 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent"
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
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Visit Type
            </label>
            <select
              value={visitType || ''}
              onChange={handleVisitTypeChange}
              disabled={!setting}
              className="w-full px-4 py-2 border border-[var(--border-default)] rounded bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-warm)] focus:border-transparent disabled:bg-[var(--bg-surface)] disabled:text-[var(--text-muted)]"
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
          <div className="mt-4 p-3 bg-[var(--bg-surface-2)] rounded-[2px]">
            <p className="text-sm text-[var(--text-primary)]">
              <span className="font-semibold">Template:</span> {template.name}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {template.sections?.length || 0} sections - Version {template.version}
            </p>
          </div>
        )}
      </div>

      {/* Template Preview */}
      {loading && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] p-6">
          <p className="text-center text-[var(--text-secondary)]">Loading template...</p>
        </div>
      )}

      {template && !loading && (
        <div className="bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)] overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setShowTemplatePreview(!showTemplatePreview)}
            className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              {showTemplatePreview ? (
                <ChevronDown size={20} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronRight size={20} className="text-[var(--text-secondary)]" />
              )}
              <div className="text-left">
                <h2 className="text-xl font-heading text-[var(--text-primary)]">Template Preview</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {showTemplatePreview ? 'Click to collapse' : 'Click to review template structure and SmartLists'}
                </p>
              </div>
            </div>
            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-sm text-[var(--accent-warm)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ExternalLink size={16} />
              Edit template
            </a>
          </button>

          {/* Collapsible Content */}
          {showTemplatePreview && (
            <div className="px-6 pb-6 border-t border-[var(--border-default)]">
              <p className="text-sm text-[var(--text-secondary)] my-4">
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
                        className="border border-[var(--border-default)] rounded-[2px] p-4 bg-[var(--bg-surface-2)]"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-[var(--accent-warm)] bg-[var(--bg-surface)] px-2 py-1 rounded">
                            Section {section.order}
                          </span>
                          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {section.name}
                          </h3>
                        </div>

                        <pre className="text-sm font-mono bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-default)] whitespace-pre-wrap overflow-x-auto mb-3 text-[var(--text-secondary)]">
                          {section.content}
                        </pre>

                        {hasSmartLists && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-[var(--text-primary)]">SmartLists in this section:</p>
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
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-inverse)] rounded hover:bg-[var(--accent-primary-hover)] transition-colors font-semibold"
          >
            Next: Generate Note
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
