'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';

const STATUS_STYLES = {
  green: { dot: 'bg-emerald-500', border: 'border-emerald-900/50', bg: 'bg-emerald-950/10' },
  yellow: { dot: 'bg-amber-500', border: 'border-amber-900/50', bg: 'bg-amber-950/10' },
  red: { dot: 'bg-red-500', border: 'border-red-900/50', bg: 'bg-red-950/10' },
  grey: { dot: 'bg-zinc-600', border: 'border-zinc-800', bg: 'bg-zinc-900/30' },
};

function getDayNumber() {
  const launchStart = new Date('2026-04-18');
  const today = new Date();
  return Math.max(1, Math.floor((today.getTime() - launchStart.getTime()) / (1000 * 60 * 60 * 24)));
}

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function calculateStreamStatus(stream: any, tasks: any[]): 'green' | 'yellow' | 'red' | 'grey' {
  if (stream.status === 'grey') return 'grey';
  const streamTasks = tasks.filter((t: any) => t.streamId === stream.id);
  const blocked = streamTasks.filter((t: any) => t.status === 'blocked');
  const days = getDaysSince(stream.lastMovementAt);
  
  if (days <= 7 && blocked.length === 0) return 'green';
  if (days <= 14) return 'yellow';
  return 'red';
}

export default function HomePage() {
  const { state, isLoaded } = useAppState();

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;
  }

  const dayNumber = getDayNumber();
  const totalDays = 180;
  const progress = Math.min(Math.round((dayNumber / totalDays) * 100), 100);

  // Calculate stream health
  const streamsWithHealth = state.streams.map(s => {
    const streamTasks = state.tasks.filter(t => t.streamId === s.id);
    const status = calculateStreamStatus(s, state.tasks);
    return {
      ...s,
      status,
      taskCount: streamTasks.length,
      tasksDone: streamTasks.filter(t => t.status === 'done').length,
      daysSinceMovement: getDaysSince(s.lastMovementAt),
    };
  });

  const redCount = streamsWithHealth.filter(s => s.status === 'red').length;
  const yellowCount = streamsWithHealth.filter(s => s.status === 'yellow').length;
  const greenCount = streamsWithHealth.filter(s => s.status === 'green').length;
  const greyCount = streamsWithHealth.filter(s => s.status === 'grey').length;

  // Find highest leverage action
  const actionable = state.tasks.filter(t => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL');
  const leverageAction = actionable.length > 0 ? actionable[0] : null;

  // Overdue decisions
  const overdueDecisions = state.decisions.filter(d => {
    if (d.status !== 'pending' || !d.deadline) return false;
    return new Date(d.deadline) < new Date();
  });

  // Dream protection
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeekActivity = state.dailyEngagement.filter(e => {
    return new Date(e.date) >= weekStart && e.hadActivity;
  }).length;

  // Momentum (simplified)
  const momentumScores = streamsWithHealth.filter(s => s.status !== 'grey').map(s => s.daysSinceMovement === 999 ? 0 : Math.max(0, 100 - s.daysSinceMovement * 4));
  const momentumScore = momentumScores.length > 0 ? Math.round(momentumScores.reduce((a, b) => a + b, 0) / momentumScores.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SVAAS Venture Radar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Day {dayNumber} of {totalDays} &bull; Target: Public Launch
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-0.5 justify-end">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < thisWeekActivity ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-1">{thisWeekActivity}/5 days active</p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-600">
          <span>{progress}% elapsed</span>
          <span>Momentum: {momentumScore}/100</span>
        </div>
      </div>

      {/* Highest Leverage Action */}
      {leverageAction && (
        <Link href="/command" className="block">
          <div className="border border-amber-900/50 bg-amber-950/20 rounded-lg p-4 hover:border-amber-700/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500 text-sm font-medium">🎯 Highest Leverage Action</span>
            </div>
            <p className="text-zinc-100 font-medium">{leverageAction.title}</p>
            <p className="text-zinc-500 text-sm mt-1 line-clamp-1">{leverageAction.notesDependencies}</p>
          </div>
        </Link>
      )}

      {/* Stream Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Stream Health</h2>
        {streamsWithHealth
          .sort((a, b) => {
            const order = { red: 0, yellow: 1, green: 2, grey: 3 };
            return order[a.status] - order[b.status];
          })
          .map(stream => {
            const style = STATUS_STYLES[stream.status];
            return (
              <Link href={`/stream/${stream.slug}`} key={stream.id}>
                <div className={`border ${style.border} ${style.bg} rounded-lg p-4 hover:border-zinc-600 transition-all cursor-pointer mb-3`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${style.dot} ${stream.status === 'red' ? 'animate-pulse' : ''}`} />
                      <h3 className="font-medium text-zinc-200 text-sm">{stream.name}</h3>
                    </div>
                    {stream.daysSinceMovement < 999 && stream.status !== 'grey' && (
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
                  </div>
                  {stream.taskCount > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stream.status === 'green' ? 'bg-emerald-600' : stream.status === 'yellow' ? 'bg-amber-600' : stream.status === 'red' ? 'bg-red-600' : 'bg-zinc-700'}`} style={{ width: `${Math.round((stream.tasksDone / stream.taskCount) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-zinc-600">{stream.tasksDone}/{stream.taskCount}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
      </div>

      {/* Summary */}
      <div className="border border-zinc-800 rounded-lg p-4 grid grid-cols-4 gap-2 text-center">
        <div><div className="text-lg font-bold text-red-400">{redCount}</div><div className="text-xs text-zinc-600">Red</div></div>
        <div><div className="text-lg font-bold text-amber-400">{yellowCount}</div><div className="text-xs text-zinc-600">Yellow</div></div>
        <div><div className="text-lg font-bold text-emerald-400">{greenCount}</div><div className="text-xs text-zinc-600">Green</div></div>
        <div><div className="text-lg font-bold text-zinc-500">{greyCount}</div><div className="text-xs text-zinc-600">Grey</div></div>
      </div>

      {/* Navigation */}
      <nav className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-4 border-t border-zinc-800">
        <Link href="/command" className="text-center py-3 px-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">Command</Link>
        <Link href="/decisions" className="text-center py-3 px-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">Decisions ({overdueDecisions.length})</Link>
        <Link href="/dependencies" className="text-center py-3 px-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">Dependencies</Link>
        <Link href="/review" className="text-center py-3 px-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">Review</Link>
        <Link href="/admin" className="text-center py-3 px-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">Admin</Link>
      </nav>
    </div>
  );
}
