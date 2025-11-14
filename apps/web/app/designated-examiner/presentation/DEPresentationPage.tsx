'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, FileText, Monitor, Speaker } from 'lucide-react';
import { PresentationSection, TextAreaField, InputField, MedicationList } from '@/components/designated-examiner/PresentationSection';
import { UtahCriteriaChecklist } from '@/components/designated-examiner/UtahCriteriaChecklist';
import type {
  DEPresentation,
  DEPresentationData,
  DECriteriaAssessment
} from '@/types/designated-examiner';

// Initialize empty presentation data
const getEmptyPresentationData = (): DEPresentationData => ({
  one_liner: '',
  demographics: { age: '', sex: '', psychiatric_diagnoses: '' },
  admission: { reason: '', commitment_reason: '' },
  initial_presentation: '',
  relevant_history: {
    previous_admissions: '',
    suicide_attempts: '',
    violence_history: '',
    substance_use: '',
    social_history: ''
  },
  medications: { prior: [], current: [] },
  hospital_course: {
    improvement: '',
    medication_compliance: '',
    special_interventions: '',
    activities: ''
  },
  interview: {
    objective: { thought_process: '', orientation: '' },
    subjective: { insight: '', follow_up_plan: '' }
  },
  criteria_evidence: {
    criterion_1: '',
    criterion_2: '',
    criterion_3: '',
    criterion_4: '',
    criterion_5: ''
  }
});

