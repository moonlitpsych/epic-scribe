'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import FlowSidebar from '@/components/flow/FlowSidebar';

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClassic = pathname.startsWith('/flow/classic');

  if (isClassic) {
    return <>{children}</>;
  }

  return (
    <div className="flow-shell flex h-screen w-screen overflow-hidden font-flow-body text-sm text-[#e4e4e7]">
      <Suspense>
        <FlowSidebar />
      </Suspense>
      <main className="flex-1 overflow-hidden bg-[var(--bg-base)]">
        {children}
      </main>
    </div>
  );
}
