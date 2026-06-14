'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';

const STATUS_ICONS: Record<string, string> = { done: '✓', in_progress: '◐', blocked: '⊘', not_started: '○', deferred: '◌' };
const STATUS_COLORS: Record<string, string> = { done: 'text-emerald-400', in_progress: 'text-amber-400', blocked: 'text-red-400', not_started: 'text-zinc-500', deferred: 'text-zinc-600' };

export default function StreamPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { state, markTaskDone, blockTask, startTask } = useAppState();
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const stream = state.streams.find(s => s.slug === slug);
  if (!stream) return <div className="p-8 text-zinc-500">Stream not found.</div>;

  const tasks = state.tasks.filter(t => t.streamSlug === slug);
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

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
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-100">{tasks.length}</div>
          <div className="text-xs text-zinc-600">Total</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{done}</div>
          <div className="text-xs text-zinc-600">Done</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{blocked}</div>
          <div className="text-xs text-zinc-600">Blocked</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-400">{progress}%</div>
          <div className="text-xs text-zinc-600">Progress</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Task List */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Tasks</h3>
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3 py-2.5 border-b border-zinc-900 last:border-0">
            <span className={`text-sm mt-0.5 ${STATUS_COLORS[task.status]}`}>{STATUS_ICONS[task.status]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{task.title}</p>
              {task.blockedReason && <p className="text-xs text-red-400 mt-0.5">Blocked: {task.blockedReason}</p>}
              <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                <span>{task.owner}</span>
                <span>{task.priority}</span>
              </div>
            </div>
            {task.status === 'not_started' && !task.blockedReason && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => markTaskDone(task.id)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium">Done</button>
                <button onClick={() => startTask(task.id)} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded">Start</button>
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
        ))}
      </div>
    </div>
  );
}
