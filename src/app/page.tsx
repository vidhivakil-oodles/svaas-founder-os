'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';

const PHASES = [
  { name: 'Foundation', phases: ['P0'], color: 'emerald' },
  { name: 'Product', phases: ['P1', 'P2'], color: 'blue' },
  { name: 'Validation', phases: ['P3', 'P4'], color: 'amber' },
  { name: 'Launch', phases: ['P5'], color: 'purple' },
  { name: 'Scale', phases: ['P6', 'P7', 'P8'], color: 'rose' },
];

function getCurrentPhaseIndex(tasks: any[]) {
  // Current phase = earliest phase with incomplete critical tasks
  for (let i = 0; i < PHASES.length; i++) {
    const phaseTasks = tasks.filter((t: any) => PHASES[i].phases.includes(t.phase) && t.priority === 'CRITICAL');
    const incomplete = phaseTasks.filter((t: any) => t.status !== 'done');
    if (incomplete.length > 0) return i;
  }
  return PHASES.length - 1;
}

function getDecisionOfTheDay(decisions: any[]) {
  const pending = decisions.filter((d: any) => d.status === 'pending');
  if (pending.length === 0) return null;
  // Rank by: overdue first, then by position in list (already ordered by importance in seed)
  const overdue = pending.filter((d: any) => d.deadline && new Date(d.deadline) < new Date());
  if (overdue.length > 0) return overdue[0];
  return pending[0];
}

function getBottleneck(tasks: any[], dayNumber: number) {
  const blocked = tasks.filter((t: any) => t.status === 'blocked');
  if (blocked.length > 0) {
    const critical = blocked.find((t: any) => t.priority === 'CRITICAL') || blocked[0];
    return { title: critical.title, reason: critical.blockedReason, type: 'Blocked Task' };
  }
  const overdue = tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd)
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999));
  if (overdue.length > 0) return { title: overdue[0].title, reason: `${dayNumber - overdue[0].dayRangeEnd}d overdue`, type: 'Overdue Critical' };
  return null;
}

function getMostImportantConversation(tasks: any[], dayNumber: number) {
  // Tasks involving people (QP, CA, vendors, partners) that are overdue or due soon
  const peopleKeywords = ['Confirm', 'Engage', 'Contact', 'Visit', 'Call', 'Meet', 'Schedule', 'Negotiate'];
  const peopleTasks = tasks.filter((t: any) => 
    t.status === 'not_started' && !t.blockedReason &&
    peopleKeywords.some(k => t.title.includes(k))
  ).sort((a: any, b: any) => {
    const pri: any = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (pri[b.priority] || 0) - (pri[a.priority] || 0);
  });
  return peopleTasks[0] || null;
}

