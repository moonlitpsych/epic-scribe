# Epic Scribe — Technical Roadmap & Satisfaction Criteria (v1.2)

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Dev Mode:** Claude Code primary, Gemini (Vertex) runtime
**Doc Purpose:** Unambiguous execution contract for an LLM‑assisted build (no scope drift).
**Context Inputs:** RCC Intake dotphrase template; RCC Intake Complete LLM Prompt; de‑identified transcript; SmartTools strategy (SmartLinks/DotPhrases, Wildcards, SmartLists).

---

## 0) North Star & Non‑Goals

**North Star:** Generate Epic‑ready psychiatry notes that *intentionally* leverage Epic SmartTools, require <5 minutes of edits, and paste into Epic with zero formatting fixes.

**Non‑Goals (Phase 1):** EHR integration/writeback, multi‑user tenancy, mobile apps, real‑time diarization, non‑Epic EMRs, automatic ICD/CPT assignment.

---

## 1) Scope (Phase 1 MVP)

1. **SmartTools Engine**: parse/validate/transform SmartLinks→DotPhrases; preserve Wildcards (***) and SmartLists `{Display:ID}`; enforce legal option sets.
2. **Template System**: 12 templates (4 settings × 3 visit types), versioned, editable w/o code changes.
3. **Dynamic Prompt Builder**: assemble system+task+template+SmartLists+transcript (+previous note for FU/TOC) into a single prompt string.
4. **LLM Runtime**: Gemini via Vertex AI (HIPAA‑eligible) with retry/backoff; redact logs.
5. **Operator UI (MVP)**: minimal web app to pick template, paste transcript, generate note, copy to clipboard. Basic JSON/CSV import for SmartLists.

**Stretch (Phase 1.1):** JSON SmartList editor, import/export; template preview; section‑level regen.

---

## 2) Acceptance Criteria ("Satisfaction Criteria")

### 2.1 Functional

* **F1. Epic Compatibility:** 100% of SmartLinks in templates render as DotPhrases in output (e.g., `@lastvitals@` → `.lastvitals`).
* **F2. SmartLists:** For every `{Display:ID}` placeholder present in a template, the output includes `{"Display:ID:: \"selected\""}` where `selected` ∈ valid options (strict set match).
* **F3. Wildcards:** `***` placeholders are replaced with transcript‑derived prose **unless** transcript lacks data; in that case, the literal `***` remains.
* **F4. Structure:** All template section headers preserved in order; no extra or missing required sections.
* **F5. Prose‑only:** No bullets, no numbered lists, no rogue spacing; paragraphs only.

### 2.2 Quality

* **Q1. Edit Time:** Median clinician edit time per note ≤ **5 minutes** on a set of 20 de‑identified transcripts.
* **Q2. Clinical Usability:** ≥ **80%** of generated notes rated "clinically usable with minor edits" (Likert ≥4/5).
* **Q3. SmartList Validity:** **100%** of SmartList selections are from the provided option sets (validator enforced).
* **Q4. Hallucination Guard:** Zero fabricated vitals, labs, meds, diagnoses that aren’t in transcript/template inputs.

### 2.3 Performance & Reliability

* **P1. Latency:** Note generation completes in **< 30s** for a 30‑minute transcript.
* **P2. Stability:** End‑to‑end success (no hard failure) in **≥ 95%** of runs across 20 test transcripts.

### 2.4 Security/Compliance

* **S1. HIPAA Guardrails:** No PHI in application logs; API calls via Vertex AI endpoints only; documented BAA checklist.
* **S2. Encryption:** If persistent storage is used, PHI columns are AES‑256 encrypted (pgcrypto) with keys outside DB.

**Definition of Done (Phase 1):** All F*, Q*, P*, S* above satisfied and validated in the test plan; demo includes paste into Epic with zero formatting cleanup.

---

## 3) Inputs Needed from Owner (Blockers to "Done")

1. **SmartList Option Catalog** for RCC Intake (and other templates): for each `{Display:EpicID}`, provide the **discrete option set** (CSV or JSON).
2. **The 12 Templates** (names + text) or confirmation to derive from existing dotphrases.
3. **Model/Endpoint Choices** (Vertex region, model version) and **GCP project** to target.

> Delivery format examples are provided in §7.3.

---

## 4) System Design (Phase 1)

### 4.1 Data (MVP)

* **Template**: id, name, setting, visit_type, version, sections[], smarttools[].
* **SmartList**: id, identifier, epic_id, display_name, options[{value, order, is_default}].
* **SmartLink** (for Phase 4 but referenced now): identifier, display_name, `@id@`, `.id`, description, category.

### 4.2 SmartTools Engine

* **Parser**: extract SmartLinks (`@[^@]+@`), DotPhrases (`\.[A-Za-z0-9_]+`), Wildcards (`\*\*\*`), SmartLists (`\{[^}]+:[0-9]+\}`).
* **Transformer**: SmartLinks → DotPhrases (preserve case); maintain spacing rules.
* **Validator**: (a) all SmartLists present have option sets; (b) output SmartList values ∈ allowed set; (c) disallow bullets/numbering; (d) forbid extra/unrecognized SmartTools.

### 4.3 Prompt Builder (Contract)

Prompt = SYSTEM + TASK + **SMARTTOOLS INSTRUCTIONS** + **TEMPLATE** + **(PREVIOUS NOTE?)** + **TRANSCRIPT**.
Key rules embedded:

* Convert all `@id@` → `.id` in final output.
* Preserve `{Display:EpicID}` and emit `::{"selected"}` suffix.
* Replace `***` with transcript content, else keep `***`.
* No lists; concise clinical prose; do not invent data.

### 4.4 LLM Client

* Vertex AI GenerateContent; exponential backoff; idempotent retries; trace id; redact PHI from logs.

---

## 5) Operator Workflow (MVP)

1. Choose **Setting × Visit Type**.
2. Paste **Transcript**; (optional) paste **Previous Note** for FU/TOC.
3. Click **Generate Note** → output appears with copy‑to‑clipboard.
4. Any field flagged invalid (SmartList mismatch) is highlighted with a fix‑up suggestion.

---

## 6) SmartLink Library (Phase 4 foundation now)

