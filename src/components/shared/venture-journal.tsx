'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state-provider';
import type { JournalEntry } from '@/lib/persistence';

const ENTRY_ICONS: Record<string, string> = {
  task_completed: '✓',
  task_started: '▸',
  task_committed: '◉',
  task_blocked: '⊘',
  task_waiting_on: '⏳',
  task_deferred: '◌',
  task_cancelled: '✗',
  decision_made: '◇',
  decision_deferred: '↻',
  waiting_on_received: '✓',
  milestone_gate_met: '★',
  daily_reset: '↺',
  deferred_resurfaced: '↑',
  manual_note: '✎',
};

const ENTRY_COLORS: Record<string, string> = {
  task_completed: 'text-emerald-400 border-emerald-900/40',
  task_started: 'text-amber-400 border-amber-900/40',
  task_committed: 'text-emerald-300 border-emerald-900/30',
  task_blocked: 'text-red-400 border-red-900/40',
  task_waiting_on: 'text-blue-400 border-blue-900/40',
  task_deferred: 'text-zinc-500 border-zinc-700',
  task_cancelled: 'text-zinc-500 border-zinc-700',
  decision_made: 'text-emerald-400 border-emerald-900/40',
  decision_deferred: 'text-amber-400 border-amber-900/40',
  waiting_on_received: 'text-emerald-400 border-emerald-900/40',
  milestone_gate_met: 'text-amber-300 border-amber-900/40',
  daily_reset: 'text-zinc-500 border-zinc-800',
  deferred_resurfaced: 'text-blue-400 border-blue-900/40',
  manual_note: 'text-zinc-300 border-zinc-700',
};

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
  /** Filter to only show entries from this week */
  thisWeekOnly?: boolean;
  /** Max entries to show */
  maxEntries?: number;
  /** Show the manual note input */
  showNoteInput?: boolean;
  /** Compact mode for embedding */
  compact?: boolean;
}

export function VentureJournal({ thisWeekOnly = false, maxEntries = 50, showNoteInput = true, compact = false }: VentureJournalProps) {
  const { state, addManualNote } = useAppState();
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'actions' | 'notes' | 'decisions'>('all');

  // Get journal entries
  let entries: JournalEntry[] = [...(state.journal || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter to this week if needed
  if (thisWeekOnly) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    entries = entries.filter(e => new Date(e.createdAt) >= weekStart);
  }

  // Apply type filter
  if (filter === 'actions') {
    entries = entries.filter(e => ['task_completed', 'task_started', 'task_committed'].includes(e.type));
  } else if (filter === 'notes') {
    entries = entries.filter(e => e.type === 'manual_note');
  } else if (filter === 'decisions') {
    entries = entries.filter(e => ['decision_made', 'decision_deferred'].includes(e.type));
  }

  // Limit
  entries = entries.slice(0, maxEntries);

  const grouped = groupByDate(entries);

  function handleAddNote() {
    if (!note.trim()) return;
    addManualNote(note.trim());
    setNote('');
  }

  // Summary stats for this week
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
        <div className="border border-zinc-800 rounded-lg p-3">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              placeholder="Add a note to the venture journal..."
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleAddNote}
              disabled={!note.trim()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Week Summary */}
      {!compact && (
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>This week: <span className="text-emerald-400 font-medium">{weekStats.completed} done</span></span>
          <span><span className="text-zinc-300 font-medium">{weekStats.decisions}</span> decisions</span>
          <span><span className="text-zinc-300 font-medium">{weekStats.notes}</span> notes</span>
          <span className="text-zinc-600">{weekStats.total} total entries</span>
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="flex gap-1">
          {(['all', 'actions', 'decisions', 'notes'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === f ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
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
          <p className="text-zinc-500 text-sm">No journal entries yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Complete a task, make a decision, or add a note to start your venture memory.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dateEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs text-zinc-600 font-medium">{date}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="space-y-1.5">
                {dateEntries.map(entry => {
                  const icon = ENTRY_ICONS[entry.type] || '•';
                  const colorClass = ENTRY_COLORS[entry.type] || 'text-zinc-400 border-zinc-800';
                  const [textColor, borderColor] = colorClass.split(' ');

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 py-2 pl-3 border-l-2 ${borderColor}`}
                    >
                      <span className={`text-sm mt-0.5 ${textColor}`}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${entry.type === 'manual_note' ? 'text-zinc-200 italic' : 'text-zinc-300'}`}>
                          {entry.title}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-600 shrink-0">{formatRelativeTime(entry.createdAt)}</span>
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
 * Compact week summary for the Review page's "What happened this week?" step
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
        <p className="text-zinc-500 text-sm">No activity recorded this week.</p>
        <p className="text-zinc-600 text-xs mt-1">Start completing tasks to build your venture memory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="border border-zinc-800 rounded-lg p-3">
          <div className="text-xl font-bold text-emerald-400">{completed.length}</div>
          <div className="text-xs text-zinc-600">Completed</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3">
          <div className="text-xl font-bold text-zinc-200">{decisions.length}</div>
          <div className="text-xs text-zinc-600">Decisions Made</div>
        </div>
      </div>

      {/* Narrative */}
      <div className="space-y-2">
        {completed.length > 0 && (
          <div>
            <p className="text-xs text-emerald-400 font-medium mb-1">Completed</p>
            {completed.slice(0, 5).map(e => (
              <p key={e.id} className="text-sm text-zinc-300 py-0.5">✓ {e.title}</p>
            ))}
            {completed.length > 5 && <p className="text-xs text-zinc-600">+{completed.length - 5} more</p>}
          </div>
        )}

        {decisions.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1">Decisions</p>
            {decisions.map(e => (
              <p key={e.id} className="text-sm text-zinc-300 py-0.5">◇ {e.title}</p>
            ))}
          </div>
        )}

        {blocked.length > 0 && (
          <div>
            <p className="text-xs text-red-400 font-medium mb-1">Got Blocked</p>
            {blocked.slice(0, 3).map(e => (
              <p key={e.id} className="text-sm text-zinc-400 py-0.5">⊘ {e.title}</p>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1">Notes</p>
            {notes.map(e => (
              <p key={e.id} className="text-sm text-zinc-300 italic py-0.5">&ldquo;{e.title}&rdquo;</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
