'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SearchTrigger, SearchOverlay } from './search-overlay';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/today', label: 'Today' },
  { href: '/decisions', label: 'Decisions' },
  { href: '/review', label: 'Review' },
];

export function AppNav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center justify-between pt-6 border-t border-[var(--svaas-sand)]">
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--svaas-cream)] text-[var(--svaas-brown-dark)] font-medium'
                    : 'text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <SearchTrigger onClick={() => setSearchOpen(true)} />
      </nav>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export function BackToHome() {
  return (
    <Link href="/" className="text-xs text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] transition-colors">
      ← Home
    </Link>
  );
}
