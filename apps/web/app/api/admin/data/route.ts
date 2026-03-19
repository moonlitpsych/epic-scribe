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
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import {
  getProviderByEmail,
  getAllLinkedUsers,
  getAllProviders,
  getProviderIntakeQCredentials,
} from '@/lib/db/providers';
import { getAllTemplates, getTemplatesForProvider } from '@/lib/db/intakeq-templates';

export async function GET() {
  try {
    const ps = await requireProviderSession();

    // Get current user's provider (for IntakeQ credentials lookup)
    const currentProvider = await getProviderByEmail(ps.email);

    // Get templates filtered by provider (or all if no provider)
    const templates = currentProvider
      ? await getTemplatesForProvider(currentProvider.id)
      : await getAllTemplates();

    // Get current user's credentials (if they have any)
    let currentCredentials = null;
    if (currentProvider) {
      const creds = await getProviderIntakeQCredentials(currentProvider.id);
      if (creds) {
        currentCredentials = {
          login_email: creds.login_email,
          default_template_name: creds.default_template_name,
        };
      }
    }

    // Admin-only data
    let linkedUsers: Awaited<ReturnType<typeof getAllLinkedUsers>> = [];
    let allProviders: Awaited<ReturnType<typeof getAllProviders>> = [];

    if (ps.isAdmin) {
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
      isAdmin: ps.isAdmin,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
    console.error('[Admin] Error fetching data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch admin data' },
      { status: 500 }
    );
  }
}
