import { VentureStream } from '@/types';
import Link from 'next/link';

const STATUS_STYLES = {
  green: { dot: 'bg-emerald-500', border: 'border-emerald-900/50', bg: 'bg-emerald-950/10', label: '🟢', text: 'text-emerald-400' },
  yellow: { dot: 'bg-amber-500', border: 'border-amber-900/50', bg: 'bg-amber-950/10', label: '🟡', text: 'text-amber-400' },
  red: { dot: 'bg-red-500', border: 'border-red-900/50', bg: 'bg-red-950/10', label: '🔴', text: 'text-red-400' },
  grey: { dot: 'bg-zinc-600', border: 'border-zinc-800', bg: 'bg-zinc-900/30', label: '⚪', text: 'text-zinc-500' },
};

function StreamCard({ stream }: { stream: VentureStream }) {
  const style = STATUS_STYLES[stream.status];

  return (
    <Link href={`/stream/${stream.slug}`}>
      <div className={`border ${style.border} ${style.bg} rounded-lg p-4 hover:border-zinc-600 transition-all cursor-pointer group`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${style.dot} ${stream.status === 'red' ? 'animate-pulse' : ''}`} />
            <h3 className="font-medium text-zinc-200 group-hover:text-white text-sm">{stream.name}</h3>
          </div>
          {stream.daysSinceMovement > 0 && stream.status !== 'grey' && (
            <span className={`text-xs ${stream.daysSinceMovement > 21 ? 'text-red-400' : stream.daysSinceMovement > 14 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {stream.daysSinceMovement}d ago
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          {stream.currentBottleneck && (
            <div className="flex gap-2">
              <span className="text-zinc-600 shrink-0">Bottleneck:</span>
              <span className="text-zinc-400">{stream.currentBottleneck}</span>
            </div>
          )}
          {stream.waitingOn && (
            <div className="flex gap-2">
              <span className="text-zinc-600 shrink-0">Waiting on:</span>
              <span className="text-zinc-400">{stream.waitingOn}</span>
            </div>
          )}
          {stream.nextMilestone && (
            <div className="flex gap-2">
              <span className="text-zinc-600 shrink-0">Next:</span>
              <span className="text-zinc-400">{stream.nextMilestone}</span>
            </div>
          )}
        </div>

        {/* Mini progress */}
        {stream.taskCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${stream.status === 'green' ? 'bg-emerald-600' : stream.status === 'yellow' ? 'bg-amber-600' : stream.status === 'red' ? 'bg-red-600' : 'bg-zinc-700'}`}
                style={{ width: `${Math.round((stream.tasksDone / stream.taskCount) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-zinc-600">{stream.tasksDone}/{stream.taskCount}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function VentureRadar({ streams }: { streams: VentureStream[] }) {
  const sorted = [...streams].sort((a, b) => {
    const statusOrder = { red: 0, yellow: 1, green: 2, grey: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Stream Health</h2>
      <div className="grid grid-cols-1 gap-3">
        {sorted.map(stream => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    </div>
  );
}
