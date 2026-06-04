import { getStreamBySlug, getTasksForStream, getUpstreamDependencies, getDownstreamDependencies } from '@/services/venture-engine';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const STATUS_ICONS: Record<string, string> = {
  done: '✓',
  in_progress: '◐',
  blocked: '⊘',
  not_started: '○',
  deferred: '◌',
};

const STATUS_COLORS: Record<string, string> = {
  done: 'text-emerald-400',
  in_progress: 'text-amber-400',
  blocked: 'text-red-400',
  not_started: 'text-zinc-500',
  deferred: 'text-zinc-600',
};

export default async function StreamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stream = getStreamBySlug(slug);
  if (!stream) return notFound();

  const tasks = getTasksForStream(slug);
  const upstream = getUpstreamDependencies(slug);
  const downstream = getDownstreamDependencies(slug);

  const doneTasks = tasks.filter(t => t.status === 'done');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const actionableTasks = tasks.filter(t => t.status === 'not_started' && !t.blockedReason);
  const progress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <div className="flex items-center gap-3 mt-2">
          <div className={`w-3 h-3 rounded-full ${
            stream.status === 'red' ? 'bg-red-500 animate-pulse' :
            stream.status === 'yellow' ? 'bg-amber-500' :
            stream.status === 'green' ? 'bg-emerald-500' : 'bg-zinc-600'
          }`} />
          <h1 className="text-2xl font-bold text-zinc-100">{stream.name}</h1>
        </div>
      </header>

      {/* Current Bottleneck */}
      {stream.currentBottleneck && (
        <div className={`border ${stream.status === 'red' ? 'border-red-900/50 bg-red-950/10' : 'border-amber-900/50 bg-amber-950/10'} rounded-lg p-4`}>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Current Bottleneck</h3>
          <p className="text-zinc-200">{stream.currentBottleneck}</p>
          {stream.waitingOn && (
            <p className="text-sm text-zinc-500 mt-1">Waiting on: {stream.waitingOn}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-100">{tasks.length}</div>
          <div className="text-xs text-zinc-600">Total</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{doneTasks.length}</div>
          <div className="text-xs text-zinc-600">Done</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{blockedTasks.length}</div>
          <div className="text-xs text-zinc-600">Blocked</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-400">{stream.daysSinceMovement}</div>
          <div className="text-xs text-zinc-600">Days stalled</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-zinc-600 text-right">{progress}% complete</div>
      </div>

      {/* Dependencies */}
      {(upstream.length > 0 || downstream.length > 0) && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Dependencies</h3>
          {upstream.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 mb-1">Blocked by:</p>
              {upstream.map(d => (
                <div key={d.id} className="text-sm text-red-400 flex items-center gap-2 py-0.5">
                  <span>←</span>
                  <span>{d.upstreamName}</span>
                  <span className="text-xs text-zinc-600">({d.reason})</span>
                </div>
              ))}
            </div>
          )}
          {downstream.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 mb-1">Blocking:</p>
              {downstream.map(d => (
                <div key={d.id} className="text-sm text-amber-400 flex items-center gap-2 py-0.5">
                  <span>→</span>
                  <span>{d.downstreamName}</span>
                  <span className="text-xs text-zinc-600">({d.reason})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">All Tasks</h3>
        <div className="space-y-1">
          {tasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 py-2 border-b border-zinc-900 last:border-0">
              <span className={`text-sm mt-0.5 ${STATUS_COLORS[task.status]}`}>
                {STATUS_ICONS[task.status]}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {task.title}
                </p>
                {task.blockedReason && (
                  <p className="text-xs text-red-400 mt-0.5">Blocked: {task.blockedReason}</p>
                )}
                <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                  <span>{task.owner}</span>
                  <span>{task.priority}</span>
                  {task.dayRangeStart && <span>Day {task.dayRangeStart}-{task.dayRangeEnd}</span>}
                </div>
              </div>
              {task.status === 'not_started' && !task.blockedReason && (
                <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 transition-colors">
                  Done
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
