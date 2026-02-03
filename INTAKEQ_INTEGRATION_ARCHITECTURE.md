# IntakeQ ↔ Epic Scribe Integration Architecture

**Owner:** Dr. Rufus Sweeney  
**Status:** Planning Phase  
**Last Updated:** 2025-02-03

---

## Executive Summary

This document outlines the architecture for bidirectional integration between Epic Scribe (note generation) and IntakeQ (EMR). The goal is to create a seamless workflow where:

1. **Prior notes** are pulled FROM IntakeQ → used as context for generating new notes
2. **Generated notes** are pushed TO IntakeQ → complete with diagnoses, signatures, and locking

This integration specifically targets **Moonlit Psychiatry** patients (no staffing transcript complexity).

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EPIC SCRIBE                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Patient    │    │   Generate   │    │   Finalize Note      │  │
│  │   Selector   │───▶│     Note     │───▶│   + Push to IntakeQ  │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│         │                   ▲                       │               │
│         │                   │                       │               │
└─────────┼───────────────────┼───────────────────────┼───────────────┘
          │                   │                       │
          ▼                   │                       ▼
┌─────────────────────────────┼───────────────────────────────────────┐
│                    INTAKEQ INTEGRATION LAYER                        │
│  ┌──────────────┐           │           ┌──────────────────────┐   │
│  │  IntakeQ     │    ┌──────┴──────┐    │  Playwright          │   │
│  │  Notes API   │───▶│ Prior Note  │    │  Browser Automation  │   │
│  │  (READ)      │    │ Formatter   │    │  (WRITE)             │   │
│  └──────────────┘    └─────────────┘    └──────────────────────┘   │
│         │                                          │                │
└─────────┼──────────────────────────────────────────┼────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            INTAKEQ EMR                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐│
│  │  Patients │  │  Notes    │  │ Diagnoses │  │  Claims/Superbill ││
│  └───────────┘  └───────────┘  └───────────┘  └───────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Reading Prior Notes from IntakeQ

### 1.1 IntakeQ Notes API Endpoints

```typescript
// GET /notes/summary - Query treatment notes
GET https://intakeq.com/api/v1/notes/summary?clientId={clientId}&status=1

// GET /notes/{noteId} - Get full note content
GET https://intakeq.com/api/v1/notes/{noteId}

// Response structure
interface IntakeQNote {
  Id: string;                    // GUID
  ClientName: string;
  ClientEmail: string;
  ClientId: number;
  Status: 'locked' | 'unlocked';
  Date: number;                  // Unix timestamp
  NoteName: string;              // Template name
  PractitionerEmail: string;
  PractitionerName: string;
  PractitionerId: string;
  Questions: IntakeQQuestion[];  // Full note only
  AppointmentId?: string;
}

interface IntakeQQuestion {
  Id: string;
  Text: string;
  Answer: string | null;
  QuestionType: string;
  Rows: { Text: string; Answers: string[] }[];
  ColumnNames: string[];
  OfficeUse: boolean;
  OfficeNote: string | null;
}
```

### 1.2 New Service: `intakeq-api.ts`

```typescript
// services/intakeq/src/intakeq-api.ts

interface IntakeQConfig {
  apiKey: string;
  baseUrl: string;
}

export class IntakeQApiClient {
  private config: IntakeQConfig;

  constructor(config: IntakeQConfig) {
    this.config = config;
  }

  async getClientByEmail(email: string): Promise<IntakeQClient | null> {
    const response = await fetch(
      `${this.config.baseUrl}/clients?search=${encodeURIComponent(email)}`,
      { headers: { 'X-Auth-Key': this.config.apiKey } }
    );
    const clients = await response.json();
    return clients[0] || null;
  }

  async getClientNotes(clientId: number, options?: {
    status?: 'locked' | 'unlocked';
    limit?: number;
  }): Promise<IntakeQNoteSummary[]> {
    const params = new URLSearchParams({ clientId: String(clientId) });
    if (options?.status) params.set('status', options.status === 'locked' ? '1' : '2');
    
    const response = await fetch(
      `${this.config.baseUrl}/notes/summary?${params}`,
      { headers: { 'X-Auth-Key': this.config.apiKey } }
    );
    return response.json();
  }

  async getFullNote(noteId: string): Promise<IntakeQFullNote> {
    const response = await fetch(
      `${this.config.baseUrl}/notes/${noteId}`,
      { headers: { 'X-Auth-Key': this.config.apiKey } }
    );
    return response.json();
  }

  async getClientDiagnoses(clientId: number): Promise<IntakeQDiagnosis[]> {
    const response = await fetch(
      `${this.config.baseUrl}/client/${clientId}/diagnoses`,
      { headers: { 'X-Auth-Key': this.config.apiKey } }
    );
    return response.json();
  }
}
```

