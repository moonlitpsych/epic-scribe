'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import MiniCalendar from './MiniCalendar';

interface NavItemProps {
  icon: string;
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
  badge?: number | null;
}

function NavItem({ icon, label, href, active, disabled, badge }: NavItemProps) {
  const classes = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all relative ${
    active
      ? 'bg-[var(--flow-accent-bg)] text-[var(--flow-accent-light)]'
      : disabled
        ? 'text-[#9ca3af] opacity-35 cursor-default'
        : 'text-[#9ca3af] hover:bg-white/[0.04] hover:text-[#d1d5db]'
  }`;

  if (disabled) {
    return (
      <button className={classes} disabled>
        <span className="w-5 text-center text-base">{icon}</span>
        <span>{label}</span>
        {badge != null && badge > 0 && (
          <span className="absolute right-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--flow-accent)] text-[10px] font-bold text-[#0a0b0f]">
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <Link href={href} className={classes}>
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--flow-accent)] text-[10px] font-bold text-[#0a0b0f]">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function FlowSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const isDay = pathname === '/flow';
  const isEncounter = pathname.startsWith('/flow/encounter');
  const isInbox = pathname === '/flow/inbox';

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Mini calendar state
  const selectedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [calendarMonth, setCalendarMonth] = useState(selectedDate);

  function handleSelectDate(date: string) {
    const view = searchParams.get('view') || 'day';
    // Use replaceState + custom event instead of router.push to avoid
    // re-suspending useSearchParams and triggering a full page re-render
    const params = new URLSearchParams();
    params.set('view', view);
    params.set('date', date);
    window.history.replaceState(null, '', `/flow?${params.toString()}`);
    window.dispatchEvent(new CustomEvent('flow-navigate', { detail: { date, view } }));
  }

  // Extract initials from session name or email
  const name = session?.user?.name || session?.user?.email || '';
  const initials = name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <nav className="flex w-[200px] min-w-[200px] flex-col border-r border-[var(--flow-sidebar-border)] bg-[var(--flow-sidebar-bg)] px-3 py-5">
      {/* Logo */}
      <div className="mb-5 flex items-center gap-2.5 border-b border-[var(--flow-sidebar-border)] px-2 pb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#d97706] to-[#f59e0b] text-lg font-bold text-[#0a0b0f]">
          ⚡
        </div>
        <span className="font-flow-heading text-lg tracking-tight text-[#e4e4e7]">
          flow
        </span>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-0.5">
        <NavItem icon="☀" label="The Day" href="/flow" active={isDay} />
        <NavItem
          icon="◧"
          label="Encounter"
          href="/flow"
          active={isEncounter}
          disabled={!isEncounter}
        />
        <NavItem icon="☐" label="Inbox" href="/flow/inbox" active={isInbox} />
      </div>

      {/* Mini Calendar */}
      {isDay && (
        <div className="mt-4 border-t border-[var(--flow-sidebar-border)] px-1 pt-4">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            viewMonth={calendarMonth}
            onChangeMonth={setCalendarMonth}
          />
        </div>
      )}

      {/* Provider chip at bottom */}
      <div className="relative mt-auto border-t border-[var(--flow-sidebar-border)] pt-2.5" ref={menuRef}>
        {showMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-[var(--flow-sidebar-border)] bg-[#1a1d2b] py-1 shadow-lg">
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#9ca3af] hover:bg-white/[0.06] hover:text-[#e4e4e7]"
            >
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#374151] to-[#4b5563] text-[11px] font-semibold text-[#d1d5db]">
            {initials}
          </div>
          <div className="min-w-0 text-left">
            <div className="truncate text-[13px] font-medium text-[#e4e4e7]">
              {session?.user?.name || 'Provider'}
            </div>
            <div className="truncate text-[11px] text-[#6b7280]">Moonlit</div>
          </div>
        </button>
      </div>
    </nav>
  );
}
