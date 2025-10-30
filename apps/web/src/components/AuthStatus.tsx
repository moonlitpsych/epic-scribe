'use client';

import { useSession, signOut } from 'next-auth/react';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-[#5A6B7D]">
        <div className="h-2 w-2 rounded-full bg-[#5A6B7D] animate-pulse" />
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-[#5A6B7D]">{session.user.email}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="text-sm text-[#5A6B7D] hover:text-red-600 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
