'use client';

import { useState, useRef, useEffect } from 'react';

interface KebabAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

export function KebabMenu({ actions }: { actions: KebabAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--svaas-brown-light)] hover:bg-[var(--svaas-sand)] transition-colors"
        aria-label="More actions"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-40 min-w-[160px] bg-white border border-[var(--svaas-sand)] rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                action.destructive
                  ? 'text-[var(--svaas-clay)] hover:bg-[var(--svaas-clay-light)]'
                  : 'text-[var(--svaas-brown)] hover:bg-[var(--svaas-cream)]'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
