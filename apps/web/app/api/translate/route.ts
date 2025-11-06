// apps/web/app/api/translate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getGeminiClient } from '@epic-scribe/note-service/src/llm/gemini-client';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { text, sourceLanguage = 'Spanish', targetLanguage = 'English' } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Missing required field: text' },
                { status: 400 }
            );
        }

        // Initialize Gemini client
        const geminiClient = getGeminiClient({
            temperature: 0.1, // Lower temperature for more accurate translation
            maxOutputTokens: 8192,
        });

        // Create a specific translation prompt
        const translationPrompt = `You are a professional medical translator specializing in clinical documentation.

TASK: Translate the following ${sourceLanguage} medical transcript to ${targetLanguage}.

REQUIREMENTS:
- Maintain all medical terminology accuracy
- Preserve the original speaker attributions (Doctor:, Patient:, etc.)
- Keep the conversational structure intact
- Do not add explanations or notes
- Preserve all timestamps if present
- Maintain the exact meaning and tone
- Use standard medical terminology in ${targetLanguage}

TRANSCRIPT TO TRANSLATE:
${text}

TRANSLATION:`;

        // Generate translation
        const result = await geminiClient.generateNote(
            translationPrompt,
            `translation_${Date.now()}`,
            'translation'
        );

        return NextResponse.json({
            translatedText: result.content,
            sourceLanguage,
            targetLanguage,
            originalLength: text.length,
            translatedLength: result.content.length,
            latencyMs: result.latencyMs,
        });

    } catch (error) {
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