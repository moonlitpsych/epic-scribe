import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

// Simple in-memory rate limiter: max 10 calls per minute
const callLog: number[] = [];
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove entries older than the window
  while (callLog.length > 0 && callLog[0] < now - WINDOW_MS) {
    callLog.shift();
  }
  if (callLog.length >= RATE_LIMIT) return true;
  callLog.push(now);
  return false;
}

export async function POST(request: Request) {
  if (isRateLimited()) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const { systemPrompt, transcript } = await request.json();

    if (!systemPrompt || !transcript) {
      return NextResponse.json(
        { error: 'systemPrompt and transcript are required' },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const backupKey = (process.env.GEMINI_BACKUP_API_KEY || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    const model = (process.env.GEMINI_MODEL || 'gemini-2.5-pro').trim();

    async function callGemini(key: string): Promise<string> {
      const genAI = new GoogleGenerativeAI(key);
      const geminiModel = genAI.getGenerativeModel({ model });
      const result = await geminiModel.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nGenerate a clinical note from this psychiatric intake transcript:\n\n${transcript}` }] },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      });
      const response = result.response;
      return response.text();
    }

    let text: string;
    try {
      text = await callGemini(apiKey);
    } catch (err: any) {
      // Failover to backup key on quota errors
      if (backupKey && err?.status === 429) {
        text = await callGemini(backupKey);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Demo generate error:', err);
    return NextResponse.json(
      { error: 'Failed to generate note' },
      { status: 500 }
    );
  }
}
