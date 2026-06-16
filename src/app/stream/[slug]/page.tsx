'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AppNav, BackToHome } from '@/components/shared/nav';

const STATUS_ICONS: Record<string, string> = { done: '✓', in_progress: '◐', committed_today: '◉', waiting_on: '⏳', blocked: '⊘', not_started: '○', deferred: '◌' };
const STATUS_COLORS: Record<string, string> = { done: 'text-emerald-400', in_progress: 'text-amber-400', committed_today: 'text-emerald-300', waiting_on: 'text-blue-400', blocked: 'text-red-400', not_started: 'text-zinc-500', deferred: 'text-zinc-600' };
const PRIORITY_WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function getActionableTasks(tasks: any[], dayNumber: number) {
  // Actionable = not done, not deferred. Prioritize: committed > in_progress > blocked > waiting > not_started
  const statusOrder: Record<string, number> = { committed_today: 0, in_progress: 1, blocked: 2, waiting_on: 3, not_started: 4 };

  return tasks
    .filter(t => t.status !== 'done' && t.status !== 'deferred')
    .sort((a, b) => {
      // First by status category
      const sDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (sDiff !== 0) return sDiff;
      // Then by priority
      const pDiff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      // Then by urgency (overdue first, then earliest deadline)
      const aOverdue = a.dayRangeEnd && dayNumber > a.dayRangeEnd ? 1 : 0;
      const bOverdue = b.dayRangeEnd && dayNumber > b.dayRangeEnd ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      return (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999);
    });
}

export default function StreamPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { state, markTaskDone, blockTask, startTask, commitTask, deferTask, waitingOnTask } = useAppState();
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showAll, setShowAll] = useState(false);

  const stream = state.streams.find(s => s.slug === slug);
  if (!stream) return <div className="p-8 text-zinc-500">Stream not found.</div>;

  const tasks = state.tasks.filter(t => t.streamSlug === slug);
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'committed_today').length;
  const deferred = tasks.filter(t => t.status === 'deferred').length;
  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // Use getDayNumber equivalent inline
  const start = new Date('2026-06-01');
  const today = new Date();
  const dayNumber = Math.max(1, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const actionable = getActionableTasks(tasks, dayNumber);
  const top10 = actionable.slice(0, 10);
  const remaining = actionable.slice(10);
  const doneTasks = tasks.filter(t => t.status === 'done');

  function handleBlock(taskId: string) {
    if (!blockReason.trim()) return;
    blockTask(taskId, blockReason);
    setBlockingId(null);
    setBlockReason('');
  }

  function renderTask(task: any) {
    return (
      <div key={task.id} className="flex items-start gap-3 py-3 border-b border-zinc-900 last:border-0">
        <span className={`text-sm mt-0.5 ${STATUS_COLORS[task.status]}`}>{STATUS_ICONS[task.status] || '○'}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{task.title}</p>
          {task.blockedReason && <p className="text-xs text-red-400 mt-0.5">Blocked: {task.blockedReason}</p>}
          {task.status === 'waiting_on' && task.waitingOnPerson && (
            <p className="text-xs text-blue-400 mt-0.5">Waiting on: {task.waitingOnPerson}{task.waitingOnDate ? ` (expected ${task.waitingOnDate})` : ''}</p>
          )}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
            <span>{task.owner}</span>
            <span className={task.priority === 'CRITICAL' ? 'text-red-400' : task.priority === 'HIGH' ? 'text-amber-400' : ''}>{task.priority}</span>
            {task.dayRangeEnd && dayNumber > task.dayRangeEnd && (
              <span className="text-red-400">{dayNumber - task.dayRangeEnd}d overdue</span>
            )}
          </div>
        </div>
        {(task.status === 'not_started' || task.status === 'in_progress' || task.status === 'committed_today') && (
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            <button onClick={() => markTaskDone(task.id)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium">Done</button>
            {task.status === 'not_started' && (
              <>
                <button onClick={() => commitTask(task.id)} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs rounded">Commit</button>
                <button onClick={() => startTask(task.id)} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded">Start</button>
              </>
            )}
            {blockingId === task.id ? (
              <div className="flex gap-1 items-center">
                <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Why?" className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 w-32" onKeyDown={e => e.key === 'Enter' && handleBlock(task.id)} autoFocus />
                <button onClick={() => handleBlock(task.id)} className="px-2 py-1 bg-red-800 text-white text-xs rounded">OK</button>
              </div>
            ) : (
              <button onClick={() => setBlockingId(task.id)} className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-xs rounded">Block</button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <BackToHome />
        <div className="flex items-center gap-3 mt-2">
          <div className={`w-3 h-3 rounded-full ${stream.status === 'red' ? 'bg-red-500 animate-pulse' : stream.status === 'yellow' ? 'bg-amber-500' : stream.status === 'green' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          <h1 className="text-2xl font-bold text-zinc-100">{stream.name}</h1>
        </div>
      </header>

      {/* Bottleneck */}
      {stream.currentBottleneck && (
        <div className="border border-red-900/50 bg-red-950/10 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Current Bottleneck</h3>
          <p className="text-zinc-200">{stream.currentBottleneck}</p>
          {stream.waitingOn && <p className="text-sm text-zinc-500 mt-1">Waiting on: {stream.waitingOn}</p>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-100">{tasks.length}</div>
          <div className="text-xs text-zinc-600">Total</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{done}</div>
          <div className="text-xs text-zinc-600">Done</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-amber-400">{inProgress}</div>
          <div className="text-xs text-zinc-600">Active</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{blocked}</div>
          <div className="text-xs text-zinc-600">Blocked</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-500">{deferred}</div>
          <div className="text-xs text-zinc-600">Deferred</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Top 10 Actionable Tasks */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">Top 10 — What Needs Attention</h3>
          <span className="text-xs text-zinc-600">{actionable.length} actionable of {tasks.length} total</span>
        </div>
        {top10.length === 0 ? (
          <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-lg p-6 text-center">
            <p className="text-emerald-400">All caught up in this stream.</p>
          </div>
        ) : (
          top10.map(renderTask)
        )}
      </div>

      {/* Collapsed remaining */}
      {remaining.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAll ? `Hide ${remaining.length} more tasks ↑` : `Show ${remaining.length} more tasks ↓`}
          </button>
          {showAll && (
            <div className="mt-3 space-y-1 opacity-80">
              {remaining.map(renderTask)}
            </div>
          )}
        </div>
      )}

      {/* Done Tasks (collapsed) */}
      {doneTasks.length > 0 && (
        <details className="border-t border-zinc-800 pt-4">
          <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
            {doneTasks.length} completed tasks
          </summary>
          <div className="mt-3 space-y-1 opacity-60">
            {doneTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className="text-sm text-emerald-400">✓</span>
                <p className="text-sm text-zinc-500 line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <AppNav />
    </div>
  );
}
