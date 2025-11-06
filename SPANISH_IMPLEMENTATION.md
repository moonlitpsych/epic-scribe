# Spanish Translation Feature Implementation Guide

## Overview
This feature adds Spanish-to-English translation capability to your /workflow page, allowing physicians to:
1. Record visits in Spanish using Google Meet
2. Translate the Spanish transcript to English
3. Generate EMR-ready notes using the existing workflow

## Files to Add/Update

### 1. Create Translation API Endpoint
**File:** `apps/web/app/api/translate/route.ts`
- Copy the contents from `translation-api.ts`
- This endpoint handles Spanish-to-English translation using Gemini API
- Uses lower temperature (0.1) for accurate medical translation

### 2. Update GenerateInputStep Component
**File:** `apps/web/src/components/workflow/GenerateInputStep.tsx`
- Replace with the updated version from `GenerateInputStep-updated.tsx`
- Adds language toggle button
- Implements two-step workflow for Spanish transcripts
- Preserves all existing functionality

## New Features

### Language Toggle
- Toggle button in the UI to switch between English and Spanish input modes
- Visual indicator showing current mode (Spanish shows in coral color)
- Clear workflow instructions when Spanish mode is active

### Translation Workflow
When Spanish mode is active:
1. **Input Phase**: User pastes Spanish transcript from Google Meet
2. **Translation Phase**: Click "Translate to English" button
3. **Review Phase**: Review translated English text (editable)
4. **Generation Phase**: Continue with normal note generation

### Visual Feedback
- Progress indicators for translation status
- Success confirmation when translation completes
- Word count display in both languages
- Clear labeling of translated content

## User Experience Flow

### For Spanish Visits:
1. Click "Spanish Transcript" toggle button
2. Paste Spanish transcript from Google Meet
3. Click "Translate to English" button
4. Review/edit the English translation if needed
5. Click "Generate Note" to create EMR note

### For English Visits:
- Works exactly as before (no changes to existing workflow)

## Technical Details

### Translation Quality
- Uses Gemini API with specialized medical translation prompt
- Preserves:
  - Speaker attributions (Doctor:, Patient:)
  - Medical terminology accuracy
  - Conversational structure
  - Timestamps if present

### Error Handling
- Graceful fallback if translation fails
- Clear error messages to user
- Ability to retry translation

### State Management
- Tracks translation status
- Prevents accidental data loss
- Confirmation dialog when switching languages after translation

## Testing Recommendations

1. **Test with Sample Spanish Transcript:**
   ```
   Doctor: Buenos días, ¿cómo se siente hoy?
   Paciente: He tenido dolor de cabeza y náuseas por tres días.
   Doctor: ¿Ha tomado algún medicamento?
   Paciente: Sí, ibuprofeno 400mg cada 8 horas.
   ```

2. **Verify Translation Accuracy:**
   - Medical terms are correctly translated
   - Structure is preserved
   - No information is lost

3. **Test Edge Cases:**
   - Very long transcripts (>5000 words)
   - Mixed language content
   - Special characters and accents

## Environment Variables
No new environment variables required - uses existing Gemini API configuration.

## Benefits

1. **Efficiency**: No need to manually translate Spanish transcripts
2. **Accuracy**: AI-powered translation maintains medical terminology
3. **Workflow Integration**: Seamlessly integrates with existing note generation
4. **Flexibility**: Can switch between languages as needed
5. **Documentation**: Spanish visits properly documented in English for EMR

## Future Enhancements (Optional)

1. **Auto-detect language** from transcript content
2. **Support additional languages** (Portuguese, Mandarin, etc.)
3. **Save original Spanish** transcript alongside English for records
4. **Batch translation** for multiple transcripts
5. **Translation memory** to improve consistency across visits

## Support
For issues or questions about the translation feature:
- Check Gemini API status and quotas
- Verify authentication is working
- Review console logs for detailed error messages