### 6.1 Why it matters now

* Even in Phase 1, we convert `@id@`→`.id`. A central catalog ensures consistent usage and explains what each SmartLink pulls.

### 6.2 Phase 1 hooks (no UI yet)

* Seed a minimal SmartLink registry JSON used by the prompt builder to show **3 example conversions** inside the SMARTTOOLS section.

### 6.3 Phase 4 Deliverable (Intent Engine)

* **Catalog**: ≥100 U of U SmartLinks with description, category, both formats.
* **Semantic Search**: NL query → top 1–3 SmartLinks in <2s.
* **Explainability**: each suggestion includes what it fetches and copy‑ready `@id@` & `.id`.
* **Template/Editor integration**: insert at cursor; usage analytics; favorites.

**Phase 4 Acceptance:** ≥80% of queries judged "helpful" by clinician; median suggestion time <2s.

---

## 7) Concrete Artifacts for Claude Code to Build

### 7.1 Repo Skeleton

```
apps/
  web/ (Next.js/TS) — MVP UI
services/
  note/ (FastAPI) — prompt builder, SmartTools engine, LLM client
  shared/ — models, validators
infra/
  gcp/ — Vertex config, least‑privileged scopes doc
tests/
  e2e/, unit/
CLAUDE.md (this file)
SMARTLISTS.sample.json
TEMPLATES.sample.json
```

### 7.2 Issue Backlog (copy/paste into tracker)

* feat(smarttools): implement parser/validator/transformer (+unit tests)
* feat(prompt): PromptBuilder.build(template, transcript, prevNote?)
* feat(llm): Vertex client w/ retries & redaction
* feat(ui): Minimal generator (template select, transcript input, copy)
* chore(ci): test + lint + typecheck workflow
* chore(security): logging redaction + BAA checklist checklist
* test(e2e): 20‑transcript harness + metrics capture (latency, edits)

### 7.3 Data Contracts

**SmartLists JSON**

```json
[
  {
    "identifier": "BH None/Other",
    "epicId": "304120103",
    "displayName": "BH None/Other",
    "options": [
      { "value": "None", "order": 1, "is_default": true },
      { "value": "1 hospitalization", "order": 2 },
      { "value": "2 hospitalizations", "order": 3 },
      { "value": "3+ hospitalizations", "order": 4 },
      { "value": "Details in note", "order": 5 }
    ]
  }
]
```

**Templates JSON (excerpt)**

```json
[
  {
    "name": "RCC Intake",
    "setting": "Resident Continuity Clinic",
    "visitType": "intake",
    "version": 1,
    "sections": [
      { "order": 1, "name": "UNIVERSITY HEALTHCARE", "content": "…" },
      { "order": 2, "name": "Chief Complaint", "content": "@RFV@" },
      { "order": 3, "name": "History (HPI)", "content": "***" }
      // … rest of sections from dotphrase
    ],
    "smarttools": [
      { "type": "smartlink", "identifier": "FNAME", "placeholder": "@FNAME@", "description": "First name" },
      { "type": "smartlist", "smartListId": "BH None/Other", "placeholder": "{BH None/Other:304120103}", "description": "Dropdown" }
    ]
  }
]
```

---

## 8) Prompt Contract (copy into runtime)

```
ROLE
You are a HIPAA‑compliant clinical documentation assistant for Dr. Rufus Sweeney.

TASK
Draft an Epic‑ready psychiatry note using the TEMPLATE and TRANSCRIPT. Obey SMARTTOOLS INSTRUCTIONS.

SMARTTOOLS INSTRUCTIONS
- Convert all @identifier@ → .identifier in the final note output.
- Preserve all SmartLists exactly as {Display:EpicID} and append :: "selected" using ONLY allowed options.
- Replace *** with transcript‑derived prose; if unknown, keep ***.
- Output uses paragraphs only (no bullets/numbers). Keep section headers and order intact.
- Do not invent vitals/labs/meds/diagnoses not present in inputs.
- Examples of SmartLink→DotPhrase:
  @FNAME@ → .FNAME
  @LNAME@ → .LNAME
  @lastvitals@ → .lastvitals

TEMPLATE
<<<PASTE TEMPLATE TEXT HERE>>>

PREVIOUS_NOTE (optional)
<<<PASTE PREVIOUS NOTE HERE>>>

TRANSCRIPT
<<<PASTE TRANSCRIPT HERE>>>
```

---

## 9) Test Plan (sign‑off gate)

1. **Seed** 20 de‑identified transcripts spanning intake/follow‑up/TOC; short/long; with/without labs.
2. **Run** generation; capture latency, SmartList validation pass/fail, formatting violations, manual edit time.
3. **Paste** each note into Epic (test env), confirm DotPhrase behavior and SmartList dropdown rendering.
4. **Score** usability (Likert); verify Q1–Q4 thresholds.

---

## 10) Risks & Mitigations

* **Missing SmartList options** → hard fail with explicit list of missing `{Display:ID}` and a CSV stub to fill.
* **Transcript unlabeled speakers** → heuristics first; allow manual override (Phase 1.1); section‑level regen as escape hatch.
* **Gemini rate limiting** → queued retries with jitter; user feedback in UI.

---

## 11) Phase 1 Delivery Checklist

* [ ] SmartTools engine implemented + unit tests
* [ ] Prompt builder implemented + golden‑prompt snapshot tests
* [ ] Vertex client implemented + redaction
* [ ] RCC Intake template imported and validated
* [ ] SmartList catalog loaded (owner provided)
* [ ] Minimal UI live; copy‑to‑clipboard works
* [ ] 20‑case test run; metrics captured; criteria met

---

## 12) Phase 4 Preview — SmartLink Library (Intent‑Aware)

**Goal:** NL intent → 1–3 SmartLinks with `.id` + `@id@` and short description.
**Inputs:** Curated U of U SmartLink catalog (seed from owner; expand collaboratively).
**Acceptance:** ≥80% relevance (clinician rated), <2s median latency, ≥150 SmartLinks in catalog.

---

## 13) Next Actions for Rufus

