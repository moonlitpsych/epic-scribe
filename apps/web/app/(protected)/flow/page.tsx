'use client';

import { Suspense } from 'react';
import ScheduleView from '@/components/flow/ScheduleView';

export default function FlowPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#4b5563]">Loading schedule...</div>}>
      <ScheduleView />
    </Suspense>
  );
}
