# strong.work Implementation Roadmap

**From Epic Scribe → strong.work**
**Last updated:** 2026-03-19
**North Star:** Make psychiatrists feel good using technology. Everything else follows.

---

## How to Read This Document

This roadmap maps every promise on the strong.work landing page to concrete implementation work in the Epic Scribe codebase. It is organized by the landing page sections, each with a **Current State** (what exists today), **Gap Analysis** (what's missing), and **Implementation Plan** (how to close the gap).

The final section covers the **Multi-Tenant Path** — the technical work required to go from "Rufus's tool" to "a tool that works for the next 50 psychiatrists."

Priority labels:
- 🔴 **P0** — Blocks launch. Must be done before first external user.
- 🟡 **P1** — First 30 days post-launch. High-impact quality improvements.
- 🟢 **P2** — First 90 days. Differentiating features.
- 🔵 **P3** — Horizon. Planned but not yet blocking.

---

## Guiding Principles

**Ask these five questions before every implementation decision. If something doesn't trace back to #1, it doesn't ship.**

1. **Does this make the doctor feel good?** This is the Ruby principle. We exist to make psychiatrists feel good using technology. Everything else — efficiency, revenue, compliance — follows from this. If a feature is technically impressive but doesn't create a moment of delight, it's not ready.

2. **Does this make the note more ready to sign?** Every feature should reduce the time from "note generated" to "note signed." If it adds complexity or requires more physician editing, it's going the wrong direction.

3. **Does this widen the gap between strong.work and a generic scribe?** Doximity is free and decent. We need to be so specifically good for psychiatry that a psych resident would feel dumb for not using us. Every feature should make the generic scribe comparison more embarrassing.

4. **Is this the simplest version that delivers the delight?** Build the 80/20 first. Ship the prompt improvement before the video pipeline. Ship the manual score entry before the automated outcome tracker. The simplest version that creates the feeling is the right version to ship first.

5. **Can we ship this in a week or less? If not, what can we cut?** Velocity matters more than perfection at this stage. A good feature shipped this week beats a great feature shipped next month. Scope ruthlessly.

---

## Architectural Principle: Platform-Agnostic Core

strong.work does NOT depend on Google Workspace or any single vendor. The core value chain is:

```
Audio/Video Input → Transcript → Structured Clinical Note → Billing Intelligence → Outcome Tracking
```

Everything upstream (recording source) and downstream (EMR destination) is handled via adapters. This means:

- **Authentication:** NextAuth with Google OAuth as primary, email/magic-link as secondary. No Workspace dependency.
- **Database & Storage:** Supabase (database + file storage). Replaces Google Drive for recordings and documents.
- **Transcript Ingestion — Adapter Layer:**
  1. Built-in recording (browser MediaRecorder → Deepgram/Whisper transcription) — the native, zero-dependency path
  2. Paste transcript (what exists now — always available)
  3. Upload audio/video file (user drops .mp4/.m4a/.wav, server-side transcription)
  4. Google Meet import (optional connector for users on Google Workspace)
  5. Zoom import (future optional connector)
- **Note Generation:** Gemini 2.5 Pro (primary), with model-agnostic prompt architecture that could support other models
- **Video Analysis:** Gemini multimodal for clinical observation engine (see Workstream below)
- **Recording Storage:** Supabase Storage, encrypted at rest, configurable retention per provider (default: delete after note finalization)
- **Hosting:** Vercel (serverless) + optional async worker (Railway/Fly.io) for long-running tasks (transcription, video analysis)

Google integrations remain as optional connectors for Moonlit and users who want them. The core product works without them.

---

## 1. "Close the laptop. We've got the note."

### The Promise
The physician has a conversation with the patient. When it's over, the note is waiting — structured correctly, clinically detailed, requiring minimal edits. The physician is present during the encounter, not typing.

### Current State (updated 2026-03-19)
- Note generation works via `/flow` (renamed from `/workflow`): select patient → select setting × visit type → paste transcript or record via AudioRecorder → click Generate → review/edit → save
- Local Whisper transcription (v0): in-browser recording via AudioRecorder sends to local Whisper server, or CLI scripts for recording + transcription
- Multi-tenant provider isolation: each provider sees only their own patients/notes
- Gemini 2.5 Pro with automatic failover
- 15 templates across 7 settings with section-level editing
- Psychiatric prompt builder with section-specific temperature controls
- Therapy-specific prompt builder for BHIDC

### Gap Analysis (updated 2026-03-19)
Local Whisper transcription (v0) is built — the workflow now supports in-browser recording via AudioRecorder with local Whisper server, plus CLI recording scripts. The "paste transcript" path is still the most battle-tested. Remaining gaps: no ambient/background recording, no "note waiting for you" auto-generation after the visit ends, and no auto-detection of visit type from transcript cues.

### Implementation Plan

#### Phase 1: Better Transcription Pipeline 🔴 P0 --- PARTIALLY COMPLETE (2026-03-19)
**Goal:** Reduce friction from "I have audio" to "I have a note" to a single step.

1. **Local Whisper transcription (v0) --- COMPLETE (2026-03-19)**
   - Three integration paths built:
     - CLI: `scripts/record-visit.sh` + `scripts/transcribe-visit.py` (record + transcribe from terminal)
     - HTTP server: `scripts/whisper-server.py` (Flask on port 8765, receives audio, returns transcript)
     - UI: `AudioRecorder.tsx` records in-browser, sends to local Whisper server, health check indicator
   - HIPAA compliant by architecture — audio never leaves the device
   - BlackHole-2ch for telehealth speaker separation (installed, needs reboot)
   - Tested end-to-end with synthetic audio (3.9s transcription)
   - See CLAUDE.md "Local Whisper Transcription" section for full details

2. **Google Meet integration for telehealth** (deferred — local Whisper replaces this need)
   - Local Whisper works with ANY telehealth platform, no Workspace BAA needed
   - Google Meet integration is now optional, not required for launch

3. **One-click generation from transcript**
   - Once transcript is populated (manually or via recording), auto-select patient if calendar context exists
   - Auto-detect visit type from transcript cues (e.g., "first time seeing a psychiatrist" → Intake)
   - Reduce the workflow from 5 steps to: confirm patient → confirm visit type → Generate
   - File: `apps/web/src/components/workflow/` (all step components)

#### Phase 2: Ambient/Background Recording 🟢 P2
**Goal:** The note is genuinely "done before you are."

1. **Background recording mode**
   - Start recording when the encounter begins (manually or via calendar trigger)
   - Continue recording through the entire visit
   - When the physician clicks "End Visit," transcription and generation happen automatically
   - The note appears in the workflow already generated, ready for review

2. **Google Meet auto-capture**
   - For telehealth: detect when a Google Meet call ends via Calendar/Meet API
   - Automatically download recording, transcribe, and generate
   - Push notification (or workflow badge) when the note is ready

---

## 2. Mental Status Examination — The Deep Dive

### The Problem
The MSE is the weakest section of the generated note. It consistently gets appearance, affect, and behavior wrong because these are **visual observations**, not derived from what the patient says. Even transcript-derivable elements (mood, orientation, insight) are often inaccurate because the model doesn't understand the clinician's observational framework.

### Current State
- MSE prompt: generic instructions to "select SmartList options based on clinical observations ONLY"
- 11 SmartList categories: General Appearance, Behavior, Eye Contact, Affect, Mood, Speech, Thought Processes, Ideations, Hallucinations, Insight, Judgement
- Temperature: 0.2 (very low, which is correct for this section)
- The model frequently selects defaults or makes incorrect inferences about visual elements

### The 3-Phase Plan

#### Phase 1: Better MSE Prompt 🔴 P0
**Goal:** 80/20 improvement — dramatically better MSE from transcript alone by rewriting the prompt to teach the model what it can and cannot know.

**Key insight:** The MSE has two categories of data:
- **Inferable from transcript:** Mood (patient's stated mood), Speech (rate, volume, coherence — audible), Thought Process (linear, tangential — observable from speech patterns), Thought Content (SI/HI, delusions — stated), Ideations, Hallucinations (reported), Insight (demonstrated understanding), Judgment (decision-making quality)
- **NOT inferable from transcript alone:** General Appearance (dress, hygiene), Behavior (psychomotor activity, cooperation level), Eye Contact, Affect (range, congruence, reactivity — visual observation)

**New MSE prompt architecture:**

```
MENTAL STATUS EXAMINATION — SECTION-SPECIFIC INSTRUCTIONS

This section requires BOTH clinical observations AND transcript analysis.
You have access to the TRANSCRIPT. You do NOT have access to video.

FOR EACH MSE DOMAIN, follow the specific sourcing rules below:

APPEARANCE: 
⚠️ You CANNOT observe appearance from a transcript alone.
- If the transcript contains explicit clinician observations (e.g., "OBSERVATION: patient appears disheveled"), use those.
- If the transcript contains no appearance observations, output: "appropriately dressed and groomed" as the default.
- NEVER infer appearance from mood or diagnosis (e.g., do not assume "poor hygiene" because the patient is depressed).
- If video/visual data is provided in the VISUAL OBSERVATIONS section, use that instead.

BEHAVIOR:
⚠️ Partially observable from transcript.
- Cooperation level: Infer from how the patient engages (answers questions, provides details → "cooperative"; short answers, refuses → "guarded")
- Psychomotor: Can sometimes be inferred from speech patterns (long pauses → possible psychomotor slowing; rapid speech → possible agitation). Be conservative.
- Eye contact: CANNOT be determined from transcript. Default to "appropriate eye contact" unless visual data is provided.
- If video/visual data is provided, override defaults with observed behavior.

SPEECH:
✅ Directly observable from transcript.
- Rate: Infer from transcript density and flow (normal, rapid, slow)
- Volume: Can be noted if clinician comments on it; otherwise default to "normal volume"
- Tone: Infer from content and clinician observations
- Coherence: Directly observable from transcript quality
- Latency: Infer from response patterns if timestamps are available

MOOD:
✅ Directly from patient's own words.
- Use the patient's EXACT stated mood in quotes if they state it
- If no explicit mood statement, infer from overall emotional content
- Common: "depressed," "anxious," "fine," "okay," "irritable," "flat"
- Format: Patient's stated mood in quotes, e.g., mood is "flat" and "exhausted"

AFFECT:
⚠️ Partially observable — this is the CLINICIAN'S observation of emotional expression, NOT the patient's report.
- Range: Can be partially inferred (patient discusses multiple emotional topics with varying responses → "full range"; monotone throughout → "constricted")
- Reactivity: Infer from whether emotional expression changes in response to content (tears when discussing loss → "reactive")
- Congruence: Compare stated mood to observed emotional expression
- If video/visual data is provided, use that for more precise affect assessment.

THOUGHT PROCESS:
✅ Directly observable from transcript.
- Linear/goal-directed: Patient answers questions directly, stays on topic
- Tangential: Patient drifts from topic
- Circumstantial: Patient eventually returns to point but takes detours
- Disorganized: Responses don't logically connect
- Flight of ideas: Rapid shifting between loosely connected topics

THOUGHT CONTENT:
✅ Directly from transcript.
- Suicidal ideation: ONLY if explicitly discussed. State whether active/passive, with/without plan/intent.
- Homicidal ideation: ONLY if explicitly discussed.
- Delusions: ONLY if patient expresses delusional beliefs.
- Obsessions/preoccupations: Note if patient returns to specific themes repeatedly.
- If not discussed: "No suicidal or homicidal ideation expressed. No delusional content."

PERCEPTUAL DISTURBANCES:
✅ Directly from transcript.
- Hallucinations: ONLY if patient reports them. Specify modality (auditory, visual, etc.)
- If not discussed: "Denies hallucinations"

COGNITION:
✅ Partially from transcript.
- Orientation: Infer from contextual awareness in conversation
- Attention/concentration: Infer from ability to follow conversation, answer complex questions
- Memory: Note if patient reports memory concerns; do not formally test via transcript

INSIGHT:
✅ Inferable from transcript.
- Good: Patient recognizes they have a problem and need help
- Fair: Patient partially acknowledges difficulties
- Poor: Patient denies problems or attributes them entirely to external factors
- Base this on the patient's OWN statements about their condition

JUDGMENT:
✅ Inferable from transcript.
- Intact: Patient makes reasonable decisions (seeking help, following recommendations)
- Impaired: Patient makes risky decisions or refuses reasonable interventions
- Base on actual decision-making demonstrated in the encounter

OUTPUT FORMAT:
Generate each MSE domain as a brief phrase or sentence selecting from SmartList options where available. Use the wildcard (***) for additional clinical detail beyond SmartList values.

CRITICAL: When you cannot determine an MSE element from the transcript, USE THE DEFAULT/NORMAL VALUE. Do NOT fabricate observations. An MSE that says "normal" where you don't have data is clinically safer than one that guesses wrong.
```

**Files to modify:**
- `services/note/src/prompts/psychiatric-prompt-builder.ts` — Replace the `Mental Status Examination` entry in `SECTION_PROMPT_CONFIGS`

**Validation approach:**
- Run the updated prompt against 5-10 existing de-identified transcripts
- Compare MSE output to what you actually documented
- Track accuracy per domain (Appearance, Behavior, Speech, Mood, Affect, etc.)
- Target: >90% accuracy on transcript-derivable domains, 100% correct defaulting on non-observable domains

#### Phase 2: Video-Enhanced MSE via Telemedicine 🟢 P2
**Goal:** Use the video feed from Google Meet recordings to observe what the transcript cannot capture — appearance, behavior, eye contact, affect.

**Architecture:**
```
Google Meet Recording (video) 
  → Extract key frames (1 per 30 seconds + emotion-change detection)
  → Send frames to Gemini 2.5 Pro multimodal with MSE-specific prompt
  → Return structured visual observations:
      {
        appearance: "casually dressed in jeans and cardigan, adequate hygiene, appears fatigued",
        behavior: "psychomotor slowing noted, cooperative, mild fidgeting with hands",
        eyeContact: "intermittent, decreased when discussing mother",
        affect: {
          range: "constricted",
          reactivity: "reactive — tearful when discussing mother, brightened when discussing partner",
          congruence: "congruent with stated mood"
        }
      }
  → Inject into prompt as VISUAL OBSERVATIONS section
  → MSE prompt uses visual data to override defaults
```

**Implementation:**

1. **Google Meet recording retrieval**
   - Already have Google Drive integration (`apps/web/src/google-drive.ts`)
   - After a Meet call, recordings are saved to Drive automatically (if recording is enabled)
   - Add a service to detect and download Meet recordings for completed encounters
   - New service: `services/video-analysis/`

2. **Key frame extraction**
   - Use FFmpeg (available via npm `fluent-ffmpeg`) to extract frames
   - Strategy: 1 frame per 30 seconds baseline + additional frames when audio energy changes significantly (indicates emotional shift)
   - Output: array of timestamped JPEG frames
   - File: `services/video-analysis/src/frame-extractor.ts`

3. **Visual observation prompt**
   - Send frames to Gemini 2.5 Pro multimodal with a psychiatry-specific visual assessment prompt
   - Prompt instructs the model to observe ONLY: appearance, behavior, eye contact, affect
   - Returns structured JSON, not prose
   - File: `services/video-analysis/src/visual-mse-analyzer.ts`

4. **MSE prompt integration**
   - Add optional `visualObservations` field to `PromptBuilderOptions`
   - When visual data is present, inject it as a `VISUAL OBSERVATIONS` section before the MSE
   - MSE prompt already has instructions to use visual data when available (from Phase 1 prompt rewrite)
   - File: `services/note/src/prompts/prompt-builder.ts`, `psychiatric-prompt-builder.ts`

5. **Consent and recording UX**
   - Add a "Record this visit" toggle to the workflow UI (telemedicine visits only)
   - When enabled, trigger Google Meet recording via API
   - Display a consent notice: "This visit will be recorded for documentation purposes. Patient consent required."
   - Store consent status per encounter
   - File: `apps/web/src/components/workflow/GenerateInputStep.tsx`

**Existing recordings for fine-tuning:**
- Rufus has several existing Google Meet recordings of telemedicine visits
- These can be used to validate the visual observation prompt
- Process: extract frames → run visual MSE prompt → compare to actual MSE documented → iterate on prompt

**Privacy considerations:**
- Video frames are processed transiently (not stored)
- Only the structured text output (appearance, behavior, affect) is persisted
- The video itself is handled via Google Drive (already HIPAA-compliant with BAA)
- Frame extraction and analysis happen server-side (Vercel serverless or dedicated worker)

#### Phase 3: In-Person Visit Visual MSE 🔵 P3
**Goal:** Extend visual MSE capabilities to in-person visits.

**Hardware options to evaluate:**
- **Meta Ray-Ban Smart Glasses** — First-person POV recording, inconspicuous, but limited battery and may feel surveillance-y. Best for: clinician wearing them to capture patient-facing observations naturally.
- **iPad/tablet on desk** — Front-facing camera positioned to capture the patient during the visit. Simple, no special hardware. Drawback: can feel clinical/institutional.
- **Small webcam (e.g., Opal C1, Insta360 Link)** — High-quality, small form factor, can be positioned on a desk or shelf. Less obtrusive than a tablet.
- **iPhone on a stand** — Leverages existing hardware. Can use the same HealthKit Sync app architecture to record and upload.

**Recommended starting point:** iPad or iPhone on a desk stand with the camera facing the patient. Simple, uses existing hardware, and the recording can be uploaded to the same pipeline as Google Meet recordings.

**Implementation:**
- Build a simple recording interface (web or iOS) that captures video
- Same frame extraction + visual MSE analysis pipeline as Phase 2
- The only difference is the video source (local recording vs. Google Meet)
- Consent flow is critical: "This visit is being recorded for documentation purposes" must be clearly communicated

**Deferred decisions:**
- Ambient audio recording (microphone placement, echo, background noise)
- Multi-participant visits (family members, interpreters)
- Integration with in-room hardware (institutional settings vs. private practice)

---

## 2B. Clinical Observation Engine — The Moat

### The Vision

strong.work doesn't just transcribe what the patient says — it observes how they present. Starting with the MSE and expanding to AIMS-adjacent movement scoring, the Clinical Observation Engine is the feature that makes strong.work fundamentally different from any audio-only scribe. No competitor does this. The training data flywheel (labeled video:clinical-observation pairs) is the long-term competitive moat.

### Why This Matters Beyond MSE

1. **AIMS & movement assessment:** Psychiatrists are subpar at formal Abnormal Involuntary Movement Scale assessments. Most do an informal visual scan and document "no abnormal movements." This is medicolegally thin. A structured, timestamped, quantified movement analysis attached to every visit creates a defensible record that protects both physician and patient.

2. **Training data as moat:** Every time a psychiatrist corrects the AI's observation, they generate a labeled training example. After hundreds of visits, this dataset — paired video clips with expert clinical labels — is unique in psychiatry. It cannot be replicated by a competitor throwing GPT-4o at the problem, because they don't have the clinical labels.

3. **Longitudinal change detection:** Comparing this visit's movement scores to prior visits surfaces early signals — the slight perioral movement that's the first sign of tardive dyskinesia, the emerging akathisia, the subtle psychomotor decline. This is a clinical safety system, not just documentation.

### Training Architecture

**Critical insight: Do NOT fine-tune a foundation model with 30 examples.** 30 labeled video:MSE pairs is too few for meaningful fine-tuning of a multimodal model (which needs hundreds to thousands of examples). But 30 examples is *plenty* for the approach that actually matters at this stage: **evaluation-driven prompt engineering.**

The system has three layers that evolve as the dataset grows:

#### Layer 1: Labeling Tool (build now) 🔴 P0

A local application that runs on the Mac Mini. PHI never leaves the device.

**What it does:**
- Plays a video clip (60-300 seconds, trimmed from full visit recordings)
- Presents a structured form matching the target AI output:
  - **MSE domains:** Appearance, Psychomotor Activity, Eye Contact, Speech Characteristics, Affect (range, reactivity, congruence), Behavior
  - **AIMS-adjacent movement scoring:** Face (0-4), Lips/Perioral (0-4), Jaw (0-4), Tongue (0-4), Upper Extremities (0-4), Lower Extremities (0-4), Trunk (0-4), Global Severity (0-4), Patient Awareness (0-4)
  - **Free-text clinical notes:** Space for observations that don't fit structured fields
- Saves the pair (video clip filepath + structured labels) to a local SQLite database
- Tracks which clips have been labeled, which need review, and label quality metrics

**Implementation:**
- Python + Tkinter or Electron app — simple, local, no network calls
- SQLite database: `clips` table (filepath, duration, patient_id_hash, visit_date), `labels` table (clip_id, mse_json, aims_json, notes, labeled_at, labeled_by)
- Can also be a simple web app running on localhost (Next.js on the Mac Mini with local SQLite via better-sqlite3)
- **Start labeling immediately with the 30+ existing recordings**

**Data preparation for existing recordings:**
1. Trim each recording to 2-5 key clips per visit:
   - First 60 seconds (initial presentation, appearance)
   - A segment during emotionally charged discussion (affect reactivity)
   - Last 60 seconds (end-of-visit engagement)
   - Any segment where abnormal movements might be observable (patients on antipsychotics)
2. Use FFmpeg to extract clips: `ffmpeg -i full_recording.mp4 -ss 00:00:00 -t 00:01:00 -c copy clip_001.mp4`
3. Label each clip with the structured form
4. Cross-reference with the actual note that was written for that visit to validate labels

#### Layer 2: Evaluation Harness (build next) 🟢 P2

An automated system that measures how well the AI's observations match the clinician's labels. This is the engine that makes prompt engineering rigorous.

**What it does:**
- Takes each labeled video clip
- Sends it to Gemini 2.5 Pro multimodal with the current clinical observation prompt
- Compares the AI's structured output against the ground truth labels
- Produces a scorecard per clip and aggregate metrics

**Scoring methodology:**
- **AIMS numeric scores:** Exact match rate, mean absolute error per body region, Cohen's kappa for agreement
- **MSE categorical fields** (e.g., affect range: "constricted" vs "full"): Exact match rate, confusion matrix
- **MSE descriptive fields** (e.g., appearance description): Semantic similarity via embedding distance, or secondary LLM call: "Rate how clinically equivalent these two descriptions are on a 1-5 scale"
- **Overall scorecard:** Aggregate accuracy across all domains, broken down by domain and by clip

**Prompt iteration workflow:**
1. Run baseline prompt against all labeled clips → get scorecard
2. Identify weakest domain (e.g., affect reactivity accuracy is only 60%)
3. Modify prompt for that domain (add instructions, exemplars, constraints)
4. Re-run against all clips → new scorecard
5. If improved, keep. If not, revert. Repeat.
6. Track prompt versions with their scorecards in a version log

**Implementation:**
- Node.js or Python script that iterates over labeled clips
- Calls Gemini multimodal API (video input → structured JSON output)
- Compares against labels from Layer 1's SQLite database
- Outputs scorecard as Markdown or JSON
- **PHI consideration:** Video clips are sent to Gemini API under Google Cloud BAA. This is the same risk profile as sending transcripts for note generation (which is already happening). Only structured text output (not video) is persisted.

**File structure:**
```
services/clinical-observation/
  src/
    labeling-tool/          # Local labeling app
    evaluation/
      harness.ts            # Main evaluation runner
      scoring.ts            # Comparison logic (numeric, categorical, semantic)
      prompt-versions/      # Versioned prompts with scorecards
    analysis/
      video-mse-analyzer.ts # Gemini multimodal API call
      aims-scorer.ts        # AIMS-specific structured output
      frame-extractor.ts    # FFmpeg clip/frame extraction
    types.ts                # StructuredMSE, AIMSScore, EvaluationScorecard
```

#### Layer 3: Few-Shot Retrieval (when dataset hits 50-100 clips) 🟢 P2

Once the labeled dataset is large enough, stop using static exemplars in the prompt. Instead, dynamically retrieve the most relevant labeled examples for each new clip.

**How it works:**
- New video clip comes in for analysis
- System identifies relevant characteristics (e.g., patient appears agitated, or patient is on antipsychotics)
- Retrieves 3-5 of the most similar labeled clips from the database
- Includes them as few-shot examples in the Gemini prompt: "Here is how Dr. Sweeney scored these similar presentations. Now score this clip."
- The model's output is calibrated by real clinical judgment, not generic instructions

**Similarity matching:**
- Start simple: tag each labeled clip with metadata (primary diagnosis, medications, presentation type)
- Match on metadata first
- Later: use embedding similarity on the label descriptions for finer matching

#### Layer 4: Local Fine-Tuning (when dataset hits 200+ clips) 🔵 P3

At this scale, fine-tuning a smaller open-source vision-language model becomes viable.

**Why local:**
- PHI never leaves the Mac Mini / clinic hardware
- No dependency on cloud API for inference
- Zero marginal cost per analysis
- Physician controls their own model

**Model options:**
- **Qwen2.5-VL-7B** — Strong video understanding, runs on Apple Silicon with MLX
- **LLaVA-Video-7B** — Purpose-built for video understanding tasks
- Both can be fine-tuned with QLoRA on the Mac Mini (M4 Pro with 32-64GB unified memory), though training will be slow (hours per epoch, not minutes)

**Fine-tuning approach:**
- Dataset: 200+ labeled video clips with structured MSE/AIMS outputs
- Method: QLoRA (quantized low-rank adaptation) to minimize memory requirements
- Evaluation: Hold out 20% of labeled clips for validation, compare fine-tuned model accuracy against the Gemini prompt-engineering baseline
- If the local model matches or exceeds Gemini on the specific task, it becomes the primary inference path (PHI-safe, free, fast)

**Training pipeline on Mac Mini:**
- Use `mlx-lm` (Apple's ML framework optimized for Apple Silicon) or `transformers` + `bitsandbytes` with MPS backend
- Convert labeled data to the model's expected format (video frames + structured JSON labels)
- Train with QLoRA, monitor loss and validation accuracy
- Export fine-tuned adapter weights

#### Layer 5: Network Effect (long-term) 🔵 P3

When strong.work has multiple psychiatrists using the Clinical Observation Engine:

1. Each psychiatrist can opt in to contributing their label corrections back to the shared dataset
2. Labels are de-identified before leaving the physician's device (only structured text labels, never video)
3. The shared dataset grows across the entire user base
4. Periodic re-training of the local model incorporates the broader dataset
5. Every physician's model improves because of every other physician's corrections

This is the flywheel: more users → more labeled data → better model → more accurate observations → more users trust it → more corrections → better model.

### Immediate Next Steps for Clinical Observation Engine

1. **Today:** Start trimming existing recordings into 60-300 second clips (use FFmpeg)
2. **This week:** Build the labeling tool (local app on Mac Mini)
3. **Next week:** Label the first 10 clips with structured MSE + AIMS scores
4. **Week after:** Build the evaluation harness and run the first prompt iteration cycle
5. **Ongoing:** Label 2-3 clips per week from new clinical encounters. Dataset grows passively.

**IMPORTANT: Start collecting video clips now, even before the analysis pipeline is built.** Every telemedicine recording saved (with consent) is future training data. Storage is cheap. Labeled clinical data is priceless.

---

## 3. "Like finding money in your coat pocket." — Listening Coder

### The Promise
Every visit, the Listening Coder suggests the highest-reimbursing clinically defensible code combination — tuned to the patient's payer, backed by documentation, with reasoning spelled out.

### Current State
- Listening Coder v0 appends CPT suggestions after note signature
- Payer-aware when fee schedule data is present (`PayerFeeSchedule` type exists)
- Supports: E/M codes (99204/99205/99213-99215), psychotherapy add-ons (90833/90836/90838), G2211 complexity add-on, 99051 after-hours, 96127 behavioral assessment
- Static fallback rules when no fee schedule data available
- Known issue: suggests 90792 for intakes (should default to E/M)
- Fee schedule data stored in Supabase

### Gap Analysis
- Fee schedule data only exists for a handful of Utah payers
- No ERA/EOB ingestion — the system doesn't learn from actual claim outcomes
- No denial pattern detection
- No prior auth awareness
- No appeal letter generation

### Implementation Plan

#### Phase 1: Complete Utah Fee Schedule Coverage 🔴 P0
1. Ensure fee schedules are loaded for all current Moonlit payers:
   - FFS Medicaid (Utah DHHS)
   - Molina
   - SelectHealth
   - Healthy U (UofU Health Plans)
   - Optum (pending contract)
2. Validate the existing fee schedule extraction system (Python scripts from earlier work)
3. Ensure every Moonlit patient has payer → fee schedule linkage
4. **Files:** Supabase `payer_fee_schedules` table, `services/note/src/prompts/prompt-builder.ts` (fee schedule injection)

#### Phase 2: ERA/EOB Ingestion 🟢 P2
1. Parse 835 ERA files from Office Ally
2. Build `claim_outcomes` table: payer, CPT code, billed, allowed, paid, denial reason, date
3. Listening Coder queries historical outcomes: "Molina has paid 99205 for intakes 12/12 times"
4. Surface denial patterns: "SelectHealth denied 90792 3 times in Q4"
5. **New service:** `services/billing-intelligence/`

#### Phase 3: Proactive Billing Agent 🔵 P3
1. Pre-submission claim review (flag likely denials)
2. Appeal letter generation using clinical note + denial reason
3. Prior auth awareness (which payers require it for which codes)
4. Revenue dashboard (expected vs. actual reimbursement)

---

## 4. "We've already done the chart biopsy." — Clinical Context

### The Promise
Before the visit starts, the system surfaces a pre-visit brief: medication trajectory, PHQ-9 trends, what changed since last visit, what to ask about. Not a list of facts — a narrative.

### Current State
- HealthKit integration: FHIR R4 clinical data (meds, labs, conditions, vitals, allergies) from Apple Health
- QR code patient pairing with iOS app
- Background sync
- Structured patient profiles (`StructuredPatientProfile` type) with diagnoses, medications, psychiatric history, social history, substance use, treatment themes
- Longitudinal chart data with PHQ-9/GAD-7 trends
- Prior note import via clipboard
- IntakeQ integration (read + write paths)

### Gap Analysis
- No **pre-visit brief** UI — the data enriches the note but the physician doesn't see a summary before the visit
- No medication trajectory visualization (dose changes over time)
- No automatic "what changed since last visit" detection
- HealthKit data is only available for patients who pair via iOS app (penetration dependent on patient adoption)

### Implementation Plan

#### Phase 1: Pre-Visit Brief 🟡 P1
1. **New component:** `apps/web/src/components/patient/PreVisitBrief.tsx`
2. When a physician opens a patient's page or starts the workflow, display:
   - Current medications with dose history (started, increased, decreased)
   - Last PHQ-9 and GAD-7 scores with trend arrow (↑ ↓ →)
   - Key changes since last visit (new medications, dose changes, new diagnoses)
   - Open items from last plan (e.g., "planned to increase sertraline if no improvement")
   - Billing reminder: "96127 eligible if PHQ-9/GAD-7 administered"
3. Data sources: `patient_profiles` table, `patient_clinical_data` table, `generated_notes` table
4. **Files:** New component + new API route `apps/web/app/api/patients/[id]/brief/route.ts`

#### Phase 2: Medication Timeline Visualization 🟢 P2
1. Visual timeline showing medication changes over time
2. PHQ-9/GAD-7 overlay on the timeline
3. Goal: physician can see at a glance "sertraline went up, PHQ-9 went down"
4. React component using Recharts (already available in artifacts)

---

## 5. "Your patients say nothing's changed. Your data says otherwise." — Practice-Based Evidence

### The Promise
Physicians can tag interventions, track outcomes across their patient panel, and generate evidence that their treatments are working. N-of-1 and small-cohort outcome tracking built into the workflow.

### Current State
- PHQ-9 and GAD-7 scores are captured per encounter (`PatientQuestionnaireHistory`)
- Longitudinal trends are computed (`LongitudinalChartData`)
- Structured patient profiles track diagnoses and medication responses
- No intervention tagging
- No cohort-level analysis
- No outcome visualization for patients

### Implementation Plan

#### Phase 1: Intervention Tagging 🟢 P2
1. **New concept:** `TaggedIntervention` — a specific clinical decision the physician wants to track
   - Example: "Started pramipexole 0.5mg for anhedonia"
   - Fields: patient_id, intervention_description, medication (optional), target_symptom, start_date, tagged_by_provider
2. UI: After saving a note, option to "Tag an intervention" — lightweight modal
3. **Supabase table:** `tagged_interventions`

#### Phase 2: Outcome Tracking Dashboard 🟢 P2
1. **New page:** `/outcomes` or `/evidence`
2. Show all tagged interventions with longitudinal outcome data
3. Per-intervention view: timeline of relevant scores (PHQ-9, GAD-7, custom scales)
4. Cohort view: "All patients on pramipexole for anhedonia" — aggregate trend
5. Export: CSV or simple report for sharing

#### Phase 3: Patient-Facing Outcome Sharing 🔵 P3
1. Generate a simple, patient-friendly graph showing their progress
2. Shareable via secure link or printable PDF
3. "Your PHQ-9 has improved from 18 to 10 over 12 weeks"
4. This is a therapeutic intervention, not just a feature

---

## 6. "An unhealthy obsession with privacy." — Trust

### Current State
- NextAuth with Google OAuth
- Supabase RLS policies
- HIPAA-compliant Google Workspace (shared calendar, Drive)
- No PHI in code/logs
- HealthKit sync via bearer token
- IntakeQ credentials stored per-provider in DB
- Browserbase for serverless browser automation (IntakeQ push)

### Gap Analysis for Multi-Tenant (updated 2026-03-19)
- Provider isolation COMPLETE (2026-03-19) — each provider's data is fully scoped
- Need formal BAA with Supabase (verify status)
- Need formal BAA with Vercel (verify status)
- Need audit logging (who accessed what, when)
- Need data retention policies
- Need explicit consent tracking per patient

### Implementation Plan

#### Phase 1: Audit Trail 🔴 P0
1. Log all note generation events: who, when, which patient, which template
2. Log all data access: patient record views, note exports, IntakeQ pushes
3. **Supabase table:** `audit_log` with provider_id, action, resource_type, resource_id, timestamp

#### Phase 2: Consent Management 🟡 P1
1. Track recording consent per encounter (for video MSE feature)
2. Track HealthKit data sharing consent per patient
3. UI indicators showing consent status

---

## 7. Multi-Tenant Path

### The Promise
strong.work works for any psychiatry resident or attending, not just Rufus.

### Current State (updated 2026-03-19)
**Provider isolation is COMPLETE.** Multi-tenant provider accounts shipped 2026-03-19:
- `es_providers` table (migration 025) with auto-provisioning on first Google sign-in
- `patients.provider_id` FK (migration 026) — all patients scoped to their provider
- `requireProviderSession()` auth helper used by all ~50 API routes
- `verifyPatientOwnership()` for child table access (notes, encounters, clinical data, profiles)
- Verified: new Google sign-in gets zero patients (clean slate), existing user sees their own data
- Templates, SmartLists, and fee schedules remain global (shared across providers)

Settings are still hardcoded, templates are still in code, SmartList IDs are UofU-specific, fee schedules are Utah-specific. These are the remaining multi-tenant gaps.

### Implementation Plan

#### Phase 1: Provider Accounts 🔴 P0 --- COMPLETE (2026-03-19)
~~1. Auth: Extend NextAuth to create a providers record on first login~~
~~2. Data scoping: Add provider_id to all tables~~
~~3. RLS policies: Ensure every query is filtered by provider ID~~

All done. See CLAUDE.md "Multi-Tenant Provider Isolation" section for full details.

#### Phase 2: Templates as Data 🔴 P0
1. **Migrate templates from code to database**
   - New Supabase table: `templates` with provider_id, setting, visit_type, sections (JSONB), is_default
   - Seed with Rufus's current templates as the "strong.work default" set
   - On new provider signup, copy the default templates into their workspace
2. **Template service reads from DB**
   - Modify `services/note/src/templates/template-service.ts` to query Supabase
   - Fall back to in-memory defaults if DB query fails
3. **Settings and visit types as data**
   - New Supabase table: `provider_settings` with provider_id, setting_name, visit_types (JSONB)
   - Seed new providers with generic defaults: "Outpatient Clinic," "Telehealth," "Inpatient Consult"
   - UI for providers to add/edit their settings

#### Phase 3: SmartList Portability 🟡 P1
1. **Plain text mode:** For non-UofU providers, generate notes with plain text values instead of SmartList formatting
   - The note quality is identical — just no `{Display:EpicID}` syntax
   - This is actually simpler and works for any EMR, not just Epic
2. **Epic SmartList mapping (future):** Per-institution SmartList ID configuration
   - Only needed when a provider wants Epic-native SmartList integration
   - Can be deferred until demand exists

#### Phase 4: Onboarding Flow 🟡 P1
1. **New provider signup:**
   - Create account (Google OAuth)
   - "What's your clinical setting?" — seeds default settings
   - "What EMR do you use?" — configures output format (Epic SmartTools vs. plain text)
   - "What state do you practice in?" — enables future fee schedule matching
   - Copy default templates into their workspace
2. **First note experience:**
   - Guided walkthrough of the workflow
   - Pre-loaded de-identified sample transcript (same one from the landing page demo)
   - "Try generating a note — this is what it looks like"

---

## 8. Note Quality — Section-by-Section Improvement Plan

This section catalogs known quality issues in each note section and the planned improvements. Each is a manageable, testable unit of work.

### HPI 🟡 P1
**Current:** Generally good. Detailed narrative with temporal course.
**Known issues:**
- Occasionally over-condenses when transcript is very long (>60 min)
- Sometimes misses subtle clinical details that are mentioned once
**Fix:** Add instruction to preserve ALL clinical details mentioned, even if only once. Add a minimum length floor based on transcript length.

### Psychiatric History 🟡 P1
**Current:** Safety-critical section with explicit "never infer" guardrails.
**Known issues:**
- Sometimes fails to distinguish between suicidal ideation and suicide attempts
- Occasionally includes inferred hospitalizations despite instructions not to
**Fix:** Add explicit negative examples to the prompt: "The patient saying 'I was in a dark place' does NOT imply a hospitalization. The patient saying 'things got really bad' does NOT imply a suicide attempt."

### Psychiatric Review of Systems ✅
**Current:** Good. SmartList-driven, consistent.
**Known issues:** Minor — occasionally selects a non-default option without clear transcript support.
**Fix:** Lower temperature to 0.15. Add instruction: "When uncertain, select the default or 'Denies' option."

### MSE 🔴 P0
**See Section 2 above.** This is the priority deep-dive.

### Risk Assessment 🟡 P1
**Current:** Generally good for intakes. Sometimes thin for follow-ups.
**Known issues:**
- Follow-up risk assessments sometimes just say "risk factors unchanged from prior visit"
- Doesn't always catch subtle risk factor changes (e.g., new job loss mentioned in passing)
**Fix:** For follow-ups, explicitly instruct: "Identify any NEW risk factors or CHANGES to existing risk factors since the prior visit. Do not simply state 'unchanged.' Actively scan the transcript for new stressors, losses, or changes in ideation."

### Formulation / Assessment 🟡 P1
**Current:** 4-paragraph structure for intakes, 2-paragraph for follow-ups. Generally strong.
**Known issues:**
- Paragraph 2 (biopsychosocial) sometimes has weak "social" domain
- Paragraph 3 (differential) sometimes lists differentials without specific reasoning
- Follow-up assessments sometimes too brief
**Fix:** Add stronger examples of each paragraph. For the social domain, add: "Social factors must include specific details from the transcript — not generic statements like 'psychosocial stressors.' Reference specific stressors, relationships, employment, housing, or financial issues discussed."

### Plan 🟡 P1
**Current:** 5-subsection structure. Generally good.
**Known issues:**
- "Therapy" subsection sometimes lacks specificity about techniques used
- Follow-up medication section sometimes doesn't clearly indicate which meds are unchanged vs. changed
- Timestamps from transcript not always included in therapy section
**Fix:** Add more explicit examples for the therapy subsection. For follow-ups, add: "List EVERY current medication, even unchanged ones. Format: 'Continue [med] [dose] [frequency]' for unchanged, '[Action] [med] [dose] for [reason]' for changes."

### Listening Coder ✅
**Current:** Good when fee schedule data is present. Generic but functional without it.
**Known issues:**
- Sometimes suggests 90792 for intakes (known issue, documented in CLAUDE.md)
- Time estimation from transcript timestamps is occasionally off
**Fix:** Already addressed in prompt. Validate fix with test cases.

---

## 9. Implementation Priority Matrix

| Phase | Work Item | Priority | Effort | Dependencies |
|-------|-----------|----------|--------|--------------|
| **Now** | MSE prompt rewrite (Phase 1) | 🔴 P0 | 1 day | None |
| **Now** | Trim existing recordings into clips (FFmpeg) | 🔴 P0 | 1 day | Access to recordings |
| **Now** | Build labeling tool (local Mac Mini app) | 🔴 P0 | 2 days | None |
| **Now** | Label first 10 clips with MSE + AIMS scores | 🔴 P0 | 2 days | Labeling tool |
| ~~**Now**~~ | ~~Provider accounts + data scoping~~ | ~~🔴 P0~~ | ~~3 days~~ | DONE 2026-03-19 |
| **Now** | Templates to database | 🔴 P0 | 3 days | Provider accounts |
| **Now** | Plain text output mode | 🔴 P0 | 1 day | Templates to DB |
| **Now** | Audit trail | 🔴 P0 | 1 day | Provider accounts |
| **Now** | Utah fee schedule coverage | 🔴 P0 | 2 days | None |
| ~~**Now**~~ | ~~Audio recording in workflow (Local Whisper v0)~~ | ~~🔴 P0~~ | ~~2 days~~ | DONE 2026-03-19 |
| **Week 2-3** | Evaluation harness (prompt vs. labels scoring) | 🟡 P1 | 3 days | 10+ labeled clips |
| **Week 2-3** | First prompt iteration cycle (3-5 versions) | 🟡 P1 | 2 days | Evaluation harness |
| **Week 2-3** | Onboarding flow | 🟡 P1 | 3 days | Provider accounts, templates |
| **Week 2-3** | SmartList plain text mode | 🟡 P1 | 1 day | Templates to DB |
| **Week 2-3** | Pre-visit brief | 🟡 P1 | 3 days | Patient profiles |
| **Week 2-3** | HPI/Formulation/Plan prompt improvements | 🟡 P1 | 2 days | None |
| **Week 2-3** | Risk assessment follow-up improvement | 🟡 P1 | 1 day | None |
| **Week 2-3** | Consent management | 🟡 P1 | 1 day | Provider accounts |
| **Month 2** | Video-enhanced MSE (telemedicine via Gemini multimodal) | 🟢 P2 | 5 days | Evaluation harness, Google Meet |
| **Month 2** | Few-shot retrieval for clinical observation (50+ clips) | 🟢 P2 | 3 days | Growing labeled dataset |
| **Month 2** | AIMS-adjacent structured movement scoring | 🟢 P2 | 3 days | Video MSE pipeline |
| **Month 2** | ERA/EOB ingestion | 🟢 P2 | 5 days | Fee schedules |
| **Month 2** | Intervention tagging + outcome dashboard | 🟢 P2 | 5 days | Patient profiles |
| **Month 2** | Medication timeline visualization | 🟢 P2 | 3 days | Pre-visit brief |
| **Month 2** | Google Meet auto-capture | 🟢 P2 | 3 days | Audio recording |
| **Month 3+** | Longitudinal movement change detection | 🔵 P3 | 3 days | AIMS scoring + history |
| **Month 3+** | Local fine-tuning (200+ clips, Qwen2.5-VL-7B on Mac Mini) | 🔵 P3 | TBD | 200+ labeled clips |
| **Month 3+** | In-person video MSE | 🔵 P3 | TBD | Video MSE telemedicine |
| **Month 3+** | Network effect (opt-in label sharing across users) | 🔵 P3 | TBD | Multi-tenant + local model |
| **Month 3+** | Proactive billing agent | 🔵 P3 | TBD | ERA/EOB |
| **Month 3+** | Patient-facing outcome sharing | 🔵 P3 | TBD | Outcome dashboard |
| **Month 3+** | Prior auth automation | 🔵 P3 | TBD | Billing intelligence |

---

## 10. First External User Checklist

Before the first psychiatry resident outside of Rufus uses strong.work, these must be true:

- [x] Provider signup creates an isolated workspace (DONE 2026-03-19 — auto-provisioning via `getOrCreateProvider()`)
- [ ] Default templates are seeded on signup (Rufus's templates as starting kit)
- [ ] Notes generate in plain text (no Epic SmartList formatting) for non-UofU users
- [ ] MSE prompt rewrite is deployed and validated
- [ ] Listening Coder works without fee schedule data (generic CPT guidance)
- [x] Audio recording in browser works (DONE 2026-03-19 — Local Whisper v0 with AudioRecorder UI + server health check)
- [ ] Audit trail logs all note generation and data access
- [ ] Landing page (strong.work) is live with the head-to-head demo
- [ ] Waitlist form captures email, program, and pain point
- [ ] At least 3 psychiatry residents at non-UofU programs have expressed interest
- [ ] Clinical Observation Engine: 10+ clips labeled, evaluation harness built, baseline scorecard established
- [ ] Clinical Observation Engine: at least 1 prompt iteration cycle completed with measurable improvement

---

## Appendix: Current File Map (Key Files to Modify)

| File | Purpose | Likely Modifications |
|------|---------|---------------------|
| `services/note/src/prompts/psychiatric-prompt-builder.ts` | Section-level prompt configs | MSE rewrite, all section improvements |
| `services/note/src/prompts/prompt-builder.ts` | Main prompt compiler | Visual MSE injection, fee schedule flow |
| `packages/types/src/index.ts` | All TypeScript types | New types for interventions, audit, providers, StructuredMSE, AIMSScore |
| `apps/web/src/components/workflow/GenerateInputStep.tsx` | Workflow input UI | Audio recording, consent toggle, Quick MSE Notes field |
| `apps/web/src/components/workflow/NoteResultsStep.tsx` | Note output UI | Intervention tagging |
| `apps/web/app/api/generate/route.ts` | Note generation API | Provider scoping (DONE), visual MSE injection |
| `supabase/COMPLETE_SCHEMA.sql` | Database schema | New tables: ~~providers~~ (DONE: `es_providers`), audit_log, tagged_interventions, templates |
| `configs/template-mapping.json` | Template ID mappings | Migrate to DB |
| `services/note/src/templates/template-service.ts` | Template loading | Read from DB |
| `services/clinical-observation/` | **NEW** — Clinical Observation Engine | Labeling tool, evaluation harness, video analysis, AIMS scoring |
| `services/clinical-observation/src/labeling-tool/` | **NEW** — Local labeling app | Mac Mini, SQLite, structured MSE/AIMS forms |
| `services/clinical-observation/src/evaluation/` | **NEW** — Prompt evaluation harness | Scoring, prompt version tracking, scorecards |
| `services/clinical-observation/src/analysis/` | **NEW** — Video analysis pipeline | Gemini multimodal calls, frame extraction, structured output |
| `scripts/whisper-server.py` | Local Whisper HTTP server (DONE) | Flask on port 8765, receives audio, returns transcript |
| `scripts/record-visit.sh` | CLI recording wrapper (DONE) | Records via ffmpeg, auto-transcribes on Ctrl+C |
| `scripts/transcribe-visit.py` | CLI transcription (DONE) | Splits channels, runs Whisper, merges labeled transcript |

---

*This document is a living roadmap. Update it as features ship, priorities shift, and new insights emerge from user feedback.*

*"Does this make the doctor feel good?" — If you can't answer yes, don't ship it.*

*"Technology that remembers you became a doctor for a reason."*