* Provide **SmartList option sets** (CSV/JSON per §7.3) for RCC Intake (start with all `{BH None/Other:304120103}` clones and Psych ROS IDs listed in the dotphrase).
* Confirm **the 12 templates** to import now (names + sources) or approve deriving from existing dotphrases.
* Share **GCP project/region** for Vertex; confirm model version.

> Once these are supplied, Claude Code can open branch `note-mvp` and execute §7 backlog top‑down.

---

# v1.3 Update — Config UX & Criteria (per user 2025‑10‑15)

## A) Configuration UX (replaces §5 step 1)

Before sending a note for generation, the user configures **two single‑selects**:

1. **Setting** (resident rotation or Moonlit location):

   * HMHI Downtown RCC
   * Redwood Clinic MHI
   * Davis Behavioral Health
   * Moonlit Psychiatry
2. **Visit Type**:

   * Intake ("Consultation Visit" in Redwood MHI)
   * Transfer of Care
   * Follow‑up

The UI does **not** ask the user to pick a template directly. The app resolves the template from **Setting × Visit Type** using the mapping in §B.

## B) Template Mapping (authoritative)

A config file provides a 1:1 mapping of **Setting × Visit Type → Template ID** (and version). Example schema:

```json
{
  "HMHI Downtown RCC": {
    "Intake": { "templateId": "rcc_intake_v1" },
    "Transfer of Care": { "templateId": "rcc_toc_v1" },
    "Follow-up": { "templateId": "rcc_fu_v1" }
  },
  "Redwood Clinic MHI": {
    "Consultation Visit": { "templateId": "redwood_consult_v1", "aliasOf": "Intake" },
    "Transfer of Care": { "templateId": "redwood_toc_v1" },
    "Follow-up": { "templateId": "redwood_fu_v1" }
  },
  "Davis Behavioral Health": {
    "Intake": { "templateId": "dbh_intake_v1" },
    "Transfer of Care": { "templateId": "dbh_toc_v1" },
    "Follow-up": { "templateId": "dbh_fu_v1" }
  },
  "Moonlit Psychiatry": {
    "Intake": { "templateId": "moonlit_intake_v1" },
    "Transfer of Care": { "templateId": "moonlit_toc_v1" },
    "Follow-up": { "templateId": "moonlit_fu_v1" }
  }
}
```

## C) Satisfaction Criteria (additions/clarifications)

* **F1a. Autoloaded Template:** Given a selected **Setting** and **Visit Type**, the app auto‑loads the correct template and uses it as the **sole structural source of truth** for the output.
* **F1b. Example‑Primed:** Each template includes a short exemplar paragraph per section to show tone/shape. The app is **pre‑loaded** with these so the LLM always “knows what good looks like.”
* **F1c. Context‑only Prior Note:** If a prior note is supplied, it is used **only** to inform content; it must **never** be reproduced verbatim. Output remains bound to the current template.
* **F1d. Redwood Alias:** When **Setting=Redwood Clinic MHI** and **Visit Type=Consultation Visit**, treat it as **Intake** for rules and metrics.
* **F1e. UX Contract:** The UI presents exactly two single‑selects (Setting, Visit Type) and an optional field to paste/upload a prior note; there is no free‑form template picker.

> All other criteria in §2 (Epic compatibility, SmartLists, Wildcards, structure, prose‑only), §3, §4, and the test plan remain in force.

---

## 14) Config Files (stubs)

### 14.1 `template-mapping.json`

```json
{
  "HMHI Downtown RCC": {
    "Intake":            { "templateId": "rcc_intake_v1", "version": 1 },
    "Transfer of Care":  { "templateId": "rcc_toc_v1",    "version": 1 },
    "Follow-up":         { "templateId": "rcc_fu_v1",     "version": 1 }
  },
  "Redwood Clinic MHI": {
    "Consultation Visit":{ "templateId": "redwood_consult_v1", "version": 1, "visitTypeAlias": "Intake" },
    "Transfer of Care":  { "templateId": "redwood_toc_v1",     "version": 1 },
    "Follow-up":         { "templateId": "redwood_fu_v1",      "version": 1 }
  },
  "Davis Behavioral Health": {
    "Intake":            { "templateId": "dbh_intake_v1", "version": 1 },
    "Transfer of Care":  { "templateId": "dbh_toc_v1",    "version": 1 },
    "Follow-up":         { "templateId": "dbh_fu_v1",     "version": 1 }
  },
  "Moonlit Psychiatry": {
    "Intake":            { "templateId": "moonlit_intake_v1", "version": 1 },
    "Transfer of Care":  { "templateId": "moonlit_toc_v1",    "version": 1 },
    "Follow-up":         { "templateId": "moonlit_fu_v1",     "version": 1 }
  }
}
```

*Endpoints that load templates must treat `visitTypeAlias` as equivalent to the aliased visit type for rules/metrics.*

---

## 15) Prompt Control & Observability (trust‑but‑verify)

**Goals:** Keep Rufus close to the exact compiled prompt without copy/paste workflows; enable review, auditing, and safe iteration until ready to “set and forget.”

### 15.1 Features (to implement now)

1. **Versioned prompt manifest** (`prompts/registry.yaml`) with SYSTEM, TASK, SMARTTOOLS rules, and Setting×VisitType bindings; edits via PRs with diff review.
2. **Preview Prompt** button (pre‑send) shows the **exact compiled prompt** (SYSTEM + TASK + SMARTTOOLS + TEMPLATE + PRIOR NOTE? + TRANSCRIPT). Allow **Copy compiled prompt**.
3. **Require Prompt Preview** feature flag (training wheels). When ON, preview must be opened before **Send**. Toggleable once confidence is achieved.
4. **Prompt Receipt** on every run: show `prompt_version`, `template_id`, `mapping_version`, and a short **hash** of the compiled prompt with a link to the redacted snapshot.
5. **Redacted PHI snapshots**: store prompt snapshots with transcript redacted tokens; full prompt never logged. Local preview can show PHI.
6. **Golden‑prompt snapshot tests**: CI compares compiled prompts against golden files per Setting×VisitType; changes require explicit approval.
7. **Admin inline diffs** for manifest/template rule updates; one‑click rollback to prior prompt version.
8. **Dry Run playground**: send compiled prompt to a local playground (no PHI if selected) for quick A/B wording without publishing to production.
9. **Role‑segmented editing**: content blocks editable by Rufus from UI; bindings/wiring changed via PR.
10. **Guardrails in manifest (SMARTTOOLS)**: enforce `@id@ → .id`, SmartList option validity, `***` behavior, paragraphs‑only, and no invented data.

