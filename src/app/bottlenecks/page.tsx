'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';
import { useState } from 'react';

import { getDayNumber } from '@/lib/venture-config';

export default function BottlenecksPage() {
  const { state, markTaskDone, blockTask } = useAppState();
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const dayNumber = getDayNumber();

  // Find bottlenecks: blocked tasks + overdue critical tasks
  const bottlenecks = state.tasks
    .filter(t => t.status === 'blocked' || (t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd))
    .map(t => {
      const stream = state.streams.find(s => s.id === t.streamId);
      const daysStuck = t.dayRangeEnd ? Math.max(0, dayNumber - t.dayRangeEnd) : 0;
      return { task: t, stream: stream?.name || 'Unknown', streamSlug: stream?.slug || '', daysStuck, reason: t.blockedReason || `Overdue by ${daysStuck} days`, downstreamImpact: t.downstreamCount || 0 };
    })
    .sort((a, b) => (b.downstreamImpact * 2 + b.daysStuck) - (a.downstreamImpact * 2 + a.daysStuck));

  function handleBlock(taskId: string) {
    if (!blockReason.trim()) return;
    blockTask(taskId, blockReason);
    setBlockingId(null);
    setBlockReason('');
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Bottleneck Engine</h1>
        <p className="text-sm text-zinc-500">Auto-detected issues ranked by impact. Day {dayNumber}.</p>
      </header>

      {bottlenecks.length === 0 ? (
        <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-lg p-6 text-center">
          <p className="text-emerald-400">No critical bottlenecks detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bottlenecks.map((b, index) => (
            <div key={b.task.id} className={`border ${index === 0 ? 'border-red-800/60 bg-red-950/10' : 'border-zinc-800'} rounded-lg p-5`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-600">#{index + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${b.task.status === 'blocked' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                    {b.task.status === 'blocked' ? 'BLOCKED' : 'OVERDUE'}
                  </span>
                </div>
                {b.daysStuck > 0 && <span className="text-xs text-red-400 font-medium">{b.daysStuck}d stuck</span>}
              </div>
              <h3 className="font-semibold text-zinc-100 mb-1">{b.task.title}</h3>
              <p className="text-sm text-zinc-400 mb-2">{b.reason}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Stream: {b.stream}</span>
                <span>Owner: {b.task.owner}</span>
                {b.downstreamImpact > 0 && <span className="text-amber-400">Blocks {b.downstreamImpact} tasks</span>}
              </div>
              {b.task.notesDependencies && (
                <p className="text-xs text-zinc-500 mt-2 border-t border-zinc-800 pt-2 italic">{b.task.notesDependencies}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => markTaskDone(b.task.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium">Done</button>
                {blockingId === b.task.id ? (
                  <div className="flex gap-1 items-center">
                    <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Why?" className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 w-40" onKeyDown={e => e.key === 'Enter' && handleBlock(b.task.id)} autoFocus />
                    <button onClick={() => handleBlock(b.task.id)} className="px-2 py-1 bg-red-800 text-white text-xs rounded">OK</button>
                    <button onClick={() => setBlockingId(null)} className="text-zinc-500 text-xs">×</button>
                  </div>
                ) : (
                  b.task.status !== 'blocked' && <button onClick={() => setBlockingId(b.task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded">Block</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
