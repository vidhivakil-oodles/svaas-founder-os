'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/lib/state-provider';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'task' | 'decision' | 'journal';
  title: string;
  subtitle: string;
  href?: string;
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--svaas-brown-light)] hover:bg-[var(--svaas-sand)] transition-colors"
      aria-label="Search"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </button>
  );
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { state } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    // Search tasks
    state.tasks
      .filter(t => t.title.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q) || t.department.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach(t => {
        const stream = state.streams.find(s => s.id === t.streamId);
        matched.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `${t.priority} · ${stream?.name || t.department} · ${t.status.replace('_', ' ')}`,
          href: t.streamSlug ? `/stream/${t.streamSlug}` : '/today',
        });
      });

    // Search decisions
    state.decisions
      .filter(d => d.title.toLowerCase().includes(q) || (d.context && d.context.toLowerCase().includes(q)))
      .slice(0, 4)
      .forEach(d => {
        matched.push({
          id: d.id,
          type: 'decision',
          title: d.title,
          subtitle: `${d.status} · ${d.decisionMade || d.defaultOption || ''}`,
          href: '/decisions',
        });
      });

    // Search journal
    (state.journal || [])
      .filter(j => j.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(j => {
        matched.push({
          id: j.id,
          type: 'journal',
          title: j.title,
          subtitle: new Date(j.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          href: '/review',
        });
      });

    setResults(matched);
  }, [query, state]);

  function handleSelect(result: SearchResult) {
    if (result.href) router.push(result.href);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--svaas-ivory)]/95 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-lg mx-auto px-5 pt-16" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-3 bg-white border border-[var(--svaas-sand)] rounded-2xl px-4 py-3 shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--svaas-brown-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, decisions, notes..."
            className="flex-1 text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] bg-transparent outline-none"
          />
          <button onClick={onClose} className="text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] text-lg leading-none">×</button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {/* Group by type */}
            {['task', 'decision', 'journal'].map(type => {
              const group = results.filter(r => r.type === type);
              if (group.length === 0) return null;
              const label = type === 'task' ? 'Tasks' : type === 'decision' ? 'Decisions' : 'Journal';
              return (
                <div key={type}>
                  <p className="text-[10px] text-[var(--svaas-brown-light)] uppercase tracking-widest font-semibold mb-1.5 px-1">{label}</p>
                  <div className="bg-white border border-[var(--svaas-sand)] rounded-2xl overflow-hidden">
                    {group.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        className={`w-full text-left px-4 py-3 hover:bg-[var(--svaas-cream)] transition-colors ${i > 0 ? 'border-t border-[var(--svaas-sand)]' : ''}`}
                      >
                        <p className="text-sm font-medium text-[var(--svaas-brown-dark)] truncate">{r.title}</p>
                        <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{r.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && results.length === 0 && (
          <p className="text-center text-sm text-[var(--svaas-brown-light)] mt-8">No results for &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