### 15.2 Minimal UI changes

* Generator screen adds **Preview Prompt** and a **receipt chip** after generation. Admin screen adds **Prompt Diffs** and **Version rollback**.

### 15.3 CI additions

* `tests/golden_prompts/` holds canonical compiled prompts (one per Setting×VisitType). Jest snapshot or file‑diff tests block merges on drift.

---

## 16) New Config Files (stubs)

### 16.1 `prompts/registry.yaml`

```yaml
version: 1
system: |
  You are a HIPAA-compliant clinical documentation assistant for Dr. Rufus Sweeney.
task: |
  Draft an Epic-ready psychiatry note using TEMPLATE and TRANSCRIPT. Obey SMARTTOOLS.
smarttools_rules: |
  - Convert all @id@ → .id in the final note.
  - Preserve SmartLists {Display:EpicID} and append :: "selected" using ONLY allowed options.
  - Replace *** with transcript-derived prose; if unknown, keep ***.
  - Paragraphs only (no bullets). Keep section headers/order. Do not invent data.
mappings:
  HMHI Downtown RCC:
    Intake:            rcc_intake_v1
    Transfer of Care:  rcc_toc_v1
    Follow-up:         rcc_fu_v1
  Redwood Clinic MHI:
    Consultation Visit: redwood_consult_v1 # alias of Intake
    Transfer of Care:   redwood_toc_v1
    Follow-up:          redwood_fu_v1
  Davis Behavioral Health:
    Intake:            dbh_intake_v1
    Transfer of Care:  dbh_toc_v1
    Follow-up:         dbh_fu_v1
  Moonlit Psychiatry:
    Intake:            moonlit_intake_v1
    Transfer of Care:  moonlit_toc_v1
    Follow-up:         moonlit_fu_v1
```

### 16.2 `tests/golden_prompts/HMHI_Downtown_RCC__Intake.prompt.txt`

* Canonical compiled prompt text for this Setting×VisitType. One file per combo.

---

## 17) Implementation Tasks (add to backlog)

* feat(prompt-preview): compile+render exact prompt; add feature flag
* feat(prompt-receipt): show version+hash; store redacted snapshot
* chore(ci): golden prompt tests; diff on PRs
* feat(admin): manifest diff viewer; rollback
* chore(docs): authoring guide for `registry.yaml` (editing rules, examples)

---

## 18) Tech Guardrails (non‑negotiable)

* **Primary LLM:** Google **Gemini API** under Workspace BAA (HIPAA‑eligible).
* **Fallback LLM:** Claude API via PHI‑redaction proxy (no raw PHI sent).
* **PHI Storage (v1.0):** **No PHI** in app DB or logs. PHI lives in **Google Drive** only. DB stores metadata (ids, hashes, Drive fileIds, templateIds, versions).
* **Secrets:** GCP Secret Manager; `.env*` git‑ignored; CI secret scanner blocks leaks.
* **Branching/CI:** Protected **main**; PR‑only merges; CI gates: lint, typecheck, unit/integration, **golden prompts**, secret scan.
* **App Design:** Clean, documented modules; typed APIs; minimal deps; secure defaults.

**Acceptance (F‑series):**
F1 No PHI in DB/logs (scanner passes).
F2 `main` protected; merges only via passing PR.
F3 Prompt/manifest edits reviewed with golden‑prompt CI diffs.

---

## 19) Encounters & Meet/Drive Flow

**Goal:** Zero copy/paste. Launch Meet from the encounter list and auto‑ingest transcripts from Drive.

### 19.1 Features

* **Encounters view (7‑day)** sourced from Google Calendar; each row: date/time, patient, setting, visit type, **Start Meet**.
* **Meet launch:** Click **Start Meet** to open the Meet link for that encounter (create if missing).
* **Drive paths:** Convention `/EpicScribe/<YYYY‑MM‑DD>/<patient>/<encounterId>/`. Recordings/transcripts land here.
* **Drive watcher/indexer:** Poll or changes API restricted to `/EpicScribe/**`; index **metadata + fileId** only.

### 19.2 Acceptance (A/B‑series)

A1 Encounter list shows next 7 days with patient/time.
A2 **Start Meet** opens the correct Meet and pre‑creates the Drive path.
A3 When Meet produces a transcript, the app indexes it (no copy/paste).
B1 Transcript attaches to the encounter within 60s of Drive availability.
B2 Note generation can consume transcript without user copy/paste.

---

## 20) Prompt Variants per Setting × Visit Type

**Goal:** Each permutation can tailor wording/task/rules.

### 20.1 Manifest Extensions

Add overrides in `prompts/registry.yaml`:

```yaml
prompts:
  HMHI Downtown RCC:
    Intake:            { task_override: "…", smarttools_rules_override: "…" }
    Transfer of Care:  { task_override: "…" }
    Follow-up:         { task_override: "…" }
  # …repeat for other settings
```

### 20.2 Acceptance (C‑series)

C1 Compiled prompt in **Preview** reflects the selected permutation’s overrides.
C2 CI maintains **golden compiled prompts** for every permutation.

---

## 21) Required Inputs by Visit Type (gate rules)

* **TOC** and **Follow‑up** require a **prior note** (attached or fetched); **Intake** does not.
* UI blocks **Send** if requirements unmet; shows why and how to fix.

**Acceptance (D‑series):** D1 TOC/FU cannot generate without a prior note; Intake can.

---

## 22) Setting‑Aware SmartLink Examples

* Extend manifest with `smartlink_examples` (3–5 per setting) to reduce drift and educate the model.

**Acceptance (E‑series):** E1 Preview shows examples relevant to the chosen **Setting**.

---

## 23) Milestones & DoD (v1.0)

* **M1:** Encounters + Meet launch + Drive watcher (no generation yet).
* **M2:** Transcript→Prompt compile + **Preview** + **gate rules**.
* **M3:** Note generation (Gemini) + SmartTools enforcement + **prompt receipt**.
* **M4:** 20‑case usability test; hit all satisfaction thresholds.

