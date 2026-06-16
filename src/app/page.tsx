'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';

const PHASES = [
  { name: 'Foundation', phases: ['P0'] },
  { name: 'Product', phases: ['P1', 'P2'] },
  { name: 'Validation', phases: ['P3', 'P4'] },
  { name: 'Launch', phases: ['P5'] },
  { name: 'Scale', phases: ['P6', 'P7', 'P8'] },
];

function getCurrentPhaseIndex(tasks: any[]) {
  for (let i = 0; i < PHASES.length; i++) {
    const phaseTasks = tasks.filter((t: any) => PHASES[i].phases.includes(t.phase) && t.priority === 'CRITICAL');
    const incomplete = phaseTasks.filter((t: any) => t.status !== 'done');
    if (incomplete.length > 0) return i;
  }
  return PHASES.length - 1;
}

export default function HomePage() {
  const { state, isLoaded } = useAppState();
  const [showMore, setShowMore] = useState(false);
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const currentPhaseIdx = getCurrentPhaseIndex(state.tasks);
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;
  const overdue = state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd);
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked');
  const doneTasks = state.tasks.filter((t: any) => t.status === 'done').length;

  // CEO Brief items
  const bottleneck = (() => {
    if (blocked.length > 0) {
      const c = blocked.find((t: any) => t.priority === 'CRITICAL') || blocked[0];
      return { title: c.title, sub: c.blockedReason || 'Blocked', type: 'Blocked' };
    }
    if (overdue.length > 0) return { title: overdue[0].title, sub: `${dayNumber - (overdue[0].dayRangeEnd || 0)}d overdue`, type: 'Overdue' };
    return null;
  })();

  const topDecision = state.decisions.find((d: any) => d.status === 'pending');

  const peopleKeywords = ['Confirm', 'Engage', 'Contact', 'Visit', 'Call', 'Meet', 'Schedule'];
  const conversation = state.tasks.find((t: any) =>
    t.status === 'not_started' && !t.blockedReason && peopleKeywords.some((k: string) => t.title.includes(k))
  );

  const topTask = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0];

  const nextMilestone = state.milestones.find((m: any) => m.status !== 'achieved');

  // Momentum — only show if activity exists
  const hasActivity = doneTasks > 0 || state.dailyEngagement.length > 0;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeekDone = state.tasks.filter((t: any) => t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const decisionsThisWeek = state.decisions.filter((d: any) => d.decidedAt && new Date(d.decidedAt) >= weekStart).length;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-4">
        <p className="text-zinc-500 text-sm">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch}d to launch</p>
        <h1 className="text-3xl font-bold text-zinc-100 mt-1">SVAAS</h1>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1">
        {PHASES.map((phase, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-2 rounded-full ${i < currentPhaseIdx ? 'bg-emerald-600' : i === currentPhaseIdx ? 'bg-amber-500' : 'bg-zinc-800'}`} />
            <span className={`text-xs ${i === currentPhaseIdx ? 'text-amber-400 font-medium' : i < currentPhaseIdx ? 'text-emerald-500' : 'text-zinc-600'}`}>{phase.name}</span>
          </div>
        ))}
      </div>

      {/* CEO Brief */}
      <div className="space-y-3">
        {/* Bottleneck */}
        {bottleneck && (
          <div className="border border-red-900/40 bg-red-950/10 rounded-xl p-4">
            <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-1">Bottleneck</p>
            <p className="text-zinc-100 font-medium">{bottleneck.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{bottleneck.sub}</p>
          </div>
        )}

        {/* Decision */}
        {topDecision && (
          <Link href="/decisions" className="block border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 hover:border-amber-700/40 transition-colors">
            <p className="text-xs text-amber-400 uppercase tracking-wide font-medium mb-1">Decision Needed</p>
            <p className="text-zinc-100 font-medium">{topDecision.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">Default: {topDecision.defaultOption}</p>
          </Link>
        )}

        {/* Conversation */}
        {conversation && (
          <div className="border border-blue-900/40 bg-blue-950/10 rounded-xl p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wide font-medium mb-1">Conversation</p>
            <p className="text-zinc-100 font-medium">{conversation.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{conversation.owner}</p>
          </div>
        )}

        {/* Task */}
        {topTask && (
          <Link href="/today" className="block border border-zinc-800 bg-zinc-900/30 rounded-xl p-4 hover:border-zinc-600 transition-colors">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">Top Task</p>
            <p className="text-zinc-100 font-medium">{topTask.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{topTask.owner} &bull; Due Day {topTask.dayRangeEnd || '—'}</p>
          </Link>
        )}

        {/* Opportunity */}
        {nextMilestone && (
          <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium mb-1">Opportunity</p>
            <p className="text-zinc-100 font-medium">Reach &quot;{nextMilestone.title}&quot;</p>
            <p className="text-sm text-zinc-500 mt-0.5">{Math.max(0, nextMilestone.dayTarget - dayNumber)}d remaining</p>
          </div>
        )}
      </div>

      {/* Momentum (hidden when no activity) */}
      {hasActivity ? (
        <div className="border border-zinc-800 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xl font-bold text-emerald-400">{thisWeekDone}</div><div className="text-xs text-zinc-600">Done this week</div></div>
            <div><div className="text-xl font-bold text-amber-400">{decisionsThisWeek}</div><div className="text-xs text-zinc-600">Decisions</div></div>
            <div><div className="text-xl font-bold text-zinc-200">{doneTasks}</div><div className="text-xs text-zinc-600">Total done</div></div>
          </div>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-sm">Start your streak today.</p>
          <Link href="/today" className="text-emerald-400 text-sm font-medium hover:text-emerald-300">Complete your first task →</Link>
        </div>
      )}

      {/* Primary Nav */}
      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/today" className="flex-1 text-center py-3 rounded-xl border-2 border-emerald-800/50 bg-emerald-950/20 hover:border-emerald-700/50 text-sm text-emerald-400 font-medium transition-colors">Today</Link>
        <Link href="/decisions" className="flex-1 text-center py-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 transition-colors">Decisions</Link>
        <Link href="/review" className="flex-1 text-center py-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 transition-colors">Review</Link>
      </nav>

      {/* More */}
      <div className="text-center">
        <button onClick={() => setShowMore(!showMore)} className="text-xs text-zinc-600 hover:text-zinc-400">{showMore ? 'Less ↑' : 'More ↓'}</button>
        {showMore && (
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <Link href="/warroom" className="px-3 py-1.5 rounded-lg border border-red-900/40 text-xs text-red-400 hover:border-red-700/40">War Room</Link>
            <Link href="/milestones" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600">Milestones</Link>
            <Link href="/dependencies" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600">Dependencies</Link>
            <Link href="/bottlenecks" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600">Bottlenecks</Link>
            <Link href="/admin" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600">Admin</Link>
            <Link href="/trust" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:border-zinc-600">Trust</Link>
          </div>
        )}
      </div>
    </div>
  );
}
