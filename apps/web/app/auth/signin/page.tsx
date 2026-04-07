'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const isSessionExpired = error === 'SessionExpired';

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/flow' });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]"
      style={{ background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="max-w-md w-full space-y-8 p-8 bg-[var(--bg-surface)] rounded-[2px] border border-[var(--border-default)]"
        style={{ background: '#141720', border: '1px solid #2a2d3a', maxWidth: '28rem', width: '100%', padding: '2rem', borderRadius: '2px' }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            className="text-4xl font-bold font-heading text-[var(--text-primary)] mb-2 tracking-tight"
            style={{ color: '#e8eaf0', fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}
          >
            Epic Scribe
          </h1>
          <p
            className="text-sm text-[var(--text-secondary)] mb-8"
            style={{ color: '#a0a4b4', fontSize: '0.875rem', marginBottom: '2rem' }}
          >
            AI-powered clinical documentation for psychiatry
          </p>
        </div>

        {/* Session Expired Notice */}
        {isSessionExpired && (
          <div
            className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[2px] p-4 mb-4"
            style={{ background: '#1f1a0f', border: '1px solid #4d3a14', padding: '1rem', borderRadius: '2px', marginBottom: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ color: '#fbbf24', fontSize: '1.25rem' }}>&#9888;</span>
              <div>
                <h3 style={{ fontWeight: 600, color: '#fbbf24' }}>Session Expired</h3>
                <p style={{ fontSize: '0.875rem', color: '#fbbf24', opacity: 0.8, marginTop: '0.25rem' }}>
                  Your session has expired for security. Please sign in again to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div
            className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-[2px] p-4"
            style={{ background: '#0f1328', border: '1px solid #1e2850', padding: '1rem', borderRadius: '2px', marginBottom: '1.5rem' }}
          >
            <h3
              className="font-semibold text-[var(--info-text)] mb-2"
              style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.5rem' }}
            >
              Permissions Needed
            </h3>
            <ul style={{ fontSize: '0.875rem', color: '#60a5fa', opacity: 0.8, listStyle: 'disc', paddingLeft: '1.25rem' }}>
              <li>Google Calendar - View and create appointments</li>
              <li>Google Meet - Launch video sessions</li>
              <li>Google Drive - Access transcripts</li>
            </ul>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[var(--border-default)] rounded text-base font-medium text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '0.25rem', color: '#e8eaf0', fontSize: '1rem', fontWeight: 500, cursor: 'pointer', marginBottom: '1.5rem' }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-[var(--text-secondary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ height: '1.25rem', width: '1.25rem' }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg style={{ height: '1.25rem', width: '1.25rem' }} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#6e7280' }}>
            By signing in, you agree to grant access to your Google Calendar, Meet, and Drive for clinical documentation purposes only.
          </p>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #1e2130' }}>
          <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#6e7280' }}>
            HIPAA-compliant clinical documentation system<br />
            PHI stored in Google Drive only - No PHI in application logs
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense because useSearchParams requires it
export default function SignIn() {
  return (
    <Suspense fallback={
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]"
        style={{ background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: '#a0a4b4', fontSize: '0.875rem' }}>
          Loading...
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
