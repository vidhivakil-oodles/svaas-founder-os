import { getBottlenecks, getDayNumber } from '@/services/venture-engine';
import { MarkDoneButton, BlockTaskButton } from '@/components/shared/task-actions';
import Link from 'next/link';

export default function BottlenecksPage() {
  const bottlenecks = getBottlenecks();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Bottleneck Engine</h1>
        <p className="text-sm text-zinc-500">Auto-detected issues ranked by downstream impact. Day {getDayNumber()}.</p>
      </header>

      {bottlenecks.length === 0 ? (
        <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-lg p-6 text-center">
          <p className="text-emerald-400">No critical bottlenecks detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bottlenecks.map((b, index) => (
            <div key={index} className={`border ${index === 0 ? 'border-red-800/60 bg-red-950/10' : 'border-zinc-800'} rounded-lg p-5`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-600">#{index + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    b.type === 'task_blocked' ? 'bg-red-950 text-red-400' :
                    b.type === 'decision_pending' ? 'bg-amber-950 text-amber-400' :
                    b.type === 'external_wait' ? 'bg-blue-950 text-blue-400' :
                    'bg-zinc-900 text-zinc-400'
                  }`}>
                    {b.type === 'task_blocked' ? 'BLOCKED' :
                     b.type === 'decision_pending' ? 'DECISION' :
                     b.type === 'external_wait' ? 'EXTERNAL' : 'AGING'}
                  </span>
                </div>
                {b.daysStuck > 0 && (
                  <span className="text-xs text-red-400 font-medium">{b.daysStuck}d stuck</span>
                )}
              </div>

              <h3 className="font-semibold text-zinc-100 mb-1">{b.task.title}</h3>
              <p className="text-sm text-zinc-400 mb-2">{b.reason}</p>

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Stream: {b.stream}</span>
                <span>Owner: {b.task.owner}</span>
                {b.downstreamImpact > 0 && (
                  <span className="text-amber-400">Blocks {b.downstreamImpact} tasks</span>
                )}
              </div>

              {b.task.notesDependencies && (
                <p className="text-xs text-zinc-500 mt-2 border-t border-zinc-800 pt-2 italic">
                  {b.task.notesDependencies}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <MarkDoneButton taskId={b.task.id} />
                <BlockTaskButton taskId={b.task.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