**Definition of Done (v1.0):** All A–F, C, D, E criteria satisfied + paste‑into‑Epic demo with zero formatting fixes.

---

## 24) v2.0 — Moonlit IntakeQ Notes

**Goal:** For **Moonlit Psychiatry**, fetch the latest prior note from IntakeQ automatically.

### 24.1 Features

* **IntakeQ client:** Auth + endpoint to fetch most recent patient note (by patient identifier mapping).
* **Auto‑gate:** For Moonlit TOC/FU, the prior note is fetched automatically (override allowed).

### 24.2 Acceptance (H‑series)

H1 App fetches last note via IntakeQ for Moonlit encounters and uses it in prompt compile (no copy/paste).

---

## 25) Config Files (new stubs)

### 25.1 `encounters/source.yaml`

```yaml
calendar_ids:
  HMHI Downtown RCC: your_primary_calendar_id
  Redwood Clinic MHI: your_primary_calendar_id
  Davis Behavioral Health: your_primary_calendar_id
  Moonlit Psychiatry: your_primary_calendar_id
naming_conventions:
  event_title: "<Patient Last, First> — <Setting> — <VisitType>"
  encounter_id_in_description: true
```

### 25.2 `drive/paths.yaml`

```yaml
root: "/EpicScribe"
pattern: "/${date}/${patient}/${encounterId}/"
transcript_extensions: [".sbv", ".vtt", ".txt"]
```

### 25.3 `prompts/registry.yaml` (extended)

```yaml
version: 1
system: |
  You are a HIPAA-compliant clinical documentation assistant for Dr. Rufus Sweeney.
task: |
  Draft an Epic-ready psychiatry note using TEMPLATE and TRANSCRIPT. Obey SMARTTOOLS.
smarttools_rules: |
  - Convert all @id@ → .id in the final note.
  - Preserve SmartLists {Display:EpicID} and append :: "selected" using ONLY allowed options.
  - Replace *** with transcript-derived prose; if unknown, keep ***.
  - Paragraphs only (no bullets). Keep section headers/order. Do not invent data.
smartlink_examples:
  HMHI Downtown RCC: ["@lastvitals@→.lastvitals", "@FNAME@→.FNAME", "@LNAME@→.LNAME"]
  Moonlit Psychiatry: ["@lastvitals@→.lastvitals", "@age@→.age", "@allergies@→.allergies"]
# Template mapping remains in §14.1 template-mapping.json
prompts:
  HMHI Downtown RCC:
    Intake:            { }
    Transfer of Care:  { }
    Follow-up:         { }
  Redwood Clinic MHI:
    Consultation Visit:{ }
    Transfer of Care:  { }
    Follow-up:         { }
  Davis Behavioral Health:
    Intake:            { }
    Transfer of Care:  { }
    Follow-up:         { }
  Moonlit Psychiatry:
    Intake:            { }
    Transfer of Care:  { }
    Follow-up:         { }
```

---

## 26) Backlog Additions (story‑aligned)

* feat(encounters-ui): 7‑day list with Start Meet
* feat(google-calendar): read encounters + create/join Meet
* feat(drive-watcher): index transcripts (metadata only)
* feat(prompt-overrides): per‑permutation prompt variants
* feat(visit-gates): enforce prior note for TOC/FU
* feat(prompt-receipt): version/hash + redacted snapshot
* chore(ci): golden prompts for each permutation; secret scan gate
* docs: SECURITY.md, PHI-DATAFLOW.md, OPERATIONS.md

---

## 27) Repository & Environment Setup (for LLM agent)

**Stack:** Node.js 20+, pnpm, Next.js (app router), FastAPI (Python 3.11) for LLM client if preferred, or Node-only runtime if simpler.

```
repo/
  apps/
    web/                # Next.js UI (encounters, generator, admin)
  services/
    note/               # Prompt compiler, SmartTools validation, LLM client
    intakeq/            # v2.0 Moonlit IntakeQ client
    shared/             # Types, validators, config loaders
  infra/
    gcp/                # IAM, Secret Manager, CI/CD notes
  tests/
    golden_prompts/     # one per Setting×VisitType
    e2e/
  prompts/              # registry.yaml + prompt fragments
  configs/
    template-mapping.json
    encounters/source.yaml
    drive/paths.yaml
  docs/
    SECURITY.md, PHI-DATAFLOW.md, OPERATIONS.md
  .env.example
  .gitignore
  package.json
  Makefile
```

**package.json scripts**

```json
{
  "scripts": {
    "dev": "pnpm --filter apps/web dev",
    "test": "jest --runInBand",
    "lint": "eslint . && tsc -p tsconfig.json --noEmit",
    "golden:update": "node scripts/update-goldens.mjs",
    "golden:check": "node scripts/check-goldens.mjs",
    "secret:scan": "gitleaks detect --no-banner"
  }
}
```

**Makefile**

```
setup: ## install deps
	pnpm i

test: ## run unit + golden checks
	pnpm lint && pnpm test && pnpm golden:check
```

**.gitignore**

```
.env*
*.local
.DS_Store
.next/
```

**.env.example (no secrets)**

```
GOOGLE_WORKSPACE_CUSTOMER_ID=
GOOGLE_DRIVE_ROOT=/EpicScribe
GEMINI_MODEL=gemini-1.5-pro
CLAUDE_MODEL=claude-3.5-sonnet
GCP_PROJECT_ID=
GCP_REGION=
INTAKEQ_API_KEY= # v2.0
```

---

## 28) Auth, Permissions & Scopes

* **OAuth2 (Google Workspace)** with domain‑wide delegation where applicable.
* **Scopes (least privilege):** Calendar Read/Write (create Meet); Drive file read for `/EpicScribe/**`; Drive Changes API; People API (optional for names); no Gmail.
* **Secret storage:** GCP Secret Manager; service account keys **not** committed.
* **User accounts:** Single‑user MVP (Rufus) with explicit calendar IDs in `encounters/source.yaml`.

---

## 29) Data Model (non‑PHI)

