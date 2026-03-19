/**
 * POST /api/admin/link-user - Link a NextAuth user to a provider
 *
 * Admin only endpoint.
 *
 * Request body:
 * - email: string - NextAuth user email
 * - providerId: string - Provider to link to
 * - isAdmin?: boolean - Whether the user should be an admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { linkUserToProvider } from '@/lib/db/providers';

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    if (!ps.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, providerId, isAdmin } = body;

    if (!email || !providerId) {
      return NextResponse.json(
        { error: 'email and providerId are required' },
        { status: 400 }
      );
    }

    const link = await linkUserToProvider(email, providerId, isAdmin || false);

    return NextResponse.json({
      success: true,
      message: 'User linked to provider successfully',
      linkId: link.id,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
    console.error('[Admin] Error linking user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link user' },
      { status: 500 }
    );
  }
}