export default function DEPresentationPage() {
  const router = useRouter();
  const [presentation, setPresentation] = useState<DEPresentation>({
    id: '',
    patient_name: '',
    hearing_date: '',
    commitment_type: '30-day',
    hospital: 'Huntsman Mental Health Institute',
    presentation_data: getEmptyPresentationData(),
    presentation_status: 'draft',
    ai_enhanced_sections: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [criteriaAssessment, setCriteriaAssessment] = useState<DECriteriaAssessment>({
    meets_criterion_1: false,
    meets_criterion_2: false,
    meets_criterion_3: false,
    meets_criterion_4: false,
    meets_criterion_5: false
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty || !presentation.id) return;

    const saveTimer = setTimeout(async () => {
      await handleSave();
    }, 3000); // Auto-save after 3 seconds of no changes

    return () => clearTimeout(saveTimer);
  }, [presentation, criteriaAssessment, isDirty]);

  // Update helper
  const updateField = (path: string, value: any) => {
    setPresentation(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData.presentation_data;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return { ...newData, updated_at: new Date().toISOString() };
    });
    setIsDirty(true);
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const endpoint = presentation.id
        ? `/api/designated-examiner/presentation/${presentation.id}`
        : '/api/designated-examiner/presentation';

      const method = presentation.id ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...presentation,
          presentationData: presentation.presentation_data,
          criteriaAssessment,
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        setPresentation(saved);
        setLastSaved(new Date());
        setIsDirty(false);
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save presentation:', error);
      alert('Failed to save presentation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const data = presentation.presentation_data!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/designated-examiner')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold">Court Presentation</h1>
              {presentation.patient_name && (
                <span className="text-gray-600">• {presentation.patient_name}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <div className="flex gap-1 border-l pl-3">
                <button title="Screen View" className="p-2 hover:bg-gray-100 rounded">
                  <Monitor className="h-4 w-4" />
                </button>
                <button title="Speaking Notes" className="p-2 hover:bg-gray-100 rounded">
                  <Speaker className="h-4 w-4" />
                </button>
                <button title="Export PDF" className="p-2 hover:bg-gray-100 rounded">
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Patient Info */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-4 gap-4">
            <InputField
              label="Patient Name"
              value={presentation.patient_name || ''}
              onChange={(v) => setPresentation(prev => ({ ...prev, patient_name: v }))}
              placeholder="John Doe"
            />
            <InputField
              label="Hearing Date"
              type="date"
              value={presentation.hearing_date || ''}
              onChange={(v) => setPresentation(prev => ({ ...prev, hearing_date: v }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commitment Type
              </label>
              <select
                value={presentation.commitment_type}
                onChange={(e) => setPresentation(prev => ({
                  ...prev,
                  commitment_type: e.target.value as '30-day' | '60-day' | '90-day'
                }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="30-day">30-day</option>
                <option value="60-day">60-day</option>
                <option value="90-day">90-day</option>
              </select>
            </div>
            <InputField
              label="Hospital"
              value={presentation.hospital || ''}
              onChange={(v) => setPresentation(prev => ({ ...prev, hospital: v }))}
            />
          </div>
        </section>

        {/* 1. One-Liner */}
        <PresentationSection title="Patient One-Liner" aiEnhanceable>
          <TextAreaField
            value={data.one_liner}
            onChange={(v) => updateField('one_liner', v)}
            rows={2}
            placeholder="Brief summary: e.g., '32-year-old male with schizophrenia admitted for command auditory hallucinations'"
          />
        </PresentationSection>

        {/* 2. Demographics */}
        <PresentationSection title="Demographics & Diagnoses" aiEnhanceable>
          <div className="grid grid-cols-3 gap-4">
            <InputField
              label="Age"
              value={data.demographics.age}
              onChange={(v) => updateField('demographics.age', v)}
            />
            <InputField
              label="Sex"
              value={data.demographics.sex}
              onChange={(v) => updateField('demographics.sex', v)}
            />
          </div>
          <TextAreaField
            label="Psychiatric Diagnoses"
            value={data.demographics.psychiatric_diagnoses}
            onChange={(v) => updateField('demographics.psychiatric_diagnoses', v)}
            rows={2}
          />
        </PresentationSection>

        {/* 3. Admission */}
        <PresentationSection title="Admission & Commitment" aiEnhanceable>
          <TextAreaField
            label="What they are admitted for"
            value={data.admission.reason}
            onChange={(v) => updateField('admission.reason', v)}
            rows={2}
          />
          <TextAreaField
            label="What they are being committed for"
            value={data.admission.commitment_reason}
            onChange={(v) => updateField('admission.commitment_reason', v)}
            rows={2}
          />
        </PresentationSection>

        {/* 4. Initial Presentation */}
        <PresentationSection
          title="Initial Presentation"
          subtitle="Past 2-4 weeks journey from home to admission"
          aiEnhanceable
        >
          <TextAreaField
            value={data.initial_presentation}
            onChange={(v) => updateField('initial_presentation', v)}
            rows={4}
          />
        </PresentationSection>

        {/* 5. Relevant History */}
        <PresentationSection title="Relevant History" aiEnhanceable>
          <TextAreaField
            label="Previous psychiatric admissions"
            value={data.relevant_history.previous_admissions}
            onChange={(v) => updateField('relevant_history.previous_admissions', v)}
            rows={2}
          />
          <TextAreaField
            label="Suicide attempts"
            value={data.relevant_history.suicide_attempts}
            onChange={(v) => updateField('relevant_history.suicide_attempts', v)}
            rows={2}
          />
          <TextAreaField
            label="Violence/aggression history"
            value={data.relevant_history.violence_history}
            onChange={(v) => updateField('relevant_history.violence_history', v)}
            rows={2}
          />
          <TextAreaField
            label="Substance use"
            value={data.relevant_history.substance_use}
            onChange={(v) => updateField('relevant_history.substance_use', v)}
            rows={2}
          />
          <TextAreaField
            label="Social history (living situation, family, legal)"
            value={data.relevant_history.social_history}
            onChange={(v) => updateField('relevant_history.social_history', v)}
            rows={2}
          />
        </PresentationSection>

        {/* 6. Medications */}
        <PresentationSection title="Medications" aiEnhanceable>
          <MedicationList
            label="Prior to admission"
            medications={data.medications.prior}
            onChange={(v) => updateField('medications.prior', v)}
          />
          <MedicationList
            label="Currently prescribed"
            medications={data.medications.current}
            onChange={(v) => updateField('medications.current', v)}
          />
        </PresentationSection>

        {/* 7. Hospital Course */}
        <PresentationSection title="Hospital Course" aiEnhanceable>
          <TextAreaField
            label="Improvement observed"
            value={data.hospital_course.improvement}
            onChange={(v) => updateField('hospital_course.improvement', v)}
            rows={2}
          />
          <TextAreaField
            label="Medication compliance"
            value={data.hospital_course.medication_compliance}
            onChange={(v) => updateField('hospital_course.medication_compliance', v)}
            rows={2}
          />
          <TextAreaField
            label="Special interventions (isolation, PRN medications)"
            value={data.hospital_course.special_interventions}
            onChange={(v) => updateField('hospital_course.special_interventions', v)}
            rows={2}
          />
          <TextAreaField
            label="Activities and behavior"
            value={data.hospital_course.activities}
            onChange={(v) => updateField('hospital_course.activities', v)}
            rows={2}
          />
        </PresentationSection>

        {/* 8. Patient Interview */}
        <PresentationSection title="Patient Interview" aiEnhanceable>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Objective</h3>
              <TextAreaField
                label="Thought process/content"
                value={data.interview.objective.thought_process}
                onChange={(v) => updateField('interview.objective.thought_process', v)}
                rows={2}
              />
              <TextAreaField
                label="Orientation"
                value={data.interview.objective.orientation}
                onChange={(v) => updateField('interview.objective.orientation', v)}
                rows={2}
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Subjective</h3>
              <TextAreaField
                label="Understanding of diagnosis/insight"
                value={data.interview.subjective.insight}
                onChange={(v) => updateField('interview.subjective.insight', v)}
                rows={2}
              />
              <TextAreaField
                label="Follow-up plan after discharge"
                value={data.interview.subjective.follow_up_plan}
                onChange={(v) => updateField('interview.subjective.follow_up_plan', v)}
                rows={2}
              />
            </div>
          </div>
        </PresentationSection>

        {/* 9. Utah Criteria */}
        <PresentationSection title="Utah Commitment Criteria">
          <UtahCriteriaChecklist
            assessment={criteriaAssessment}
            evidence={data.criteria_evidence}
            onAssessmentChange={(criterion, value) => {
              setCriteriaAssessment(prev => ({ ...prev, [criterion]: value }));
              setIsDirty(true);
            }}
            onEvidenceChange={(criterion, value) => {
              updateField(`criteria_evidence.${criterion}`, value);
            }}
          />
        </PresentationSection>

      </main>
    </div>
  );
}