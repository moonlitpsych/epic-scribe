'use client';

import type { EncounterStatus } from '@/lib/flow/types';
import { STATUS_META } from '@/lib/flow/status';

interface StatusBadgeProps {
  status: EncounterStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="mr-1.5 text-[10px]">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
