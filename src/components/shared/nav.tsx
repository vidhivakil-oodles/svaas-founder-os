'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '◉' },
  { href: '/today', label: 'Today', icon: '▸' },
  { href: '/decisions', label: 'Decisions', icon: '◇' },
  { href: '/review', label: 'Review', icon: '↻' },
  { href: '/warroom', label: 'War Room', icon: '⚡', accent: true },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 pt-4 border-t border-zinc-800 flex-wrap">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href;
        const isAccent = item.accent;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : isAccent
                ? 'border border-red-900/40 text-red-400 hover:border-red-700/40'
                : 'border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            <span className="mr-1.5">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BackToHome() {
  return (
    <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
      ← Home
    </Link>
  );
}