* **Encounter**: { id, dateTime, setting, visitType, calendarEventId, meetLink, driveFolderId, transcriptFileId?, priorNoteFileId?, status }
* **Template**: { templateId, version, setting, visitType, sections[], smarttools[] }
* **PromptReceipt**: { id, timestamp, promptVersion, mappingVersion, templateId, permutationKey, promptHash, redactedSnapshotPath }
* **Config**: loaded from JSON/YAML files; no PHI persisted.

---

## 30) API Surface (minimal)

* `GET /api/encounters` → next 7 days (joins Calendar + local metadata)
* `POST /api/encounters/:id/start-meet` → ensure Meet link + Drive folder
* `POST /api/transcripts/ingest` → webhook/poll target to attach Drive fileId
* `POST /api/generate` → body { encounterId } → validates gates, compiles prompt, calls LLM, returns note + receipt
* `GET /api/prompts/preview?encounterId=…` → compiled prompt (local only)

---

## 31) UI Contracts (wireframe‑level)

* **Encounters:** table(date/time | patient | setting | visit type | Start Meet | Transcript status)
* **Generator:** controls (Setting, Visit Type, optional Prior Note attach/auto), **Preview Prompt** button, **Generate**; output panel with **Copy Note**; receipt chip (version/hash).
* **Admin:** manifest/templating diffs, golden prompts list, rollback.

---

## 32) Logging, Telemetry & Redaction

* Request IDs on all API calls; redact transcript content; log only fileIds/hashes.
* Redacted prompt snapshots stored at `/logs/redacted_prompts/<date>/<encounterId>.txt`.
* CI enforces “no PHI patterns” (regex heuristics) in logs and snapshots.

---

## 33) Testing Plan (expanded)

* **Unit:** SmartTools parser/validator, prompt compiler, Drive path resolver.
* **Golden prompts:** one file per Setting×VisitType, must match.
* **Integration:** Drive watcher → attach transcript → compile prompt → LLM mock → receipt.
* **E2E:** 20 de‑identified transcripts; measure edit time, latency; Epic paste check.

---

## 34) Deployment & Branching

* **Branching:** feature branches → PR → CI (lint, tests, golden, secrets) → protected `main`.
* **Deploy target:** local dev + single GCP Cloud Run service for UI/API (MVP). No PHI stored server‑side.
* **Runtime config:** pulled from Secret Manager at boot.

---

## 35) Risk Register (top 8)

1. Google Meet transcript delays → mitigate with polling + manual attach UI.
2. Drive watcher quota → use Changes API with pageTokens.
3. Prompt drift → golden tests + receipts.
4. PHI exposure in logs → redaction middleware + CI scan.
5. Calendar naming variance → encounterId convention in description.
6. LLM latency → streaming off; retries with backoff; budget <30s.
7. SmartList gaps → hard‑fail with CSV stub generation.
8. IntakeQ mapping mismatch → reconciliation UI (v2.0).

---

## 36) Acceptance Matrix (traceability)

| Story                            | Criteria IDs | Test Artifacts                      |
| -------------------------------- | ------------ | ----------------------------------- |
| Launch Meet from encounters      | A1, A2       | e2e: encounters_meet.spec.ts        |
| Auto‑ingest transcript           | A3, B1, B2   | integration: drive_watcher.spec.ts  |
| Select Setting/VisitType & gates | §21 (D1)     | unit: gates.spec.ts                 |
| Per‑permutation prompts          | C1, C2       | golden: *.prompt.txt                |
| SmartLinks/DotPhrases/SmartLists | §2 + §22     | unit: smarttools.spec.ts            |
| Prompt control (preview/receipt) | §15          | integration: prompt_preview.spec.ts |
| Security/tech guardrails         | F1–F3        | CI logs + SECURITY.md checks        |
| v2.0 IntakeQ (Moonlit)           | H1           | integration: intakeq_client.spec.ts |

---

## 37) Sample Stubs (developer‑ready)

**SmartList CSV stub generator output (example)**

```
smartlist_identifier,epic_id,display_name,options_json
"BH None/Other",304120103,"BH None/Other","[{\"value\":\"None\",\"order\":1,\"is_default\":true}]"
```

**Golden prompt example filename**
`tests/golden_prompts/HMHI_Downtown_RCC__Intake.prompt.txt`

---

## 38) Glossary (quick reference)

* **Setting:** Rotation/location context (HMHI RCC, Redwood MHI, Davis BH, Moonlit).
* **Visit Type:** Intake/Transfer of Care/Follow‑up (Redwood Intake alias = Consultation Visit).
* **SmartLink/DotPhrase:** `@id@`/`.id` Epic macros; SmartList `{Display:EpicID}`.
* **Prompt Receipt:** Metadata + hash proving what was sent (minus PHI).

---

# ⚠️ CURRENT DEVELOPMENT FOCUS (Start Here!)

## 🎉 SESSION PROGRESS UPDATE (2025-10-27)

### ✅ COMPLETED IN THIS SESSION

#### 1. Epic Scribe v2 Requirements Implementation
All requirements from `/docs/epic-scribe-v2/` have been successfully implemented:

- **Enhanced Psychiatric History Safety** (`/services/note/src/prompts/psychiatric-prompt-builder.ts`)
  - Added explicit warnings against inferring hospitalizations/suicide attempts
  - Set temperature to 0.2 for maximum consistency
  - Clear documentation instructions to ONLY use explicit transcript mentions

- **Formulation Structure Enforcement** (`/services/note/src/validators/note-validator.ts`)
  - Validates exactly 4 paragraphs required
  - Returns detailed error messages for corrections

- **Plan Structure Requirements** (`/services/note/src/validators/note-validator.ts`)
  - Enforces 5 required subsections: Medications, Psychotherapy, Laboratory/Studies, Follow-up, Safety Planning
  - Validates each subsection is present and properly formatted

- **Missing SmartLists Added** (`/configs/smartlists-catalog.json`)
  - Added: Cocaine Use (304120501), Amphetamine Use (304120502), Other Substances (304120503)
  - Added: Financial Status (304120601), Legal Issues (304120602), Psychomotor Changes (305000130)

- **QuickAdd SmartList UI** (`/apps/web/src/components/QuickAddSmartList.tsx`)
  - Modal interface for adding SmartLists without editing JSON
  - Template system for common option patterns
  - Preview before saving

