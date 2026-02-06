/**
 * GET /api/admin/data - Fetch admin dashboard data
 *
 * Returns:
 * - linkedUsers: All users linked to providers (admin only)
 * - allProviders: All providers for dropdown (admin only)
 * - templates: All IntakeQ templates
 * - currentProvider: The current user's provider
 * - currentCredentials: The current user's IntakeQ credentials (password hidden)
 * - isAdmin: Whether the current user is an admin
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getProviderByEmail,
  getAllLinkedUsers,
  getAllProviders,
  getProviderIntakeQCredentials,
} from '@/lib/db/providers';
import { getAllTemplates, getTemplatesForProvider } from '@/lib/db/intakeq-templates';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's provider
    const currentProvider = await getProviderByEmail(session.user.email);
    const isAdmin = currentProvider?.is_admin || false;

    // Get templates filtered by provider (or all if no provider)
    const templates = currentProvider
      ? await getTemplatesForProvider(currentProvider.id)
      : await getAllTemplates();

    // Get current user's credentials (if they have any)
    let currentCredentials = null;
    if (currentProvider) {
      const creds = await getProviderIntakeQCredentials(currentProvider.id);
      if (creds) {
        // Don't return the actual password
        currentCredentials = {
          login_email: creds.login_email,
          default_template_name: creds.default_template_name,
          // Password is intentionally omitted
        };
      }
    }

    // Admin-only data
    let linkedUsers: Awaited<ReturnType<typeof getAllLinkedUsers>> = [];
    let allProviders: Awaited<ReturnType<typeof getAllProviders>> = [];

    if (isAdmin) {
      linkedUsers = await getAllLinkedUsers();
      allProviders = await getAllProviders();
    }

    return NextResponse.json({
      linkedUsers,
      allProviders,
      templates,
      currentProvider: currentProvider
        ? {
            id: currentProvider.id,
            first_name: currentProvider.first_name,
            last_name: currentProvider.last_name,
            email: currentProvider.email,
            title: currentProvider.title,
          }
        : null,
      currentCredentials,
      isAdmin,
    });
  } catch (error) {
    console.error('[Admin] Error fetching data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch admin data' },
      { status: 500 }
    );
  }
}
