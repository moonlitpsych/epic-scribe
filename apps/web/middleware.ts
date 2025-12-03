import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(_req) {
    // Middleware logic runs for authenticated requests
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Protect these routes - require authentication
export const config = {
  matcher: [
    '/workflow/:path*',
    '/templates/:path*',
    '/encounters/:path*',
    '/patients/:path*',
    '/designated-examiner/:path*',
    '/api/patients/:path*',
    '/api/encounters/:path*',
    '/api/templates/:path*',
    '/api/generate/:path*',
    '/api/designated-examiner/:path*',
    '/api/notes/:path*',
  ],
};
