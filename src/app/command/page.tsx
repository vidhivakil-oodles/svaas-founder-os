'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';
import { useState } from 'react';

export default function CommandCenterPage() {
  const { state, markTaskDone, blockTask, acceptDecisionDefault } = useAppState();
  const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Find highest leverage action (critical, not started, not blocked)
  const actionable = state.tasks
    .filter(t => t.status === 'not_started' && !t.blockedReason)
    .sort((a, b) => {
      const prio = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (prio[b.priority] || 0) - (prio[a.priority] || 0);
    });
  const leverageAction = actionable[0] || null;

  // Bottlenecks
  const blocked = state.tasks.filter(t => t.status === 'blocked').slice(0, 3);

  // Overdue decisions
  const overdueDecisions = state.decisions
    .filter(d => d.status === 'pending' && d.deadline && new Date(d.deadline) < new Date())
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3);

  // Waiting on
  const waitingOn = state.waitingOn.filter(w => w.status === 'active');

  function handleBlock(taskId: string) {
    if (!blockReason.trim()) return;
    blockTask(taskId, blockReason);
    setBlockingTaskId(null);
    setBlockReason('');
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Command Center</h1>
        <p className="text-sm text-zinc-500">What should Vidhi do next?</p>
      </header>

      {/* Highest Leverage Action */}
      {leverageAction && (
        <div className="border-2 border-amber-800/60 bg-amber-950/20 rounded-lg p-5 space-y-3">
          <span className="text-amber-400 font-medium text-sm">🎯 HIGHEST LEVERAGE ACTION TODAY</span>
          <h2 className="text-lg font-semibold text-zinc-100">{leverageAction.title}</h2>
          {leverageAction.notesDependencies && (
            <p className="text-sm text-zinc-400">{leverageAction.notesDependencies}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Owner: {leverageAction.owner}</span>
            <span>Priority: {leverageAction.priority}</span>
            {leverageAction.downstreamCount && <span className="text-amber-400">Unblocks {leverageAction.downstreamCount} tasks</span>}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => markTaskDone(leverageAction.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md font-medium transition-colors">
              ✓ Mark Done
            </button>
            {blockingTaskId === leverageAction.id ? (
              <div className="flex gap-2 items-center">
                <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Why blocked?" className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 w-48" onKeyDown={e => e.key === 'Enter' && handleBlock(leverageAction.id)} autoFocus />
                <button onClick={() => handleBlock(leverageAction.id)} className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-sm rounded">Save</button>
                <button onClick={() => setBlockingTaskId(null)} className="text-zinc-500 text-sm">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setBlockingTaskId(leverageAction.id)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md transition-colors">
                Blocked — Why?
              </button>
            )}
          </div>
        </div>
      )}

      {/* Blocked Items */}
      {blocked.length > 0 && (
        <div className="border border-red-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-red-400">⛔ BLOCKED ({blocked.length})</h3>
          <div className="space-y-2">
            {blocked.map(b => (
              <div key={b.id} className="flex items-start gap-3 text-sm">
                <span className="text-zinc-600 mt-0.5">•</span>
                <div>
                  <span className="text-zinc-300">{b.title}</span>
                  <span className="text-zinc-600"> — {b.blockedReason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Decisions */}
      {overdueDecisions.length > 0 && (
        <div className="border border-amber-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-amber-400">⚡ DECISIONS OVERDUE ({overdueDecisions.length})</h3>
          {overdueDecisions.map(d => (
            <div key={d.id} className="flex items-start justify-between gap-4 py-2">
              <div>
                <p className="text-sm text-zinc-200">{d.title}</p>
                <p className="text-xs text-zinc-500">Impact: {d.impactScore} • Blocks {d.tasksAffected} tasks</p>
              </div>
              <button onClick={() => acceptDecisionDefault(d.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-xs rounded text-white whitespace-nowrap shrink-0">
                Accept: {d.defaultOption}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Waiting On */}
      {waitingOn.length > 0 && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">⏳ WAITING ON ({waitingOn.length})</h3>
          {waitingOn.map(w => (
            <div key={w.id} className="flex items-start gap-3 text-sm">
              <span className="text-zinc-600 mt-0.5">•</span>
              <span className="text-zinc-300">{w.personOrVendor}</span>
              <span className="text-zinc-600">— {w.description}</span>
            </div>
          ))}
        </div>
      )}

      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">← Radar</Link>
        <Link href="/decisions" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Decisions</Link>
        <Link href="/dependencies" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Dependencies</Link>
      </nav>
    </div>
  );
}
