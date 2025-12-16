import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';

// Refresh tokens 5 minutes before they expire to avoid edge cases
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          // Request the scopes we need for Calendar, Drive, and Meet
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',           // Calendar access
            'https://www.googleapis.com/auth/calendar.events',    // Create/edit events
            'https://www.googleapis.com/auth/drive.file',         // Drive file access (limited to app-created files)
            'https://www.googleapis.com/auth/drive.readonly',     // Read Drive files
          ].join(' '),
          // Force approval prompt to ensure we get refresh token
          prompt: 'consent',
          access_type: 'offline',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        // IMPORTANT: Always store expiry in milliseconds for consistency
        // Google's expires_at is in seconds, so convert to ms
        token.accessTokenExpires = (account.expires_at as number) * 1000;
        console.log('[Auth] Initial token set, expires at:', new Date(token.accessTokenExpires as number).toISOString());
      }

      const expiresAt = token.accessTokenExpires as number;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Return previous token if the access token has not expired yet (with buffer)
      if (timeUntilExpiry > TOKEN_REFRESH_BUFFER_MS) {
        return token;
      }

      // Access token has expired or is about to expire, try to refresh it
      console.log('[Auth] Token expired or expiring soon, attempting refresh. Time until expiry:', Math.round(timeUntilExpiry / 1000), 'seconds');
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      // Add user ID from JWT sub claim
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      console.error('[Auth] No refresh token available - user must re-authenticate');
      throw new Error('No refresh token available');
    }

    console.log('[Auth] Attempting to refresh access token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', response.status, refreshedTokens.error, refreshedTokens.error_description);
      throw new Error(refreshedTokens.error_description || refreshedTokens.error || 'Token refresh failed');
    }

    const newExpiresAt = Date.now() + refreshedTokens.expires_in * 1000;
    console.log('[Auth] Token refreshed successfully, new expiry:', new Date(newExpiresAt).toISOString());

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: newExpiresAt,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined, // Clear any previous error
    };
  } catch (error) {
    console.error('[Auth] Failed to refresh access token:', error instanceof Error ? error.message : error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
