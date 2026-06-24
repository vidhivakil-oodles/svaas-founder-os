'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state-provider';
import type { JournalEntry } from '@/lib/persistence';

const ENTRY_ICONS: Record<string, string> = {
  task_completed: '\u2713',
  task_started: '\u25B8',
  task_committed: '\u25C9',
  task_blocked: '\u2298',
  task_waiting_on: '\u23F3',
  task_deferred: '\u25CC',
  task_cancelled: '\u2717',
  decision_made: '\u25C7',
  decision_deferred: '\u21BB',
  waiting_on_received: '\u2713',
  milestone_gate_met: '\u2605',
  daily_reset: '\u21BA',
  deferred_resurfaced: '\u2191',
  manual_note: '\u270E',
};

function getEntryColor(type: string): { text: string; border: string } {
  switch (type) {
    case 'task_completed':
    case 'decision_made':
    case 'waiting_on_received':
      return { text: 'text-[var(--svaas-olive)]', border: 'border-[var(--svaas-olive)]/30' };
    case 'task_started':
    case 'task_committed':
    case 'milestone_gate_met':
    case 'decision_deferred':
      return { text: 'text-[var(--svaas-amber)]', border: 'border-[var(--svaas-amber)]/30' };
    case 'task_blocked':
      return { text: 'text-[var(--svaas-clay)]', border: 'border-[var(--svaas-clay)]/30' };
    case 'task_waiting_on':
    case 'deferred_resurfaced':
      return { text: 'text-[var(--svaas-slate)]', border: 'border-[var(--svaas-slate)]/30' };
    default:
      return { text: 'text-[var(--svaas-brown-light)]', border: 'border-[var(--svaas-sand)]' };
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function groupByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  const grouped: Record<string, JournalEntry[]> = {};
  entries.forEach(entry => {
    const date = new Date(entry.createdAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  });
  return grouped;
}

interface VentureJournalProps {
  thisWeekOnly?: boolean;
  maxEntries?: number;
  showNoteInput?: boolean;
  compact?: boolean;
}

export function VentureJournal({ thisWeekOnly = false, maxEntries = 50, showNoteInput = true, compact = false }: VentureJournalProps) {
  const { state, addManualNote } = useAppState();
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'actions' | 'notes' | 'decisions'>('all');

  let entries: JournalEntry[] = [...(state.journal || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (thisWeekOnly) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    entries = entries.filter(e => new Date(e.createdAt) >= weekStart);
  }

  if (filter === 'actions') {
    entries = entries.filter(e => ['task_completed', 'task_started', 'task_committed'].includes(e.type));
  } else if (filter === 'notes') {
    entries = entries.filter(e => e.type === 'manual_note');
  } else if (filter === 'decisions') {
    entries = entries.filter(e => ['decision_made', 'decision_deferred'].includes(e.type));
  }

  entries = entries.slice(0, maxEntries);
  const grouped = groupByDate(entries);

  function handleAddNote() {
    if (!note.trim()) return;
    addManualNote(note.trim());
    setNote('');
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const allWeekEntries = (state.journal || []).filter(e => new Date(e.createdAt) >= weekStart);
  const weekStats = {
    completed: allWeekEntries.filter(e => e.type === 'task_completed').length,
    decisions: allWeekEntries.filter(e => e.type === 'decision_made').length,
    notes: allWeekEntries.filter(e => e.type === 'manual_note').length,
    total: allWeekEntries.length,
  };

  return (
    <div className="space-y-4">
      {/* Manual Note Input */}
      {showNoteInput && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            placeholder="Add a note to the venture journal..."
            className="flex-1 px-3 py-2.5 bg-white border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown-light)]"
          />
          <button
            onClick={handleAddNote}
            disabled={!note.trim()}
            className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
          >
            Save
          </button>
        </div>
      )}

      {/* Week Summary */}
      {!compact && (
        <div className="flex items-center gap-4 text-xs text-[var(--svaas-brown-light)]">
          <span>This week: <span className="text-[var(--svaas-olive)] font-medium">{weekStats.completed} done</span></span>
          <span><span className="text-[var(--svaas-brown)] font-medium">{weekStats.decisions}</span> decisions</span>
          <span><span className="text-[var(--svaas-brown)] font-medium">{weekStats.notes}</span> notes</span>
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="flex gap-1">
          {(['all', 'actions', 'decisions', 'notes'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f ? 'bg-[var(--svaas-sand)] text-[var(--svaas-brown-dark)]' : 'text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'actions' ? 'Actions' : f === 'decisions' ? 'Decisions' : 'Notes'}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--svaas-brown-light)]">No journal entries yet.</p>
          <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Complete a task, make a decision, or add a note to start your venture memory.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dateEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-[var(--svaas-sand)]" />
                <span className="text-xs text-[var(--svaas-brown-light)] font-medium">{date}</span>
                <div className="h-px flex-1 bg-[var(--svaas-sand)]" />
              </div>
              <div className="space-y-1.5">
                {dateEntries.map(entry => {
                  const icon = ENTRY_ICONS[entry.type] || '\u2022';
                  const colors = getEntryColor(entry.type);

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 py-2 pl-3 border-l-2 ${colors.border}`}
                    >
                      <span className={`text-sm mt-0.5 ${colors.text}`}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${entry.type === 'manual_note' ? 'text-[var(--svaas-brown)] italic' : 'text-[var(--svaas-brown-dark)]'}`}>
                          {entry.title}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--svaas-brown-light)] shrink-0">{formatRelativeTime(entry.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact week summary for the Review page
 */
export function WeekJournalSummary() {
  const { state } = useAppState();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = [...(state.journal || [])]
    .filter(e => new Date(e.createdAt) >= weekStart)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completed = weekEntries.filter(e => e.type === 'task_completed');
  const decisions = weekEntries.filter(e => e.type === 'decision_made');
  const blocked = weekEntries.filter(e => e.type === 'task_blocked');
  const notes = weekEntries.filter(e => e.type === 'manual_note');

  if (weekEntries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--svaas-brown-light)]">No activity recorded this week.</p>
        <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Start completing tasks to build your venture memory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="border border-[var(--svaas-sand)] rounded-xl p-3">
          <div className="text-xl font-medium text-[var(--svaas-olive)]">{completed.length}</div>
          <div className="text-xs text-[var(--svaas-brown-light)]">Completed</div>
        </div>
        <div className="border border-[var(--svaas-sand)] rounded-xl p-3">
          <div className="text-xl font-medium text-[var(--svaas-brown-dark)]">{decisions.length}</div>
          <div className="text-xs text-[var(--svaas-brown-light)]">Decisions Made</div>
        </div>
      </div>

      <div className="space-y-3">
        {completed.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--svaas-olive)] uppercase tracking-widest font-semibold mb-1">Completed</p>
            {completed.slice(0, 5).map(e => (
              <p key={e.id} className="text-sm text-[var(--svaas-brown)] py-0.5">&#10003; {e.title}</p>
            ))}
            {completed.length > 5 && <p className="text-xs text-[var(--svaas-brown-light)]">+{completed.length - 5} more</p>}
          </div>
        )}

        {decisions.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--svaas-brown-light)] uppercase tracking-widest font-semibold mb-1">Decisions</p>
            {decisions.map(e => (
              <p key={e.id} className="text-sm text-[var(--svaas-brown)] py-0.5">&#9671; {e.title}</p>
            ))}
          </div>
        )}

        {blocked.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--svaas-clay)] uppercase tracking-widest font-semibold mb-1">Got Blocked</p>
            {blocked.slice(0, 3).map(e => (
              <p key={e.id} className="text-sm text-[var(--svaas-brown)] py-0.5">&#8856; {e.title}</p>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--svaas-brown-light)] uppercase tracking-widest font-semibold mb-1">Notes</p>
            {notes.map(e => (
              <p key={e.id} className="text-sm text-[var(--svaas-brown)] italic py-0.5">&ldquo;{e.title}&rdquo;</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