### 1.3 Prior Note Formatter

Convert IntakeQ's question-based format into Epic Scribe's expected prose format:

```typescript
// services/intakeq/src/note-formatter.ts

export function formatIntakeQNoteForEpicScribe(note: IntakeQFullNote): string {
  let formatted = '';
  
  for (const question of note.Questions) {
    // Skip office-use-only questions or empty answers
    if (question.OfficeUse && !question.Answer) continue;
    
    // Section headers from question text
    if (question.QuestionType === 'Header' || question.QuestionType === 'Section') {
      formatted += `\n## ${question.Text}\n`;
      continue;
    }
    
    // Matrix questions (tables)
    if (question.QuestionType === 'Matrix' && question.Rows.length > 0) {
      formatted += `\n**${question.Text}**\n`;
      for (const row of question.Rows) {
        const answers = row.Answers.filter(a => a).join(', ');
        if (answers) formatted += `- ${row.Text}: ${answers}\n`;
      }
      continue;
    }
    
    // Standard questions
    if (question.Answer) {
      formatted += `\n**${question.Text}:** ${question.Answer}\n`;
    }
  }
  
  return formatted.trim();
}
```

### 1.4 Integration with Epic Scribe Generate Flow

Modify the workflow to optionally fetch prior note from IntakeQ:

```typescript
// In WorkflowWizard.tsx or GenerateInputStep.tsx

const [useIntakeQPriorNote, setUseIntakeQPriorNote] = useState(true);
const [intakeQPriorNote, setIntakeQPriorNote] = useState<string | null>(null);

// When patient is selected and setting is "Moonlit Psychiatry"
useEffect(() => {
  if (patient && setting === 'Moonlit Psychiatry' && useIntakeQPriorNote) {
    fetchIntakeQPriorNote(patient.email).then(note => {
      setIntakeQPriorNote(note);
    });
  }
}, [patient, setting, useIntakeQPriorNote]);

// Pass to generate API
const generatePayload = {
  ...existingPayload,
  priorNote: intakeQPriorNote || priorNote, // IntakeQ takes precedence
};
```

---

## Part 2: Writing Generated Notes to IntakeQ (Playwright)

### 2.1 Why Playwright?

IntakeQ has no API for:
- Creating treatment notes
- Adding diagnoses to notes
- Signing notes
- Locking notes

We must automate the browser to perform these actions.

### 2.2 IntakeQ Note Structure Requirements

A complete IntakeQ treatment note requires:

| Component | How to Add | Automation Complexity |
|-----------|-----------|----------------------|
| Note Template | Select during note creation | Low |
| Note Content | Fill in questions/text fields | Medium |
| Diagnoses | More → Add Diagnosis → Select from list | Medium |
| Signature | Signature field in note | Low |
| Lock Status | Click "Lock" button | Low |
| Insurance | Set in client profile (if applicable) | Low (one-time) |

### 2.3 Playwright Service Architecture

```typescript
// services/intakeq-playwright/src/intakeq-automation.ts

import { Browser, Page, chromium } from 'playwright';

interface IntakeQCredentials {
  email: string;
  password: string;
}

interface NoteToCreate {
  clientId: number;
  templateName: string;          // Must match exactly
  noteContent: NoteSection[];    // Mapped to form fields
  diagnoses: DiagnosisCode[];    // ICD-10 codes
  signatureRequired: boolean;
}

interface NoteSection {
  questionId?: string;           // If targeting specific field
  questionText: string;          // Fallback: match by text
  value: string;
}

interface DiagnosisCode {
  code: string;                  // e.g., "F32.1"
  description: string;           // e.g., "Major Depressive Disorder, Single Episode, Moderate"
}