#### 2. Moonlit Design System Integration
Complete styling update to match Moonlit Psychiatry branding:

- **Design System Created** (`/apps/web/src/lib/moonlit-theme.ts`)
  - Color palette: terracotta (#E89C8A), navy (#0A1F3D), cream (#F5F1ED), tan (#C5A882)
  - Typography: serif headers (Baskerville), clean sans-serif body
  - Status colors: mint green success, warm cream warnings, light coral errors

- **Components Updated with Moonlit Styling**:
  - QuickAddSmartList modal (cream header, tan buttons, terracotta accents)
  - Validation alerts (all use Moonlit color scheme)
  - SmartLists page buttons
  - All new v2 features follow Moonlit design

#### 3. Supabase Database Foundation Complete
Full database infrastructure ready for durable storage:

- **Database Schema Created** (`/supabase/migrations/001_initial_schema.sql`)
  - ✅ All tables created: patients, encounters, templates, smartlists, smartlist_values, generated_notes, template_edits
  - ✅ Indexes, triggers, and RLS policies configured
  - ✅ User's Supabase project created and migration executed successfully

- **TypeScript Integration**
  - Database types defined (`/apps/web/src/lib/database.types.ts`)
  - Supabase client configured (`/apps/web/src/lib/supabase.ts`)
  - Ready for service integration

- **Documentation** (`SUPABASE_SETUP.md`)
  - Complete setup guide with step-by-step instructions
  - Security best practices included

### ⚠️ CRITICAL NEXT STEPS FOR DATABASE ACTIVATION

The database is created but **NOT YET CONNECTED**. The app still uses:
- File-based storage for SmartLists (persists)
- In-memory storage for Templates (**DOES NOT PERSIST**)

#### Step 1: Add Supabase Credentials (User Action Required)
1. Go to Supabase Dashboard → Settings → API
2. Copy these values to `/apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
3. Restart the dev server

#### Step 2: Template Service Migration (CRITICAL - Templates Don't Persist!)
**Problem**: Templates are only in memory - lost on every restart!
**Files to Update**:
- `/services/note/src/templates/template-service.ts` - Change from Map to Supabase
- Create `/apps/web/src/lib/db/templates.ts` - Database operations

**Implementation**:
```typescript
// /apps/web/src/lib/db/templates.ts
import { supabase } from '@/lib/supabase';

export async function getTemplates() {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('active', true);
  return data;
}

export async function updateTemplateSection(templateId: string, sectionName: string, content: string) {
  // Update specific section, increment version
}
```

#### Step 3: SmartList Service Migration
**Current**: File-based (works but not scalable)
**Files to Update**:
- `/services/note/src/smartlists/smartlist-service.ts`
- Create `/apps/web/src/lib/db/smartlists.ts`

#### Step 4: Patient Management UI
Create `/apps/web/app/patients/page.tsx`:
- List/search patients
- Add/edit patient modal
- Link to patient's encounters

#### Step 5: Link Encounters to Patients
Update encounter creation to:
- Require patient selection
- Save to Supabase
- Track encounter history

### 📋 MISSING SMARTLISTS TO ADD
Use the QuickAdd button at `/smartlists` to add these:
- Mood (305000005)
- Cocaine Use (304120501) - Already in code but may need UI addition
- Amphetamine Use (304120502) - Already in code but may need UI addition
- Other Substances (304120503) - Already in code but may need UI addition
- Financial Status (304120601) - Already in code but may need UI addition
- Legal Issues (304120602) - Already in code but may need UI addition

### 🐛 KNOWN ISSUES
1. **Templates don't persist** - In-memory only, fix with database migration
2. **lucide-react occasionally missing** - Fix: `pnpm add lucide-react --filter @epic-scribe/web`
3. **No patient management** - Can't link encounters to patients yet

### ✅ WHAT'S WORKING NOW
- Note generation with all v2 safety features
- SmartList management with QuickAdd UI
- Template viewing/editing (but doesn't persist)
- Google Calendar/Meet/Drive integration
- Moonlit design system throughout
- Supabase database ready (awaiting credentials)

### 📊 TEST THE V2 FEATURES
1. **Test Note Generation**: Go to `/generate`, load sample data, generate a note
2. **Check Validation**: Look for the validation alerts showing formulation/plan structure
3. **Try QuickAdd**: Go to `/smartlists`, click "Quick Add SmartList"
4. **View Templates**: Go to `/templates` to see SmartTools in each section

---

## 39) Immediate Next Steps (Phase 1.5 - Patient Management & Database)

**Context:** Google Calendar/Meet/Drive integration is complete and working. Encounters can be created, Meet sessions launched, and transcripts found. Database schema is created and ready. Now we need to connect the services to use Supabase for persistence.

### ✅ DATABASE FULLY OPERATIONAL (2025-10-27 Session Complete)

**Final Status - All Database Issues Resolved:**
- ✅ Supabase project created and credentials in .env.local
- ✅ Database schema successfully migrated (001_initial_schema.sql)
- ✅ Database client and TypeScript types created
- ✅ SmartList and Template database services implemented
- ✅ API routes created for database operations
- ✅ RLS permissions fixed with secure policies
- ✅ **12 templates successfully migrated to database**
- ✅ **Persistence verified and working**

**What Was Completed This Session:**

1. **Epic Scribe v2 Implementation (100% Complete)**
   - Enhanced psychiatric safety features in prompt builder
   - Created comprehensive NoteValidator for DSM-5-TR compliance
   - Added 6 missing SmartLists to catalog
   - Created QuickAddSmartList UI component
   - Applied Moonlit design system to all v2 features

2. **Database Integration (100% Complete)**
   - Set up Supabase with proper schema
   - Created database services for SmartLists and Templates
   - Fixed RLS permissions with secure policies
   - Successfully migrated 12 templates to database
   - Implemented fallback system (DB → File)
   - Templates now persist across server restarts!

**Migration Files Created:**
- `/supabase/migrations/001_initial_schema.sql` - Database schema
- `/supabase/migrations/002_disable_rls_dev.sql` - RLS disable for dev
- `/supabase/migrations/003_grant_anon_permissions.sql` - Grant permissions
- `/supabase/migrations/004_secure_rls_policies.sql` - Secure RLS policies

**Next Session Can Start Immediately With:**
- Patient management UI (database ready)
- Encounter linking to patients (schema ready)
- SmartList UI improvements (database ready)
- All persistence working!

### 39.1 Delete Encounter Functionality

**Goal:** Allow users to delete test encounters from the encounters list.

**Tasks:**
1. Add "Delete" button to each encounter row in the encounters table
2. Create `DELETE /api/encounters/[id]` endpoint that:
   - Deletes the Google Calendar event
   - Shows confirmation dialog before deletion
3. Refresh encounters list after successful deletion
4. Handle errors gracefully (event already deleted, permission issues, etc.)

**Acceptance:**
- Users can delete unwanted encounters with one click + confirmation
- Deleted encounters disappear from the list immediately
- No orphaned data in Google Calendar

---

### 39.2 Patient Dashboard & Management

**Goal:** Create a centralized patient management system instead of free-form text entry.

**Features:**
1. **New `/patients` page** with:
   - List view of all patients (table: Last Name, First Name, DOB, Active Status, # of Encounters)
   - "Add New Patient" button
   - Search/filter functionality
   - Click patient row to view encounter history

2. **Add Patient Modal:**
   - Fields: First Name, Last Name, Date of Birth, MRN (optional), Notes (optional)
   - Validation: required fields, DOB format
   - Save to database

3. **Update Encounter Creation Modal:**
   - Replace free-text "Patient Name" input with:
     - Dropdown/autocomplete of existing patients (searchable)
     - "Or add new patient" inline form
   - Encounter stores `patientId` reference instead of plain text

**Acceptance:**
- Patients page shows all patients with key info
- New patient modal validates and saves correctly
- Encounter creation links to existing patients OR creates new ones inline
- Patient names remain consistent across all encounters

---

### 39.3 Supabase Database Schema & Integration

**Goal:** Move from file-based storage to proper Supabase PostgreSQL database for patient data, encounter metadata, and configuration.

**Schema Design:**

```sql
-- Patients table (PHI - encrypt sensitive columns)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  mrn TEXT, -- Medical Record Number (optional)
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Encounters table (metadata only, transcripts stay in Drive)
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL UNIQUE, -- Google Calendar event ID
  setting TEXT NOT NULL,
  visit_type TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meet_link TEXT,
  transcript_file_id TEXT, -- Google Drive file ID
  transcript_indexed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated Notes table (metadata only, content in Drive)
CREATE TABLE generated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  drive_file_id TEXT, -- If we save notes to Drive
  generated_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- Add indexes for common queries
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_encounters_scheduled_start ON encounters(scheduled_start);
CREATE INDEX idx_encounters_calendar_event_id ON encounters(calendar_event_id);
```

**Implementation Tasks:**

1. **Supabase Setup:**
   - Create new Supabase project (or use existing)
   - Run migration scripts for schema above
   - Configure Row Level Security (RLS) policies
   - Add Supabase credentials to `.env.local`

2. **Database Client Setup:**
   - Install `@supabase/supabase-js`
   - Create `/lib/supabase.ts` client wrapper
   - Create `/lib/db/` folder with typed query functions:
     - `patients.ts`: CRUD operations
     - `encounters.ts`: CRUD + calendar sync operations
     - `notes.ts`: CRUD operations

3. **Migrate Existing Flows:**
   - Update `POST /api/encounters` to save to Supabase after creating Calendar event
   - Update `GET /api/encounters` to join Supabase + Calendar data
   - Update `DELETE /api/encounters` to remove from both Supabase and Calendar
   - Update encounters UI to use patient names from DB

4. **Patient Management APIs:**
   - `GET /api/patients` - list all patients
   - `POST /api/patients` - create new patient
   - `GET /api/patients/[id]` - get patient details + encounters
   - `PATCH /api/patients/[id]` - update patient
   - `DELETE /api/patients/[id]` - soft delete (set active=false)

**Acceptance:**
- All patient data persisted in Supabase
- Encounter metadata synchronized between Calendar and Supabase
- Patient dropdown in encounter creation pulls from database
- Existing encounters continue to work (migration successful)
- No PHI in application logs; PHI encrypted at rest in Supabase

---

### 39.4 Why This Matters (Before Continuing)

Before implementing the rest of the roadmap (prompt receipts, golden tests, IntakeQ integration, etc.), we need:

1. **Patient Identity Consistency:** Can't have "Smith, John" in one encounter and "John Smith" in another
2. **Encounter History:** Need to query "all encounters for patient X"
3. **Analytics Foundation:** Track note generation success rates, edit times, etc.
4. **Referential Integrity:** Link transcripts → encounters → patients → notes
5. **Future Features:** Prior note fetching, patient timelines, template preferences per patient

---

## 40) Implementation Order

Work through tasks in this sequence:

**Week 1:**
1. ✅ Add delete encounter functionality (39.1) - ~2 hours
2. ✅ Supabase project setup + schema migration (39.3.1) - ~2 hours
3. ✅ Database client setup (39.3.2) - ~2 hours
4. ✅ Patient CRUD APIs (39.3.4) - ~3 hours

**Week 2:**
5. ✅ Build `/patients` dashboard page (39.2.1) - ~4 hours
6. ✅ Update encounter creation with patient dropdown (39.2.3) - ~3 hours
7. ✅ Migrate encounter sync to use Supabase (39.3.3) - ~4 hours
8. ✅ Test end-to-end: create patient → create encounter → generate note - ~2 hours

**Success Criteria:**
- Delete encounter works for test data
- Patient dashboard shows all patients
- New encounters link to patients properly
- All metadata stored in Supabase, PHI stays in Drive
- Zero breaking changes to existing note generation flow

---

## 41) After Phase 1.5 Completion

Once patient management and database integration are complete, return to the main roadmap:

- Continue with §15 (Prompt Control & Observability)
- Implement §19.2 acceptance criteria (B1, B2) - automatic transcript attachment
- Build §24 (IntakeQ integration for Moonlit)
- Add §20 (Prompt variants per Setting×Visit Type)

The database foundation will make all of these features significantly easier to implement with proper relational data.

---