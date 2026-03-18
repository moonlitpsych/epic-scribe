'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, Users, FileText, Scale, LogOut, ChevronDown } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Patients', href: '/patients', icon: <Users size={18} /> },
  { label: 'Templates', href: '/templates', icon: <FileText size={18} /> },
  { label: 'DE', href: '/designated-examiner', icon: <Scale size={18} /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/patients') {
      return pathname === '/patients' || pathname.startsWith('/patients/');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="bg-[var(--header-bg)] shadow-lg sticky top-0 z-50 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/patients" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-[var(--accent-primary)]">
                <span className="text-[var(--text-inverse)] font-heading font-bold text-lg">E</span>
              </div>
              <span className="text-[var(--text-primary)] font-heading text-xl hidden sm:block tracking-tight">
                Epic Scribe
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium font-mono tracking-wide transition-all ${
                    isActive(item.href)
                      ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Auth Status (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              {status === 'loading' ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <div className="h-2 w-2 rounded-full bg-[var(--text-muted)] animate-pulse" />
                  Loading...
                </div>
              ) : session?.user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                    <span className="text-[var(--text-secondary)]">{session.user.email}</span>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--accent-warm)] transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">Sign Out</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)]">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              {/* Mobile Auth */}
              {session?.user && (
                <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-muted)]">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                    {session.user.email}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[var(--text-muted)] hover:text-[var(--accent-warm)] transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
