'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';

function getConsequence(task: any) {
  const dept = task.department;
  if (dept === 'LEGAL') return 'LLP formation, trademark, and bank account all wait.';
  if (dept === 'COMPLIANCE' && task.category === 'QP') return 'No QP → no licence → no manufacturing → no launch.';
  if (dept === 'COMPLIANCE' && task.category === 'Licence') return 'Licence delayed → public launch delayed.';
  if (dept === 'COMPLIANCE') return 'Compliance chain stalls. Inspector readiness delayed.';
  if (dept === 'PRODUCT' && task.category === 'Formula') return 'Cannot produce, test, or sell without locked formula.';
  if (dept === 'PRODUCT' && task.category === 'SOP') return 'No SOP → inconsistent batches → quality risk.';
  if (dept === 'PACKAGING') return 'Packaging delays hold up all customer-facing work.';
  if (dept === 'BRAND') return 'Brand work blocked → website, content, launch delayed.';
  if (dept === 'FINANCE') return 'Financial infrastructure gaps create chaos at scale.';
  if (dept === 'SUPPLY CHAIN') return 'Ingredient sourcing delays stop production.';
  if (task.notesDependencies) return task.notesDependencies.slice(0, 100);
  return 'Progress stalls. Launch timeline extends.';
}

function getWinMessage(task: any) {
  if (task.priority === 'CRITICAL') return `You removed a critical blocker in ${task.department}.`;
  if (task.category === 'Decision') return 'Decision made. Downstream work can now proceed.';
  return `${task.department} stream advances.`;
}

export default function TodayPage() {
  const { state, markTaskDone } = useAppState();
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [wins, setWins] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<string | null>(null);
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  const actionable = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && !doneIds.includes(t.id))
    .sort((a: any, b: any) => {
      const pri: any = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = (pri[b.priority] || 0) - (pri[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999);
    })
    .slice(0, 3);

  const dueThisWeek = state.tasks.filter((t: any) => t.status === 'not_started' && t.dayRangeEnd && t.dayRangeEnd <= dayNumber + 7 && t.dayRangeEnd >= dayNumber).length;
  const overdue = state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd).length;
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked').length;
  const pendingDecisions = state.decisions.filter((d: any) => d.status === 'pending').length;
  const nextMilestone = state.milestones.find((m: any) => m.status !== 'achieved');
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  function handleDone(task: any) {
    markTaskDone(task.id);
    setDoneIds(prev => [...prev, task.id]);
    setWins(prev => [...prev, getWinMessage(task)]);
    if (commitment === task.id) setCommitment(null);
  }

  function handleCommit(taskId: string) {
    setCommitment(taskId);
  }

  const committedTask = commitment ? state.tasks.find((t: any) => t.id === commitment) : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-2">
        <p className="text-zinc-500 text-sm">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch}d to launch</p>
        <h1 className="text-3xl font-bold text-zinc-100 mt-1">Good morning, Vidhi.</h1>
      </div>

      {/* Status Bar — replaces "0/358" */}
      <div className="grid grid-cols-4 gap-2">
        <div className="border border-zinc-800 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-zinc-200">{dueThisWeek}</div>
          <div className="text-xs text-zinc-600">Due this week</div>
        </div>
        <div className="border border-red-900/40 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-red-400">{overdue}</div>
          <div className="text-xs text-zinc-600">Overdue</div>
        </div>
        <div className="border border-amber-900/40 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-amber-400">{blocked}</div>
          <div className="text-xs text-zinc-600">Blocked</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-zinc-300">{pendingDecisions}</div>
          <div className="text-xs text-zinc-600">Decisions</div>
        </div>
      </div>

      {/* Daily Commitment */}
      {committedTask && !doneIds.includes(committedTask.id) && (
        <div className="border-2 border-emerald-700/60 bg-emerald-950/20 rounded-xl p-5">
          <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium mb-2">Today&apos;s Commitment</p>
          <h2 className="text-lg font-semibold text-zinc-100">{committedTask.title}</h2>
          <p className="text-sm text-zinc-400 mt-1">{committedTask.department} &bull; {committedTask.owner}</p>
          <button onClick={() => handleDone(committedTask)} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">
            ✓ Done
          </button>
        </div>
      )}

      {/* Wins */}
      {wins.length > 0 && (
        <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-4 space-y-2">
          <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Wins Today</p>
          {wins.map((w, i) => (
            <p key={i} className="text-sm text-emerald-300">✓ {w}</p>
          ))}
        </div>
      )}

      {/* Top 3 Actions with Consequences */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Do These Next</h2>
        {actionable.map((task, i) => (
          <div key={task.id} className={`border ${commitment === task.id ? 'border-emerald-700/50' : 'border-zinc-800'} rounded-xl p-4 space-y-3 bg-zinc-900/20`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl font-bold text-zinc-700">{i + 1}</span>
              <div className="flex-1">
                <h3 className="font-medium text-zinc-100">{task.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{task.department} &bull; {task.owner}</p>
              </div>
            </div>
            <div className="pl-9 space-y-2">
              <div className="text-xs">
                <span className="text-emerald-500">If done → </span>
                <span className="text-zinc-400">{task.notesDependencies ? task.notesDependencies.slice(0, 80) : 'Progress.'}</span>
              </div>
              <div className="text-xs">
                <span className="text-red-400">If ignored → </span>
                <span className="text-zinc-400">{getConsequence(task)}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleDone(task)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">✓ Done</button>
                {!commitment && (
                  <button onClick={() => handleCommit(task.id)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg">Commit to this today</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Milestone */}
      {nextMilestone && (
        <div className="border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Next Milestone</p>
          <p className="text-zinc-200 font-medium mt-1">{nextMilestone.title}</p>
          <p className="text-xs text-zinc-500">{Math.max(0, nextMilestone.dayTarget - dayNumber)}d remaining</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400">Home</Link>
        <Link href="/decisions" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400">Decisions</Link>
        <Link href="/review" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400">Review</Link>
        <Link href="/warroom" className="px-4 py-2 rounded-lg border border-red-900/40 hover:border-red-700/40 text-sm text-red-400">War Room</Link>
      </nav>
    </div>
  );
}