export class IntakeQAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true, // Set to false for debugging
      slowMo: 50,     // Slow down for stability
    });
    this.page = await this.browser.newPage();
  }

  async login(credentials: IntakeQCredentials): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    await this.page.goto('https://intakeq.com/login');
    await this.page.fill('input[name="email"]', credentials.email);
    await this.page.fill('input[name="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await this.page.waitForSelector('.dashboard', { timeout: 10000 });
    this.isLoggedIn = true;
  }

  async navigateToClient(clientId: number): Promise<void> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in');
    
    await this.page.goto(`https://intakeq.com/clients/${clientId}`);
    await this.page.waitForSelector('.client-timeline', { timeout: 10000 });
  }

  async createNote(note: NoteToCreate): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    // Navigate to client
    await this.navigateToClient(note.clientId);

    // Click "Add Note" button
    await this.page.click('button:has-text("Add Note")');
    
    // Select template
    await this.page.click(`.template-option:has-text("${note.templateName}")`);
    await this.page.waitForSelector('.note-editor', { timeout: 10000 });

    // Fill in note content
    for (const section of note.noteContent) {
      await this.fillNoteSection(section);
    }

    // Add diagnoses
    for (const diagnosis of note.diagnoses) {
      await this.addDiagnosis(diagnosis);
    }

    // Sign if required
    if (note.signatureRequired) {
      await this.signNote();
    }

    // Get the note ID before locking
    const noteId = await this.page.getAttribute('.note-editor', 'data-note-id');

    // Lock the note
    await this.lockNote();

    return noteId || 'unknown';
  }

  private async fillNoteSection(section: NoteSection): Promise<void> {
    if (!this.page) return;

    // Try to find by question ID first
    if (section.questionId) {
      const selector = `[data-question-id="${section.questionId}"]`;
      if (await this.page.$(selector)) {
        await this.page.fill(`${selector} textarea, ${selector} input`, section.value);
        return;
      }
    }

    // Fallback: find by question text
    const questionLabel = await this.page.$(`text="${section.questionText}"`);
    if (questionLabel) {
      const input = await questionLabel.evaluateHandle(
        el => el.closest('.question-container')?.querySelector('textarea, input')
      );
      if (input) {
        await (input as any).fill(section.value);
      }
    }
  }

  private async addDiagnosis(diagnosis: DiagnosisCode): Promise<void> {
    if (!this.page) return;

    // Click More → Add Diagnosis
    await this.page.click('button:has-text("More")');
    await this.page.click('text="Add Diagnosis"');
    
    // Wait for diagnosis modal
    await this.page.waitForSelector('.diagnosis-modal', { timeout: 5000 });
    
    // Search for the diagnosis code
    await this.page.fill('.diagnosis-search input', diagnosis.code);
    await this.page.waitForTimeout(500); // Wait for search results
    
    // Click on the matching diagnosis
    const diagnosisOption = await this.page.$(
      `.diagnosis-option:has-text("${diagnosis.code}")`
    );
    
    if (diagnosisOption) {
      await diagnosisOption.click();
    } else {
      console.warn(`Diagnosis ${diagnosis.code} not found in IntakeQ list`);
    }

    // Close modal
    await this.page.click('button:has-text("Done Selecting")');
  }

  private async signNote(): Promise<void> {
    if (!this.page) return;

    // Find signature field and sign
    const signatureCanvas = await this.page.$('.signature-pad canvas');
    if (signatureCanvas) {
      // Draw a simple signature
      const box = await signatureCanvas.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + 10, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
        await this.page.mouse.up();
      }
    }
  }

  private async lockNote(): Promise<void> {
    if (!this.page) return;

    // Click Lock button
    await this.page.click('button:has-text("Lock")');
    
    // Confirm if there's a confirmation dialog
    const confirmButton = await this.page.$('button:has-text("Confirm")');
    if (confirmButton) {
      await confirmButton.click();
    }
    
    // Wait for lock confirmation
    await this.page.waitForSelector('text="locked"', { timeout: 10000 });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### 2.4 Mapping Epic Scribe Output to IntakeQ Fields

Critical consideration: IntakeQ notes are **form-based**, not free-text. We need to map Epic Scribe's generated sections to IntakeQ's form fields.

```typescript
// services/intakeq-playwright/src/note-mapper.ts

interface IntakeQFieldMapping {
  epicScribeSection: string;      // e.g., "History of Present Illness"
  intakeQQuestionId?: string;     // If known
  intakeQQuestionText: string;    // Fallback text match
  fieldType: 'textarea' | 'select' | 'multiselect' | 'text';
}

// This mapping needs to be configured based on your IntakeQ note template
export const MOONLIT_NOTE_MAPPING: IntakeQFieldMapping[] = [
  {
    epicScribeSection: 'History of Present Illness',
    intakeQQuestionText: 'History of Present Illness',
    fieldType: 'textarea'
  },
  {
    epicScribeSection: 'Psychiatric History',
    intakeQQuestionText: 'Psychiatric History',
    fieldType: 'textarea'
  },
  {
    epicScribeSection: 'Mental Status Examination',
    intakeQQuestionText: 'Mental Status Examination',
    fieldType: 'textarea'
  },
  {
    epicScribeSection: 'Diagnoses',
    intakeQQuestionText: 'Assessment',
    fieldType: 'textarea'
  },
  {
    epicScribeSection: 'Plan',
    intakeQQuestionText: 'Plan',
    fieldType: 'textarea'
  },
  // Add more mappings as needed
];

export function mapEpicScribeNoteToIntakeQ(
  generatedNote: string,
  mapping: IntakeQFieldMapping[]
): NoteSection[] {
  const sections: NoteSection[] = [];
  
  for (const field of mapping) {
    // Extract the section content from the generated note
    const sectionContent = extractSection(generatedNote, field.epicScribeSection);
    
    if (sectionContent) {
      sections.push({
        questionId: field.intakeQQuestionId,
        questionText: field.intakeQQuestionText,
        value: sectionContent
      });
    }
  }
  
  return sections;
}

function extractSection(note: string, sectionName: string): string | null {
  // Find section by header
  const regex = new RegExp(
    `(?:^|\\n)(?:#+\\s*)?${escapeRegex(sectionName)}[:\\s]*\\n([\\s\\S]*?)(?=\\n(?:#+\\s*)?[A-Z][a-z]+[:\\s]*\\n|$)`,
    'i'
  );
  const match = note.match(regex);
  return match ? match[1].trim() : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### 2.5 Diagnosis Extraction from Generated Notes

```typescript
// services/intakeq-playwright/src/diagnosis-extractor.ts

interface ExtractedDiagnosis {
  code: string;
  description: string;
  specifiers?: string;
}

export function extractDiagnosesFromNote(note: string): ExtractedDiagnosis[] {
  const diagnoses: ExtractedDiagnosis[] = [];
  
  // Find the Diagnoses section
  const diagnosisSection = extractSection(note, 'Diagnoses');
  if (!diagnosisSection) return diagnoses;
  
  // Parse each line for ICD-10 codes
  // Expected format: "Major Depressive Disorder, Single Episode, Moderate - F32.1"
  const lines = diagnosisSection.split('\n');
  
  for (const line of lines) {
    // Match pattern: Description - Code
    const match = line.match(/^(.+?)\s*[-–—]\s*([A-Z]\d{2}(?:\.\d{1,2})?)/);
    if (match) {
      diagnoses.push({
        description: match[1].trim(),
        code: match[2].trim()
      });
      continue;
    }
    
    // Alternative pattern: Code - Description
    const altMatch = line.match(/^([A-Z]\d{2}(?:\.\d{1,2})?)\s*[-–—]\s*(.+)/);
    if (altMatch) {
      diagnoses.push({
        code: altMatch[1].trim(),
        description: altMatch[2].trim()
      });
    }
  }
  
  return diagnoses;
}
```

---

## Part 3: UI/UX Integration in Epic Scribe

### 3.1 New Workflow Step: "Push to IntakeQ"

Add a new step after note finalization:

```typescript
// apps/web/src/components/workflow/IntakeQPushStep.tsx

interface IntakeQPushStepProps {
  patient: Patient;
  generatedNote: string;
  diagnoses: ExtractedDiagnosis[];
  onPushComplete: (result: PushResult) => void;
}

export function IntakeQPushStep({ patient, generatedNote, diagnoses, onPushComplete }: IntakeQPushStepProps) {
  const [status, setStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notePreview, setNotePreview] = useState<NoteSection[]>([]);

  useEffect(() => {
    // Preview the mapping
    const mapped = mapEpicScribeNoteToIntakeQ(generatedNote, MOONLIT_NOTE_MAPPING);
    setNotePreview(mapped);
  }, [generatedNote]);

  const handlePush = async () => {
    setStatus('pushing');
    try {
      const response = await fetch('/api/intakeq/push-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: patient.email,
          noteContent: notePreview,
          diagnoses,
          signatureRequired: true,
          lockAfterPush: true
        })
      });
      
      if (!response.ok) throw new Error(await response.text());
      
      const result = await response.json();
      setStatus('success');
      onPushComplete(result);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="intakeq-push-step">
      <h3>Push to IntakeQ</h3>
      
      {/* Diagnoses Preview */}
      <div className="diagnoses-preview">
        <h4>Diagnoses to Add:</h4>
        <ul>
          {diagnoses.map((dx, i) => (
            <li key={i}>
              <code>{dx.code}</code> - {dx.description}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Note Section Preview */}
      <div className="note-preview">
        <h4>Note Sections:</h4>
        {notePreview.map((section, i) => (
          <div key={i} className="section-preview">
            <strong>{section.questionText}:</strong>
            <pre>{section.value.substring(0, 200)}...</pre>
          </div>
        ))}
      </div>
      
      {/* Push Button */}
      <button 
        onClick={handlePush} 
        disabled={status === 'pushing'}
        className="push-button"
      >
        {status === 'pushing' ? 'Pushing to IntakeQ...' : 'Push to IntakeQ & Lock'}
      </button>
      
      {status === 'success' && (
        <div className="success-message">
          ✓ Note successfully created and locked in IntakeQ
        </div>
      )}
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
}
```

### 3.2 API Route for Playwright Push

```typescript
// apps/web/app/api/intakeq/push-note/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { IntakeQAutomation } from '@epic-scribe/intakeq-playwright';
import { IntakeQApiClient } from '@epic-scribe/intakeq-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientEmail, noteContent, diagnoses, signatureRequired, lockAfterPush } = body;

    // First, get the client ID from IntakeQ API
    const apiClient = new IntakeQApiClient({
      apiKey: process.env.INTAKEQ_API_KEY!,
      baseUrl: 'https://intakeq.com/api/v1'
    });
    
    const client = await apiClient.getClientByEmail(patientEmail);
    if (!client) {
      return NextResponse.json(
        { error: `Client not found with email: ${patientEmail}` },
        { status: 404 }
      );
    }

    // Initialize Playwright automation
    const automation = new IntakeQAutomation();
    await automation.initialize();
    
    try {
      await automation.login({
        email: process.env.INTAKEQ_USER_EMAIL!,
        password: process.env.INTAKEQ_USER_PASSWORD!
      });

      const noteId = await automation.createNote({
        clientId: client.ClientId,
        templateName: 'Moonlit Psychiatric Note', // Must match your template name
        noteContent,
        diagnoses,
        signatureRequired
      });

      return NextResponse.json({
        success: true,
        noteId,
        message: 'Note created and locked in IntakeQ'
      });
    } finally {
      await automation.close();
    }

  } catch (error) {
    console.error('IntakeQ push error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Part 4: Configuration & Environment

### 4.1 New Environment Variables

```bash
# .env.local additions

# IntakeQ API (for reading notes/patients)
INTAKEQ_API_KEY=your-api-key-here

# IntakeQ Playwright (for writing notes)
INTAKEQ_USER_EMAIL=your-intakeq-login@moonlit.com
INTAKEQ_USER_PASSWORD=your-secure-password

# IntakeQ Note Template (must match exactly)
INTAKEQ_NOTE_TEMPLATE_NAME="Moonlit Psychiatric Note"
```

### 4.2 New Package Structure

```
epic-scribe/
├── services/
│   ├── note/                    # Existing
│   ├── intakeq-api/             # NEW: API client
│   │   ├── src/
│   │   │   ├── intakeq-api.ts
│   │   │   ├── note-formatter.ts
│   │   │   └── types.ts
│   │   └── package.json
│   └── intakeq-playwright/      # NEW: Browser automation
│       ├── src/
│       │   ├── intakeq-automation.ts
│       │   ├── note-mapper.ts
│       │   ├── diagnosis-extractor.ts
│       │   └── selectors.ts     # CSS selectors (update if UI changes)
│       └── package.json
```

---

## Part 5: Implementation Roadmap

### Phase 1: Read Path (1-2 days)
1. [ ] Create `intakeq-api` service package
2. [ ] Implement `IntakeQApiClient` with authentication
3. [ ] Implement `formatIntakeQNoteForEpicScribe` converter
4. [ ] Add API route `/api/intakeq/prior-note`
5. [ ] Integrate into workflow UI (checkbox to use IntakeQ prior note)
6. [ ] Test with real Moonlit patients

### Phase 2: Write Path - Core (3-4 days)
1. [ ] Create `intakeq-playwright` service package
2. [ ] Implement login automation
3. [ ] Implement note creation (without diagnoses)
4. [ ] Map Epic Scribe sections to IntakeQ form fields
5. [ ] Test with a simple note

### Phase 3: Write Path - Diagnoses (2-3 days)
1. [ ] Implement `extractDiagnosesFromNote`
2. [ ] Implement diagnosis selection automation
3. [ ] Handle edge cases (diagnosis not in IntakeQ list)
4. [ ] Test diagnosis flow end-to-end

### Phase 4: Write Path - Finalization (1-2 days)
1. [ ] Implement signature automation
2. [ ] Implement lock automation
3. [ ] Add error handling and retry logic
4. [ ] Create `IntakeQPushStep` UI component

### Phase 5: Polish & Resilience (2-3 days)
1. [ ] Add session persistence (avoid re-login)
2. [ ] Add robust selector fallbacks
3. [ ] Add logging and debugging mode
4. [ ] Handle IntakeQ UI changes gracefully
5. [ ] Add configuration for different note templates

---

## Part 6: Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| IntakeQ UI changes break selectors | Use data attributes where possible; fall back to text content; maintain selector config file |
| Login session expires | Implement session refresh; detect login prompts and re-authenticate |
| Rate limiting on API | Implement exponential backoff; cache client lookups |
| Diagnosis not in IntakeQ list | Pre-validate against IntakeQ's diagnosis list; show warning to user |
| Browser automation detected | Use realistic browser fingerprints; add random delays |
| Concurrent automation conflicts | Queue automation tasks; use single browser instance |

---

## Part 7: Future Enhancements

1. **Webhook Integration**: Use IntakeQ's webhook for note-locked events to sync status back to Epic Scribe
2. **Bulk Operations**: Push multiple notes in a batch (end-of-day workflow)
3. **FSH Dashboard Sync**: Update the FSH coordination dashboard when notes are created
4. **Template Sync**: Automatically detect IntakeQ template structure and generate field mappings
5. **Two-Way Sync**: Pull edits made in IntakeQ back into Epic Scribe

---

## Appendix A: IntakeQ Selector Reference

These selectors are based on typical IntakeQ UI patterns and may need updating:

```typescript
// services/intakeq-playwright/src/selectors.ts

export const SELECTORS = {
  // Login
  LOGIN_EMAIL: 'input[name="email"], input[type="email"]',
  LOGIN_PASSWORD: 'input[name="password"], input[type="password"]',
  LOGIN_SUBMIT: 'button[type="submit"]',
  
  // Dashboard
  DASHBOARD_INDICATOR: '.dashboard, [data-page="dashboard"]',
  
  // Client page
  CLIENT_TIMELINE: '.client-timeline, .timeline-container',
  ADD_NOTE_BUTTON: 'button:has-text("Add Note"), .add-note-btn',
  
  // Template selection
  TEMPLATE_OPTION: '.template-option, .note-template-item',
  
  // Note editor
  NOTE_EDITOR: '.note-editor, .treatment-note-form',
  QUESTION_CONTAINER: '.question-container, .form-question',
  
  // Diagnoses
  MORE_MENU: 'button:has-text("More"), .more-actions-btn',
  ADD_DIAGNOSIS_OPTION: 'text="Add Diagnosis"',
  DIAGNOSIS_MODAL: '.diagnosis-modal, .diagnosis-selector',
  DIAGNOSIS_SEARCH: '.diagnosis-search input',
  DIAGNOSIS_OPTION: '.diagnosis-option, .diagnosis-item',
  DONE_SELECTING: 'button:has-text("Done Selecting"), .done-btn',
  
  // Signature
  SIGNATURE_PAD: '.signature-pad canvas, [data-signature]',
  
  // Lock
  LOCK_BUTTON: 'button:has-text("Lock"), .lock-note-btn',
  LOCK_CONFIRM: 'button:has-text("Confirm")',
  LOCKED_INDICATOR: 'text="locked", .note-locked'
};
```

---

## Appendix B: Example Flow

```
1. User opens Epic Scribe /workflow
2. Selects patient "John Doe" (Moonlit Psychiatry)
3. System fetches prior note from IntakeQ API
4. User pastes transcript, clicks Generate
5. Epic Scribe generates note with Gemini
6. User reviews/edits, clicks "Finalize & Push to IntakeQ"
7. Playwright automation:
   a. Logs into IntakeQ
   b. Navigates to John Doe's profile
   c. Creates new treatment note from template
   d. Fills in each section (HPI, MSE, Plan, etc.)
   e. Adds diagnoses (F32.1, F41.1)
   f. Signs the note
   g. Locks the note
8. User sees success message with link to IntakeQ note
9. Note is ready for claims/superbills in IntakeQ
```
