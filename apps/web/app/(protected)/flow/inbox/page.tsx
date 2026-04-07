'use client';

import Link from 'next/link';

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-[860px] px-10 py-8">
      <header className="mb-8">
        <h1 className="font-flow-heading text-[28px] font-normal leading-tight tracking-tight text-[#f4f4f5]">
          Inbox
        </h1>
        <p className="mt-1.5 text-[13px] text-[#6b7280]">
          0 pending · 0 completed
        </p>
      </header>
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="text-3xl opacity-30">✓</div>
        <p className="max-w-xs text-center text-sm text-[#6b7280]">
          Nothing here yet. Action items from visits will populate automatically in Phase 3.
        </p>
        <Link
          href="/flow"
          className="mt-4 rounded-lg border border-white/10 bg-transparent px-4 py-2 text-[13px] font-medium text-[#9ca3af] no-underline transition-colors hover:bg-white/[0.04]"
        >
          Back to The Day
        </Link>
      </div>
    </div>
  );
}
