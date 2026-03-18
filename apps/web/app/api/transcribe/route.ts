import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseClient } from '@/lib/supabase';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { storagePath, patientName } = await request.json();

    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });
    }

    // Download audio from Supabase Storage
    const supabase = getSupabaseClient(true);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('encounter-recordings')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('[Transcribe] Download error:', downloadError);
      return NextResponse.json({ error: 'Failed to download audio file' }, { status: 500 });
    }

    // Convert to base64 for Gemini inline data
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = storagePath.endsWith('.mp4') ? 'audio/mp4' : 'audio/webm';
    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);

    console.log(`[Transcribe] Audio file: ${storagePath}, ${fileSizeMB.toFixed(1)} MB, ${mimeType}`);

    // Call Gemini with audio
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const backupKey = (process.env.GEMINI_BACKUP_API_KEY || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
    }

    const model = (process.env.GEMINI_MODEL || 'gemini-2.5-pro').trim();

    const transcriptionPrompt = `Transcribe this psychiatric encounter audio verbatim. Rules:
- Use speaker labels [DR] for the doctor and [PT] for the patient. If a third speaker is present, use [OTHER].
- Include timestamps [HH:MM:SS] at natural breaks (every few minutes or at topic shifts).
- Preserve exact wording — do not paraphrase, summarize, or omit any content.
- Include filler words, false starts, and repetitions only if clinically relevant.
- If audio is unclear, mark as [inaudible].
${patientName ? `- The patient's name is ${patientName}.` : ''}

Output ONLY the transcript text, no commentary.`;

    async function callGemini(key: string): Promise<string> {
      const genAI = new GoogleGenerativeAI(key);
      const geminiModel = genAI.getGenerativeModel({ model });
      const result = await geminiModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Audio } },
              { text: transcriptionPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 65536,
        },
      });
      return result.response.text();
    }

    let transcript: string;
    try {
      transcript = await callGemini(apiKey);
    } catch (err: any) {
      if (backupKey && err?.status === 429) {
        console.log('[Transcribe] Primary key quota exceeded, using backup');
        transcript = await callGemini(backupKey);
      } else {
        throw err;
      }
    }

    console.log(`[Transcribe] Transcription complete: ${transcript.length} chars`);

    return NextResponse.json({
      transcript,
      durationSeconds: null, // Could be extracted from audio metadata in future
    });
  } catch (err: any) {
    console.error('[Transcribe] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
