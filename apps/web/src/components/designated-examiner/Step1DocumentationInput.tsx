'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import type { DEWorkflowReport, CreateWorkflowInput } from '@/types/designated-examiner';

interface Step1Props {
  initialData?: Partial<DEWorkflowReport>;
  onSubmit: (data: CreateWorkflowInput) => Promise<void>;
  isLoading?: boolean;
}

export function Step1DocumentationInput({ initialData, onSubmit, isLoading = false }: Step1Props) {
  const [patientName, setPatientName] = useState(initialData?.patient_name || '');
  const [hearingDate, setHearingDate] = useState(initialData?.hearing_date || '');
  const [commitmentType, setCommitmentType] = useState<'30-day' | '60-day' | '90-day'>(
    initialData?.commitment_type || '30-day'
  );
  const [hospital, setHospital] = useState(
    initialData?.hospital || 'Huntsman Mental Health Institute'
  );
  const [cdeNote, setCdeNote] = useState(initialData?.cde_note || '');
  const [progressNotes, setProgressNotes] = useState(initialData?.progress_notes || '');
  const [adhocNotes, setAdhocNotes] = useState(initialData?.adhoc_notes || '');

  const [errors, setErrors] = useState<string[]>([]);

  // Update form when initialData changes (e.g., when resuming a workflow)
  useEffect(() => {
    if (initialData) {
      if (initialData.patient_name) setPatientName(initialData.patient_name);
      if (initialData.hearing_date) setHearingDate(initialData.hearing_date);
      if (initialData.commitment_type) setCommitmentType(initialData.commitment_type);
      if (initialData.hospital) setHospital(initialData.hospital);
      if (initialData.cde_note) setCdeNote(initialData.cde_note);
      if (initialData.progress_notes) setProgressNotes(initialData.progress_notes);
      if (initialData.adhoc_notes) setAdhocNotes(initialData.adhoc_notes);
    }
  }, [initialData]);

  const cdeWordCount = cdeNote.split(/\s+/).filter(Boolean).length;
  const progressWordCount = progressNotes.split(/\s+/).filter(Boolean).length;

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!patientName.trim()) {
      newErrors.push('Patient name is required');
    }

    if (!cdeNote.trim()) {
      newErrors.push('CDE (Comprehensive Psychiatric Evaluation) is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({
      patient_name: patientName.trim(),
      hearing_date: hearingDate || undefined,
      commitment_type: commitmentType,
      hospital: hospital.trim(),
      cde_note: cdeNote.trim(),
      progress_notes: progressNotes.trim() || undefined,
      adhoc_notes: adhocNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif text-[#0A1F3D] mb-2">
          Step 1: Documentation Input
        </h2>
        <p className="text-[#5A6B7D]">
          Paste documentation from Epic. The CDE is required; Progress Notes and Ad-hoc Notes are optional but encouraged.
        </p>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-500" size={18} />
            <span className="font-medium text-red-700">Please fix the following:</span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-600">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Patient Info Grid */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">Patient Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Patient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Last, First"
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Hearing Date
            </label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Commitment Length
            </label>
            <select
              value={commitmentType}
              onChange={(e) => setCommitmentType(e.target.value as '30-day' | '60-day' | '90-day')}
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            >
              <option value="30-day">30 Days (Salt Lake County)</option>
              <option value="60-day">60 Days (Outside SL County)</option>
              <option value="90-day">90 Days (Extended)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
              Hospital
            </label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* CDE Input - Required */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-[#E89C8A]" size={20} />
          <h3 className="text-lg font-semibold text-[#0A1F3D]">
            Comprehensive Psychiatric Evaluation (CDE) <span className="text-red-500">*</span>
          </h3>
        </div>
        <p className="text-sm text-[#5A6B7D] mb-4">
          Paste the full CDE from Epic. This is the intake evaluation for inpatient psychiatry and contains the most comprehensive information for the commitment criteria.
        </p>
        <textarea
          value={cdeNote}
          onChange={(e) => setCdeNote(e.target.value)}
          placeholder="Paste the Comprehensive Psychiatric Evaluation here..."
          rows={14}
          className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-[#5A6B7D]">{cdeWordCount} words</p>
          {!cdeNote.trim() && (
            <p className="text-sm text-red-500">Required</p>
          )}
        </div>
      </div>

      {/* Progress Notes - Optional */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-[#5A6B7D]" size={20} />
          <h3 className="text-lg font-semibold text-[#0A1F3D]">
            Progress Notes
            <span className="ml-2 text-sm font-normal text-[#5A6B7D]">(Optional but encouraged)</span>
          </h3>
        </div>
        <p className="text-sm text-[#5A6B7D] mb-4">
          Paste daily physician notes. You can include full notes or relevant sections, single or multiple notes. Sometimes crucial details emerge later in the hospitalization.
        </p>
        <textarea
          value={progressNotes}
          onChange={(e) => setProgressNotes(e.target.value)}
          placeholder="Paste progress notes here (optional)..."
          rows={10}
          className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
        />
        <p className="text-sm text-[#5A6B7D] mt-2">{progressWordCount} words</p>
      </div>

      {/* Ad-hoc Notes - Optional */}
      <div className="bg-white rounded-lg border border-[#C5A882]/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-[#5A6B7D]" size={20} />
          <h3 className="text-lg font-semibold text-[#0A1F3D]">
            Ad-hoc Notes
            <span className="ml-2 text-sm font-normal text-[#5A6B7D]">(Optional)</span>
          </h3>
        </div>
        <p className="text-sm text-[#5A6B7D] mb-4">
          Write informal notes based on your conversations with staff, nursing, the attending physician, and/or collateral sources. These details may not be in the formal documentation.
        </p>
        <textarea
          value={adhocNotes}
          onChange={(e) => setAdhocNotes(e.target.value)}
          placeholder="Example: Spoke with patient's sister who reports he threatened her with a knife last week. She is afraid to have him come home..."
          rows={6}
          className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !patientName.trim() || !cdeNote.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </>
        ) : (
          <>
            Continue to AI Analysis
            <span className="text-sm opacity-75">→</span>
          </>
        )}
      </button>
    </div>
  );
}
