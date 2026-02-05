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
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getProviderByEmail, linkUserToProvider } from '@/lib/db/providers';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's provider and check admin status
    const currentProvider = await getProviderByEmail(session.user.email);

    if (!currentProvider?.is_admin) {
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

    // Link the user
    const link = await linkUserToProvider(email, providerId, isAdmin || false);

    return NextResponse.json({
      success: true,
      message: 'User linked to provider successfully',
      linkId: link.id,
    });
  } catch (error) {
    console.error('[Admin] Error linking user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link user' },
      { status: 500 }
    );
  }
}
