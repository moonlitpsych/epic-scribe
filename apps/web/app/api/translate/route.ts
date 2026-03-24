// apps/web/app/api/translate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        await requireProviderSession();

        const body = await request.json();
        const { text, sourceLanguage = 'Spanish', targetLanguage = 'English' } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Missing required field: text' },
                { status: 400 }
            );
        }

        const translationPrompt = `You are a professional medical translator specializing in clinical documentation.

TASK: Translate the following ${sourceLanguage} medical transcript to ${targetLanguage}.

REQUIREMENTS:
- Maintain all medical terminology accuracy
- Preserve the original speaker attributions ([DR], [PT], Doctor:, Patient:, etc.)
- Keep the conversational structure intact
- Do not add explanations or notes
- Preserve all timestamps if present
- Maintain the exact meaning and tone
- Use standard medical terminology in ${targetLanguage}

TRANSCRIPT TO TRANSLATE:
${text}

TRANSLATION:`;

        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        const backupKey = (process.env.GEMINI_BACKUP_API_KEY || '').trim();

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
        }

        async function callGemini(key: string): Promise<string> {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: translationPrompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 65536,
                },
            });
            return result.response.text();
        }

        const start = Date.now();
        let translatedText: string;
        try {
            translatedText = await callGemini(apiKey);
        } catch (err: any) {
            if (backupKey && err?.status === 429) {
                console.log('[Translate] Primary key quota exceeded, using backup');
                translatedText = await callGemini(backupKey);
            } else {
                throw err;
            }
        }
        const latencyMs = Date.now() - start;

        console.log(`[Translate] ${sourceLanguage}→${targetLanguage} in ${latencyMs}ms (${text.length}→${translatedText.length} chars)`);

        return NextResponse.json({
            translatedText,
            sourceLanguage,
            targetLanguage,
            originalLength: text.length,
            translatedLength: translatedText.length,
            latencyMs,
        });

    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
        console.error('Translation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to translate text',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
