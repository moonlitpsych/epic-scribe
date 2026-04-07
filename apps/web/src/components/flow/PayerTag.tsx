'use client';

import { PAYER_COLORS } from '@/lib/flow/status';

interface PayerTagProps {
  payer: string;
}

export default function PayerTag({ payer }: PayerTagProps) {
  const color = PAYER_COLORS[payer] || '#6b7280';

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color, border: `1px solid ${color}44` }}
    >
      {payer}
    </span>
  );
}
