'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';
import { AppNav } from '@/components/shared/nav';

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
    if (phaseTasks.some((t: any) => t.status !== 'done')) return i;
  }
  return PHASES.length - 1;
}

export default function HomePage() {
  const { state, isLoaded, markTaskDone, acceptDecisionDefault, commitTask } = useAppState();
  const [showMore, setShowMore] = useState(false);
  const [scheduledConvo, setScheduledConvo] = useState(false);
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const currentPhaseIdx = getCurrentPhaseIndex(state.tasks);
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;
  const overdue = state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd);
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked');
  const doneTasks = state.tasks.filter((t: any) => t.status === 'done').length;

  const bottleneckTask = (() => {
    if (blocked.length > 0) return blocked.find((t: any) => t.priority === 'CRITICAL') || blocked[0];
    if (overdue.length > 0) return overdue[0];
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
  const milestoneGatesRemaining = nextMilestone ? nextMilestone.gateCriteria.filter((g: any) => !g.met).length : 0;

  const hasActivity = doneTasks > 0;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeekDone = state.tasks.filter((t: any) => t.completedAt && new Date(t.completedAt) >= weekStart).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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

      {/* ACTIONABLE CEO BRIEF */}
      <div className="space-y-3">

        {/* Bottleneck — actionable */}
        {bottleneckTask && (
          <div className="border border-red-900/40 bg-red-950/10 rounded-xl p-4 space-y-3">
            <p className="text-xs text-red-400 uppercase tracking-wide font-medium">Bottleneck</p>
            <p className="text-zinc-100 font-medium">{bottleneckTask.title}</p>
            <p className="text-xs text-zinc-500">{bottleneckTask.blockedReason || `${dayNumber - (bottleneckTask.dayRangeEnd || 0)}d overdue`}</p>
            <p className="text-xs text-red-400/70">If ignored → downstream work stays frozen.</p>
            <div className="flex gap-2">
              {bottleneckTask.status !== 'blocked' && (
                <button onClick={() => markTaskDone(bottleneckTask.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">✓ Resolved</button>
              )}
              <Link href="/warroom" className="px-3 py-1.5 border border-red-900/40 text-red-400 text-xs rounded-lg hover:border-red-700/40">See all blocked →</Link>
            </div>
          </div>
        )}

        {/* Decision — one-click resolve */}
        {topDecision && (
          <div className="border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 space-y-3">
            <p className="text-xs text-amber-400 uppercase tracking-wide font-medium">Decision Needed</p>
            <p className="text-zinc-100 font-medium">{topDecision.title}</p>
            <p className="text-xs text-zinc-500">Default: {topDecision.defaultOption}</p>
            <p className="text-xs text-amber-400/70">If ignored → dependent work cannot start until decided.</p>
            <div className="flex gap-2">
              <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">Accept: {topDecision.defaultOption}</button>
              <Link href="/decisions" className="px-3 py-1.5 border border-amber-900/40 text-amber-400 text-xs rounded-lg hover:border-amber-700/40">See options →</Link>
            </div>
          </div>
        )}

        {/* Conversation — mark scheduled */}
        {conversation && !scheduledConvo && (
          <div className="border border-blue-900/40 bg-blue-950/10 rounded-xl p-4 space-y-3">
            <p className="text-xs text-blue-400 uppercase tracking-wide font-medium">Conversation Needed</p>
            <p className="text-zinc-100 font-medium">{conversation.title}</p>
            <p className="text-xs text-zinc-500">{conversation.owner}</p>
            <p className="text-xs text-blue-400/70">If ignored → this person-dependent task stays stuck.</p>
            <div className="flex gap-2">
              <button onClick={() => { markTaskDone(conversation.id); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">✓ Done</button>
              <button onClick={() => setScheduledConvo(true)} className="px-3 py-1.5 border border-blue-900/40 text-blue-400 text-xs rounded-lg hover:border-blue-700/40">Scheduled for later</button>
            </div>
          </div>
        )}
        {scheduledConvo && (
          <div className="border border-blue-900/30 bg-blue-950/5 rounded-xl p-4">
            <p className="text-xs text-blue-400">✓ Conversation scheduled. Follow up tomorrow.</p>
          </div>
        )}

        {/* Waiting On — overdue alerts */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const overdueWait = state.tasks.filter((t: any) => t.status === 'waiting_on' && t.waitingOnDate && new Date(t.waitingOnDate) < today);
          if (overdueWait.length === 0) return null;
          const top = overdueWait[0];
          const daysLate = Math.floor((today.getTime() - new Date(top.waitingOnDate!).getTime()) / (1000*60*60*24));
          return (
            <div className="border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 space-y-3">
              <p className="text-xs text-amber-400 uppercase tracking-wide font-medium">⚠ Follow Up Overdue</p>
              <p className="text-zinc-100 font-medium">{top.title}</p>
              <p className="text-xs text-zinc-500">{top.waitingOnPerson} is {daysLate}d late</p>
              <p className="text-xs text-amber-400/70">If ignored → this dependency stays unresolved. Follow up today.</p>
              <div className="flex gap-2">
                <button onClick={() => markTaskDone(top.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">Received</button>
                <Link href="/today" className="px-3 py-1.5 border border-amber-900/40 text-amber-400 text-xs rounded-lg hover:border-amber-700/40">
                  {overdueWait.length > 1 ? `+${overdueWait.length - 1} more →` : 'Details →'}
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Today's Commitment — Hero */}
        {(() => {
          const commitment = state.tasks.find((t: any) => t.status === 'committed_today');
          if (commitment) {
            return (
              <div className="border-2 border-emerald-600/50 bg-emerald-950/15 rounded-xl p-4 space-y-3">
                <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Today&apos;s Commitment</p>
                <p className="text-zinc-100 font-semibold text-lg">{commitment.title}</p>
                <p className="text-xs text-zinc-500">{commitment.department} &bull; {commitment.owner}</p>
                <div className="flex gap-2">
                  <button onClick={() => markTaskDone(commitment.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">✓ Done</button>
                  <Link href="/today" className="px-3 py-1.5 border border-emerald-900/40 text-emerald-400 text-xs rounded-lg hover:border-emerald-700/40">Manage →</Link>
                </div>
              </div>
            );
          }
          // No commitment yet — suggest committing the top task
          if (topTask) {
            return (
              <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-4 space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">No Commitment Yet</p>
                <p className="text-zinc-100 font-medium">{topTask.title}</p>
                <p className="text-xs text-zinc-500">Suggested based on critical path</p>
                <p className="text-xs text-red-400/70">If ignored → {topTask.notesDependencies ? topTask.notesDependencies.slice(0, 80) : 'Launch timeline extends.'}</p>
                <div className="flex gap-2">
                  <button onClick={() => commitTask(topTask.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">Commit Today</button>
                  <Link href="/today" className="px-3 py-1.5 border border-zinc-700 text-zinc-400 text-xs rounded-lg hover:border-zinc-500">Choose different →</Link>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Top Task — only show if different from commitment and not already shown */}
        {topTask && topTask.id !== conversation?.id && topTask.id !== bottleneckTask?.id && topTask.status !== 'committed_today' && (
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Next Action</p>
            <p className="text-zinc-100 font-medium">{topTask.title}</p>
            <p className="text-xs text-zinc-500">{topTask.owner} &bull; Due Day {topTask.dayRangeEnd || '—'}</p>
            <p className="text-xs text-zinc-500">If ignored → {topTask.notesDependencies ? topTask.notesDependencies.slice(0, 80) : 'Launch timeline extends.'}</p>
            <div className="flex gap-2">
              <button onClick={() => markTaskDone(topTask.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">✓ Complete</button>
              <Link href="/today" className="px-3 py-1.5 border border-zinc-700 text-zinc-400 text-xs rounded-lg hover:border-zinc-500">See all actions →</Link>
            </div>
          </div>
        )}

        {/* Opportunity — show what's needed */}
        {nextMilestone && (
          <Link href="/milestones" className="block border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-4 space-y-2 hover:border-emerald-700/40 transition-colors">
            <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Opportunity</p>
            <p className="text-zinc-100 font-medium">Reach &quot;{nextMilestone.title}&quot;</p>
            <p className="text-xs text-zinc-500">{milestoneGatesRemaining} requirements remaining &bull; {Math.max(0, nextMilestone.dayTarget - dayNumber)}d left</p>
            <p className="text-xs text-emerald-400/70">See exact requirements →</p>
          </Link>
        )}
      </div>

      {/* Momentum or Streak Start */}
      {hasActivity ? (
        <div className="border border-zinc-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div><div className="text-xl font-bold text-emerald-400">{thisWeekDone}</div><div className="text-xs text-zinc-600">This week</div></div>
            <div><div className="text-xl font-bold text-zinc-200">{doneTasks}</div><div className="text-xs text-zinc-600">Total done</div></div>
          </div>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-sm">Start your streak today.</p>
          <Link href="/today" className="text-emerald-400 text-sm font-medium hover:text-emerald-300">Complete your first task →</Link>
        </div>
      )}

      {/* Weekly Commitment reminder (show if set recently) */}
      {state.weeklyCommitment && state.weeklyCommitment.weekNumber >= weekNumber - 1 && (
        <div className="border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">This week&apos;s focus (set during review):</p>
          <p className="text-sm text-zinc-200 font-medium">&ldquo;{state.weeklyCommitment.text}&rdquo;</p>
        </div>
      )}

      {/* Primary Nav */}
      <AppNav />

      {/* More */}
      <div className="text-center">
        <button onClick={() => setShowMore(!showMore)} className="text-xs text-zinc-600 hover:text-zinc-400">{showMore ? 'Less ↑' : 'More ↓'}</button>
        {showMore && (
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <Link href="/milestones" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500">Milestones</Link>
            <Link href="/dependencies" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500">Dependencies</Link>
            <Link href="/admin" className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500">Admin</Link>
          </div>
        )}
      </div>
    </div>
  );
}
