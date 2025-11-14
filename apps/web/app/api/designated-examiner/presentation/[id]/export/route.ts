import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPresentation } from '@/lib/db/de-presentations';
import type { DEPresentation, ExportFormat } from '@/types/designated-examiner';

// Export formats
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as ExportFormat;

    if (!format || !['pdf', 'speaking-notes', 'screen-reference'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use: pdf, speaking-notes, or screen-reference' },
        { status: 400 }
      );
    }

    const presentation = await getPresentation(params.id, userId);

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    console.log(`[GET /api/designated-examiner/presentation/[id]/export] Format: ${format}`);

    switch (format) {
      case 'pdf':
        return generatePDFResponse(presentation);
      case 'speaking-notes':
        return generateSpeakingNotesResponse(presentation);
      case 'screen-reference':
        return generateScreenReferenceResponse(presentation);
      default:
        return NextResponse.json(
          { error: 'Format not implemented' },
          { status: 501 }
        );
    }
  } catch (error) {
    console.error('[GET /api/designated-examiner/presentation/[id]/export] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export presentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Generate PDF format (returns HTML that can be printed to PDF)
function generatePDFResponse(presentation: DEPresentation): NextResponse {
  const data = presentation.presentation_data;
  const criteria = presentation.criteria_assessment;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Court Presentation - ${presentation.patient_name || 'Patient'}</title>
  <style>
    @media print {
      body { margin: 0; }
      .page-break { page-break-after: always; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
      color: #333;
    }
    h1 { font-size: 24px; margin-bottom: 10px; }
    h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .patient-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .section {
      margin-bottom: 20px;
    }
    .subsection {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .criteria {
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #333;
      background: #f9f9f9;
    }
    .criteria-item {
      margin: 10px 0;
      padding: 8px;
      background: white;
      border-left: 4px solid #666;
    }
    .met { border-left-color: #d00; background: #fff5f5; }
    .not-met { border-left-color: #0a0; background: #f5fff5; }
    .medications {
      columns: 2;
      column-gap: 30px;
    }
    .med-list {
      break-inside: avoid;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DESIGNATED EXAMINER COURT PRESENTATION</h1>
    <div>Utah Mental Health Court</div>
  </div>

  <div class="patient-info">
    <div><strong>Patient:</strong> ${presentation.patient_name || 'Not specified'}</div>
    <div><strong>Hearing Date:</strong> ${presentation.hearing_date ? new Date(presentation.hearing_date).toLocaleDateString() : 'Not scheduled'}</div>
    <div><strong>Commitment Type:</strong> ${presentation.commitment_type || '30-day'}</div>
    <div><strong>Facility:</strong> ${presentation.hospital || 'Huntsman Mental Health Institute'}</div>
  </div>

  <div class="section">
    <h2>1. Patient Summary</h2>
    <p><strong>${data?.one_liner || 'No summary provided'}</strong></p>
  </div>

  <div class="section">
    <h2>2. Demographics & Diagnoses</h2>
    <div class="subsection">
      <strong>Age:</strong> ${data?.demographics.age || 'Not specified'}<br>
      <strong>Sex:</strong> ${data?.demographics.sex || 'Not specified'}<br>
      <strong>Psychiatric Diagnoses:</strong> ${data?.demographics.psychiatric_diagnoses || 'Not specified'}
    </div>
  </div>

  <div class="section">
    <h2>3. Admission & Commitment</h2>
    <div class="subsection">
      <h3>Admitted For:</h3>
      <p>${data?.admission.reason || 'Not specified'}</p>
      <h3>Being Committed For:</h3>
      <p>${data?.admission.commitment_reason || 'Not specified'}</p>
    </div>
  </div>

  <div class="section">
    <h2>4. Initial Presentation (Past 2-4 Weeks)</h2>
    <p>${data?.initial_presentation || 'No information provided'}</p>
  </div>

  <div class="section">
    <h2>5. Relevant History</h2>
    <div class="subsection">
      <h3>Previous Psychiatric Admissions:</h3>
      <p>${data?.relevant_history.previous_admissions || 'None documented'}</p>

      <h3>Suicide Attempts:</h3>
      <p>${data?.relevant_history.suicide_attempts || 'None documented'}</p>

      <h3>Violence/Aggression History:</h3>
      <p>${data?.relevant_history.violence_history || 'None documented'}</p>

      <h3>Substance Use:</h3>
      <p>${data?.relevant_history.substance_use || 'None documented'}</p>

      <h3>Social History:</h3>
      <p>${data?.relevant_history.social_history || 'Not specified'}</p>
    </div>
  </div>

  <div class="section medications">
    <h2>6. Medications</h2>
    <div class="med-list">
      <h3>Prior to Admission:</h3>
      <ul>
        ${data?.medications.prior?.map(med => `<li>${med}</li>`).join('') || '<li>None documented</li>'}
      </ul>
    </div>
    <div class="med-list">
      <h3>Currently Prescribed:</h3>
      <ul>
        ${data?.medications.current?.map(med => `<li>${med}</li>`).join('') || '<li>None documented</li>'}
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>7. Hospital Course</h2>
    <div class="subsection">
      <h3>Improvement:</h3>
      <p>${data?.hospital_course.improvement || 'Not documented'}</p>

      <h3>Medication Compliance:</h3>
      <p>${data?.hospital_course.medication_compliance || 'Not documented'}</p>

      <h3>Special Interventions:</h3>
      <p>${data?.hospital_course.special_interventions || 'None required'}</p>

      <h3>Activities/Behavior:</h3>
      <p>${data?.hospital_course.activities || 'Not documented'}</p>
    </div>
  </div>

  <div class="section">
    <h2>8. Patient Interview</h2>
    <div class="subsection">
      <h3>Objective Findings:</h3>
      <p><strong>Thought Process:</strong> ${data?.interview.objective.thought_process || 'Not assessed'}</p>
      <p><strong>Orientation:</strong> ${data?.interview.objective.orientation || 'Not assessed'}</p>

      <h3>Subjective Findings:</h3>
      <p><strong>Insight/Understanding:</strong> ${data?.interview.subjective.insight || 'Not assessed'}</p>
      <p><strong>Follow-up Plan:</strong> ${data?.interview.subjective.follow_up_plan || 'Not specified'}</p>
    </div>
  </div>

  <div class="section page-break">
    <h2>9. Utah Commitment Criteria Assessment</h2>
    <div class="criteria">
      <div class="criteria-item ${criteria?.meets_criterion_1 ? 'met' : 'not-met'}">
        <strong>Criterion 1: Has Mental Illness</strong><br>
        <strong>Status:</strong> ${criteria?.meets_criterion_1 ? 'MET' : 'NOT MET'}<br>
        <strong>Evidence:</strong> ${data?.criteria_evidence.criterion_1 || 'Not documented'}
      </div>

      <div class="criteria-item ${criteria?.meets_criterion_2 ? 'met' : 'not-met'}">
        <strong>Criterion 2: Danger to Self/Others or Unable to Care for Basic Needs</strong><br>
        <strong>Status:</strong> ${criteria?.meets_criterion_2 ? 'MET' : 'NOT MET'}<br>
        <strong>Evidence:</strong> ${data?.criteria_evidence.criterion_2 || 'Not documented'}
      </div>

      <div class="criteria-item ${criteria?.meets_criterion_3 ? 'met' : 'not-met'}">
        <strong>Criterion 3: Lacks Capacity for Rational Treatment Decisions</strong><br>
        <strong>Status:</strong> ${criteria?.meets_criterion_3 ? 'MET' : 'NOT MET'}<br>
        <strong>Evidence:</strong> ${data?.criteria_evidence.criterion_3 || 'Not documented'}
      </div>

      <div class="criteria-item ${criteria?.meets_criterion_4 ? 'met' : 'not-met'}">
        <strong>Criterion 4: Hospitalization is Least Restrictive Alternative</strong><br>
        <strong>Status:</strong> ${criteria?.meets_criterion_4 ? 'MET' : 'NOT MET'}<br>
        <strong>Evidence:</strong> ${data?.criteria_evidence.criterion_4 || 'Not documented'}
      </div>

      <div class="criteria-item ${criteria?.meets_criterion_5 ? 'met' : 'not-met'}">
        <strong>Criterion 5: Local Mental Health Authority Can Provide Treatment</strong><br>
        <strong>Status:</strong> ${criteria?.meets_criterion_5 ? 'MET' : 'NOT MET'}<br>
        <strong>Evidence:</strong> ${data?.criteria_evidence.criterion_5 || 'Not documented'}
      </div>
    </div>

    <h3>Overall Assessment:</h3>
    <p><strong>${
      Object.values(criteria || {}).filter(Boolean).length
    } of 5 criteria met for involuntary commitment.</strong></p>
  </div>

  <div class="footer">
    <p>Prepared: ${new Date().toLocaleString()}</p>
    <p>Examiner: ${presentation.finalized_by || 'Not specified'}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="presentation-${presentation.patient_name?.replace(/\s/g, '-') || 'patient'}-${new Date().toISOString().split('T')[0]}.html"`
    }
  });
}

// Generate speaking notes format
function generateSpeakingNotesResponse(presentation: DEPresentation): NextResponse {
  const data = presentation.presentation_data;
  const criteria = presentation.criteria_assessment;
  const metCount = Object.values(criteria || {}).filter(Boolean).length;

  const notes = `COURT PRESENTATION SPEAKING NOTES
=====================================
Patient: ${presentation.patient_name || 'Not specified'}
Hearing: ${presentation.hearing_date ? new Date(presentation.hearing_date).toLocaleDateString() : 'Not scheduled'}
Type: ${presentation.commitment_type || '30-day'} commitment

ONE-LINER
---------
• ${data?.one_liner || 'Prepare patient summary'}

DEMOGRAPHICS
------------
• Age: ${data?.demographics.age || 'Verify'}
• Sex: ${data?.demographics.sex || 'Verify'}
• Diagnoses: ${data?.demographics.psychiatric_diagnoses || 'List primary diagnoses'}

ADMISSION REASON
----------------
• Admitted for: ${data?.admission.reason || 'State admission reason'}
• Commitment basis: ${data?.admission.commitment_reason || 'Explain legal basis'}

KEY HISTORY POINTS
------------------
${data?.relevant_history.previous_admissions ? '• Prior admissions: ' + data.relevant_history.previous_admissions : '• No prior admissions'}
${data?.relevant_history.suicide_attempts ? '• Suicide history: ' + data.relevant_history.suicide_attempts : '• No suicide attempts'}
${data?.relevant_history.violence_history ? '• Violence: ' + data.relevant_history.violence_history : '• No violence history'}
${data?.relevant_history.substance_use ? '• Substances: ' + data.relevant_history.substance_use : '• No substance use'}

HOSPITAL COURSE HIGHLIGHTS
--------------------------
• Improvement: ${data?.hospital_course.improvement || 'Describe changes'}
• Medication compliance: ${data?.hospital_course.medication_compliance || 'Note adherence'}
• Interventions: ${data?.hospital_course.special_interventions || 'None needed'}

CURRENT MEDICATIONS
-------------------
${data?.medications.current?.map(med => `• ${med}`).join('\n') || '• List current meds'}

INTERVIEW FINDINGS
------------------
• Thought process: ${data?.interview.objective.thought_process || 'Describe'}
• Orientation: ${data?.interview.objective.orientation || 'Note status'}
• Insight: ${data?.interview.subjective.insight || 'Assess understanding'}
• Follow-up plan: ${data?.interview.subjective.follow_up_plan || 'Patient's plan'}

UTAH CRITERIA - ${metCount}/5 MET
----------------------------------
1. Mental Illness: ${criteria?.meets_criterion_1 ? '✓ MET' : '✗ NOT MET'}
   ${data?.criteria_evidence.criterion_1 ? '→ ' + data.criteria_evidence.criterion_1.substring(0, 50) + '...' : ''}

2. Danger/Disability: ${criteria?.meets_criterion_2 ? '✓ MET' : '✗ NOT MET'}
   ${data?.criteria_evidence.criterion_2 ? '→ ' + data.criteria_evidence.criterion_2.substring(0, 50) + '...' : ''}

3. Lacks Capacity: ${criteria?.meets_criterion_3 ? '✓ MET' : '✗ NOT MET'}
   ${data?.criteria_evidence.criterion_3 ? '→ ' + data.criteria_evidence.criterion_3.substring(0, 50) + '...' : ''}

4. Least Restrictive: ${criteria?.meets_criterion_4 ? '✓ MET' : '✗ NOT MET'}
   ${data?.criteria_evidence.criterion_4 ? '→ ' + data.criteria_evidence.criterion_4.substring(0, 50) + '...' : ''}

5. LMHA Can Treat: ${criteria?.meets_criterion_5 ? '✓ MET' : '✗ NOT MET'}
   ${data?.criteria_evidence.criterion_5 ? '→ ' + data.criteria_evidence.criterion_5.substring(0, 50) + '...' : ''}

CONCLUSION
----------
${metCount === 5 ? '• All criteria met for involuntary commitment' :
  metCount === 0 ? '• No criteria met - recommend against commitment' :
  `• ${metCount}/5 criteria met - partial criteria satisfied`}

NOTES
-----
[Space for additional notes during hearing]




Generated: ${new Date().toLocaleString()}`;

  return new NextResponse(notes, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="speaking-notes-${presentation.patient_name?.replace(/\s/g, '-') || 'patient'}-${new Date().toISOString().split('T')[0]}.txt"`
    }
  });
}

// Generate screen reference format (optimized for viewing on screen)
function generateScreenReferenceResponse(presentation: DEPresentation): NextResponse {
  // Return a JSON format optimized for screen display
  const screenData = {
    patient: {
      name: presentation.patient_name,
      hearing_date: presentation.hearing_date,
      commitment_type: presentation.commitment_type,
      hospital: presentation.hospital
    },
    quick_reference: {
      one_liner: presentation.presentation_data?.one_liner,
      age: presentation.presentation_data?.demographics.age,
      sex: presentation.presentation_data?.demographics.sex,
      diagnoses: presentation.presentation_data?.demographics.psychiatric_diagnoses
    },
    criteria_summary: {
      met_count: Object.values(presentation.criteria_assessment || {}).filter(Boolean).length,
      total: 5,
      details: presentation.criteria_assessment
    },
    key_points: {
      admission_reason: presentation.presentation_data?.admission.reason,
      commitment_reason: presentation.presentation_data?.admission.commitment_reason,
      improvement: presentation.presentation_data?.hospital_course.improvement,
      current_meds: presentation.presentation_data?.medications.current
    },
    full_data: presentation.presentation_data
  };

  return NextResponse.json(screenData, {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}