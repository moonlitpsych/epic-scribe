/**
 * POST /api/admin/credentials - Save IntakeQ credentials for a provider
 *
 * Request body:
 * - providerId: string
 * - login_email: string
 * - login_password?: string (optional, keeps existing if not provided)
 * - default_template_name?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getProviderByEmail,
  getProviderIntakeQCredentials,
  upsertProviderIntakeQCredentials,
} from '@/lib/db/providers';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's provider
    const currentProvider = await getProviderByEmail(session.user.email);

    if (!currentProvider) {
      return NextResponse.json(
        { error: 'Your account is not linked to a provider' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { providerId, login_email, login_password, default_template_name } = body;

    // Validate provider ID matches current user (unless admin)
    if (providerId !== currentProvider.id && !currentProvider.is_admin) {
      return NextResponse.json(
        { error: 'You can only update your own credentials' },
        { status: 403 }
      );
    }

    if (!login_email) {
      return NextResponse.json(
        { error: 'login_email is required' },
        { status: 400 }
      );
    }

    // If password not provided, get the existing one
    let passwordToSave = login_password;
    if (!passwordToSave) {
      const existingCreds = await getProviderIntakeQCredentials(providerId);
      if (existingCreds) {
        passwordToSave = existingCreds.login_password;
      } else {
        return NextResponse.json(
          { error: 'Password is required for new credentials' },
          { status: 400 }
        );
      }
    }

    // Save credentials
    const saved = await upsertProviderIntakeQCredentials(providerId, {
      login_email,
      login_password: passwordToSave,
      default_template_name: default_template_name || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully',
      credentialsId: saved.id,
    });
  } catch (error) {
    console.error('[Admin] Error saving credentials:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save credentials' },
      { status: 500 }
    );
  }
}
