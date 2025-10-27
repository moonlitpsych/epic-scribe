# Next Claude Code Session Brief

## 🎯 Your Mission
Build the **Prompt Builder** service and **Gemini AI integration** to connect the completed SmartTools engine with actual note generation.

## 📍 Current State
- ✅ SmartTools parser/transformer working perfectly
- ✅ Template system with 12 configurations ready
- ✅ SmartList Editor UI with drag-and-drop complete
- ✅ SmartList prompt expansion system ready
- ⏳ Need: Prompt compilation + LLM integration + Generation UI

## 🚀 Priority Tasks

### 1. Create Prompt Builder Service
**Location:** `/services/note/src/prompts/prompt-builder.ts`

```typescript
class PromptBuilder {
  build(template, transcript, previousNote?, smartLists?) {
    // Compile: SYSTEM + TASK + SMARTTOOLS + TEMPLATE + TRANSCRIPT
    // Expand SmartLists with option sets
    // Return compiled prompt string
  }
}
```

### 2. Set up Gemini Integration
**Location:** `/services/note/src/llm/gemini-client.ts`
- Use Vertex AI (HIPAA-compliant)
- Implement retry with exponential backoff
- Add PHI redaction for logs
- Create mock mode for testing

### 3. Build Note Generation UI
**Location:** `/apps/web/app/generate/page.tsx`
- Setting × Visit Type selectors
- Transcript input textarea
- Optional previous note field
- "Preview Prompt" button (shows compiled prompt)
- "Generate Note" button
- Output display with copy-to-clipboard

## 🔧 Quick Start
```bash
cd /Users/macsweeney/Projects/epic-scribe
cd apps/web && pnpm dev
# App runs on http://localhost:3002
```

## 📝 Key Context
- **Database:** User wants Supabase (PostgreSQL) - implement when needed
- **NO PHI** in database - only metadata
- **PHI Storage:** Google Drive only
- **User Preference:** Always create interactive demos they can test

## ✨ Success Criteria
By end of session, user should be able to:
1. Select a Setting and Visit Type
2. Paste a transcript
3. Click "Generate Note"
4. See Epic-ready output with proper SmartTools formatting
5. Copy to clipboard and paste into Epic

## 🎨 Current Pages to Test
- http://localhost:3002/demo - SmartTools parser
- http://localhost:3002/templates - Template editor
- http://localhost:3002/smartlists - SmartList manager
- http://localhost:3002/smartlists/demo - Prompt expansion demo

## 💡 Pro Tips
- User loves visual feedback and working demos
- Prioritize Epic compatibility
- Test with the Jeremy Montoya example data
- Keep UX clean and intuitive
- SmartList values MUST come from defined option sets

Ready? Let's build the bridge between SmartTools and Gemini! 🚀