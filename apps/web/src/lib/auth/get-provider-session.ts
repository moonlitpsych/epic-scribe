/**
 * Provider Session Helper — Typed wrapper around getServerSession
 *
 * Every API route should use requireProviderSession() instead of
 * raw getServerSession(authOptions) to get the provider context.
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../app/api/auth/[...nextauth]/route';

export interface ProviderSession {
  providerId: string;
  email: string;
  isAdmin: boolean;
  name?: string | null;
  accessToken?: string;
}

/**
 * Get the current provider session or throw.
 * Returns typed { providerId, email, isAdmin }.
 */
export async function requireProviderSession(): Promise<ProviderSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new UnauthorizedError('Not authenticated');
  }

  const providerId = (session.user as any).providerId as string | undefined;
  const isAdmin = (session.user as any).isAdmin as boolean | undefined;

  if (!providerId) {
    throw new UnauthorizedError('No provider account linked');
  }

  return {
    providerId,
    email: session.user.email,
    isAdmin: isAdmin ?? false,
    name: session.user.name,
    accessToken: session.accessToken,
  };
}

/**
 * Get session or return null (for optional auth checks).
 */
export async function getProviderSession(): Promise<ProviderSession | null> {
  try {
    return await requireProviderSession();
  } catch {
    return null;
  }
}

/**
 * Custom error for unauthorized access — API routes catch this
 * and return 401.
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Helper to create a 401 response.
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}