export default function HomePage() {
  const { state, isLoaded } = useAppState();
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((t: any) => t.status === 'done').length;
  const currentPhaseIdx = getCurrentPhaseIndex(state.tasks);
  const bottleneck = getBottleneck(state.tasks, dayNumber);
  const topDecision = getDecisionOfTheDay(state.decisions);
  const conversation = getMostImportantConversation(state.tasks, dayNumber);
  const topTask = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0];
  
  // Momentum
  const thisWeekDone = state.tasks.filter((t: any) => {
    if (!t.completedAt) return false;
    const d = new Date(t.completedAt);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return d >= weekStart;
  }).length;
  const decisionsThisWeek = state.decisions.filter((d: any) => {
    if (!d.decidedAt) return false;
    const dt = new Date(d.decidedAt);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return dt >= weekStart;
  }).length;
  const daysActive = state.dailyEngagement.filter((e: any) => {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return new Date(e.date) >= weekStart && e.hadActivity;
  }).length;

  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;
  const nextMilestone = state.milestones.find((m: any) => m.status !== 'achieved') || state.milestones[0];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-4">
        <p className="text-zinc-500 text-sm">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch} days to launch</p>
        <h1 className="text-3xl font-bold text-zinc-100 mt-1">SVAAS</h1>
      </div>

      {/* Venture Timeline (Visual) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {PHASES.map((phase, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-2 rounded-full ${
                i < currentPhaseIdx ? 'bg-emerald-600' :
                i === currentPhaseIdx ? 'bg-amber-500' : 'bg-zinc-800'
              }`} />
              <span className={`text-xs ${i === currentPhaseIdx ? 'text-amber-400 font-medium' : i < currentPhaseIdx ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {phase.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CEO Brief — 5 Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">CEO Brief</h2>

        {/* Biggest Bottleneck */}
        <div className="border border-red-900/40 bg-red-950/10 rounded-xl p-4">
          <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-1">Biggest Bottleneck</p>
          {bottleneck ? (
            <>
              <p className="text-zinc-100 font-medium">{bottleneck.title}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{bottleneck.reason} &bull; {bottleneck.type}</p>
            </>
          ) : (
            <p className="text-zinc-400">No blockers detected. Path is clear.</p>
          )}
        </div>

        {/* Most Important Decision */}
        {topDecision && (
          <Link href="/decisions" className="block border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 hover:border-amber-700/40 transition-colors">
            <p className="text-xs text-amber-400 uppercase tracking-wide font-medium mb-1">Decision Needed</p>
            <p className="text-zinc-100 font-medium">{topDecision.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              {topDecision.deadline && new Date(topDecision.deadline) < new Date() ? 'OVERDUE' : `Due: ${topDecision.deadline}`}
              {topDecision.defaultOption && ` • Default: ${topDecision.defaultOption}`}
            </p>
            <p className="text-xs text-amber-400/70 mt-2">Cost of waiting: every day undecided delays downstream work →</p>
          </Link>
        )}

        {/* Most Important Conversation */}
        {conversation && (
          <div className="border border-blue-900/40 bg-blue-950/10 rounded-xl p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wide font-medium mb-1">Conversation Needed</p>
            <p className="text-zinc-100 font-medium">{conversation.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{conversation.department} &bull; {conversation.owner}</p>
          </div>
        )}

        {/* Most Important Task */}
        {topTask && (
          <Link href="/today" className="block border border-zinc-800 bg-zinc-900/30 rounded-xl p-4 hover:border-zinc-600 transition-colors">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">Top Task</p>
            <p className="text-zinc-100 font-medium">{topTask.title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{topTask.department} &bull; {topTask.owner} &bull; Due Day {topTask.dayRangeEnd || '—'}</p>
          </Link>
        )}

        {/* Biggest Opportunity */}
        <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-4">
          <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium mb-1">Biggest Opportunity</p>
          <p className="text-zinc-100 font-medium">
            {nextMilestone ? `Reach "${nextMilestone.title}" in ${Math.max(0, nextMilestone.dayTarget - dayNumber)} days` : 'Launch SVAAS'}
          </p>
          <p className="text-sm text-zinc-500 mt-0.5">{doneTasks}/{totalTasks} tasks complete &bull; {daysToLaunch} days remaining</p>
        </div>
      </div>

      {/* Momentum */}
      <div className="border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">This Week</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">{thisWeekDone}</div>
            <div className="text-xs text-zinc-600">Tasks Done</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{decisionsThisWeek}</div>
            <div className="text-xs text-zinc-600">Decisions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-200">{daysActive}</div>
            <div className="text-xs text-zinc-600">Days Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-200">{doneTasks}</div>
            <div className="text-xs text-zinc-600">Total Done</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800">
        <Link href="/today" className="px-4 py-2.5 rounded-xl border-2 border-emerald-800/50 bg-emerald-950/20 hover:border-emerald-700/50 text-sm text-emerald-400 font-medium transition-colors">Today&apos;s Actions</Link>
        <Link href="/decisions" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Decisions</Link>
        <Link href="/milestones" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Milestones</Link>
        <Link href="/dependencies" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Dependencies</Link>
        <Link href="/admin" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Admin</Link>
        <Link href="/trust" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Trust</Link>
      </nav>
    </div>
  );
}
