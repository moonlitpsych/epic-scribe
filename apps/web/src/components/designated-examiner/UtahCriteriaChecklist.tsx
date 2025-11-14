import { Check, X, AlertCircle } from 'lucide-react';
import type { DECriteriaAssessment, DECriteriaEvidence } from '@/types/designated-examiner';

interface UtahCriteriaChecklistProps {
  assessment: DECriteriaAssessment;
  evidence: DECriteriaEvidence;
  onAssessmentChange: (criterion: keyof DECriteriaAssessment, value: boolean) => void;
  onEvidenceChange: (criterion: keyof DECriteriaEvidence, value: string) => void;
  readOnly?: boolean;
}

const CRITERIA_DETAILS = [
  {
    key: 'criterion_1',
    assessmentKey: 'meets_criterion_1',
    label: 'Has mental illness',
    full: 'The individual has a mental illness',
    guidance: 'Document psychiatric diagnosis, symptoms, and clinical observations'
  },
  {
    key: 'criterion_2',
    assessmentKey: 'meets_criterion_2',
    label: 'Danger or inability to care',
    full: 'Poses substantial danger to self/others or lacks ability to care for basic needs',
    guidance: 'Provide specific examples of dangerous behavior or self-care deficits'
  },
  {
    key: 'criterion_3',
    assessmentKey: 'meets_criterion_3',
    label: 'Lacks capacity',
    full: 'Lacks the capacity to make rational treatment decisions',
    guidance: 'Describe cognitive impairments, lack of insight, or impaired judgment'
  },
  {
    key: 'criterion_4',
    assessmentKey: 'meets_criterion_4',
    label: 'Least restrictive',
    full: 'Hospitalization is the least restrictive appropriate treatment alternative',
    guidance: 'Explain why outpatient treatment is insufficient at this time'
  },
  {
    key: 'criterion_5',
    assessmentKey: 'meets_criterion_5',
    label: 'LMHA can treat',
    full: 'Local Mental Health Authority can provide adequate and appropriate treatment',
    guidance: 'Confirm availability of appropriate treatment at the facility'
  }
] as const;

export function UtahCriteriaChecklist({
  assessment,
  evidence,
  onAssessmentChange,
  onEvidenceChange,
  readOnly = false
}: UtahCriteriaChecklistProps) {
  // Calculate overall assessment
  const metCriteria = Object.values(assessment).filter(Boolean).length;
  const allMet = metCriteria === 5;
  const noneMet = metCriteria === 0;

  return (
    <div className="space-y-4">
      {/* Overall Assessment Banner */}
      <div className={`p-4 rounded-lg border-2 ${
        allMet ? 'bg-red-50 border-red-300' :
        noneMet ? 'bg-green-50 border-green-300' :
        'bg-yellow-50 border-yellow-300'
      }`}>
        <div className="flex items-center gap-3">
          {allMet ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : noneMet ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              Overall Assessment: {metCriteria}/5 Criteria Met
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {allMet
                ? 'All criteria for involuntary commitment are met'
                : noneMet
                ? 'No criteria for involuntary commitment are met'
                : `Partial criteria met - ${5 - metCriteria} criteria not satisfied`}
            </p>
          </div>
        </div>
      </div>

      {/* Individual Criteria */}
      <div className="space-y-4">
        {CRITERIA_DETAILS.map((criterion) => {
          const isMet = assessment[criterion.assessmentKey as keyof DECriteriaAssessment];
          const evidenceValue = evidence[criterion.key as keyof DECriteriaEvidence] || '';

          return (
            <div
              key={criterion.key}
              className={`border rounded-lg p-4 transition-colors ${
                isMet ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Criterion Header */}
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => !readOnly && onAssessmentChange(
                    criterion.assessmentKey as keyof DECriteriaAssessment,
                    !isMet
                  )}
                  disabled={readOnly}
                  className={`mt-0.5 p-1 rounded border-2 transition-colors ${
                    isMet
                      ? 'bg-red-500 border-red-500'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  {isMet && <Check className="h-4 w-4 text-white" />}
                </button>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {criterion.label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {criterion.full}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {criterion.guidance}
                  </p>
                </div>

                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  isMet
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isMet ? 'MET' : 'NOT MET'}
                </div>
              </div>

              {/* Evidence Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Evidence
                </label>
                <textarea
                  value={evidenceValue}
                  onChange={(e) => onEvidenceChange(
                    criterion.key as keyof DECriteriaEvidence,
                    e.target.value
                  )}
                  disabled={readOnly}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    readOnly
                      ? 'bg-gray-50 cursor-not-allowed'
                      : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } ${
                    isMet && !evidenceValue
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300'
                  }`}
                  rows={2}
                  placeholder={
                    isMet
                      ? 'Provide evidence supporting why this criterion is met...'
                      : 'Optional: Note why this criterion is not met...'
                  }
                />
                {isMet && !evidenceValue && (
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Evidence recommended for met criteria
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Quick Summary</h4>
        <div className="grid grid-cols-5 gap-2">
          {CRITERIA_DETAILS.map((criterion, index) => {
            const isMet = assessment[criterion.assessmentKey as keyof DECriteriaAssessment];
            return (
              <div
                key={criterion.key}
                className={`text-center py-2 px-1 rounded ${
                  isMet ? 'bg-red-100' : 'bg-green-100'
                }`}
              >
                <div className="text-lg font-bold">
                  {index + 1}
                </div>
                <div className={`text-xs ${
                  isMet ? 'text-red-700' : 'text-green-700'
                }`}>
                  {isMet ? 'MET' : 'NOT MET'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}