'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle unauthenticated state
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // HIPAA-compliant: Auto-logout when token refresh fails
  // This ensures users don't have partial functionality with an expired token
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError' && !isLoggingOut) {
      console.log('[Auth] Session token refresh failed - logging out for security');
      setIsLoggingOut(true);

      // Sign out and redirect to sign-in page
      signOut({
        callbackUrl: '/auth/signin?error=SessionExpired',
        redirect: true
      });
    }
  }, [session?.error, isLoggingOut]);

  // Show logging out state
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Session Expired</h2>
          <p className="text-[var(--text-secondary)]">
            Your session has expired. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-primary)] border-r-transparent" />
          <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
