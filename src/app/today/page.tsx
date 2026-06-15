'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';

function findBottleneck(state: any, dayNumber: number) {
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked');
  if (blocked.length > 0) {
    const critical = blocked.find((t: any) => t.priority === 'CRITICAL') || blocked[0];
    return { task: critical, reason: critical.blockedReason || 'Blocked', type: 'blocked' };
  }
  const overdue = state.tasks
    .filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd)
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999));
  if (overdue.length > 0) {
    return { task: overdue[0], reason: `Overdue by ${dayNumber - overdue[0].dayRangeEnd} days`, type: 'overdue' };
  }
  const pendingDec = state.decisions.filter((d: any) => d.status === 'pending' && d.deadline && new Date(d.deadline) < new Date());
  if (pendingDec.length > 0) {
    return { task: { title: pendingDec[0].title, department: 'DECISION' }, reason: 'Decision overdue', type: 'decision' };
  }
  return null;
}

function getWeekGoal(state: any, dayNumber: number) {
  const milestone = state.milestones.find((m: any) => m.status !== 'achieved');
  if (!milestone) return 'All milestones achieved';
  const daysLeft = milestone.dayTarget - dayNumber;
  if (daysLeft <= 7) return `Complete: ${milestone.title} (${daysLeft}d left)`;
  const criticalInPhase = state.tasks.filter((t: any) => t.priority === 'CRITICAL' && t.status === 'not_started' && t.dayRangeEnd && t.dayRangeEnd <= dayNumber + 7).length;
  if (criticalInPhase > 0) return `${criticalInPhase} critical tasks due this week`;
  return `Progress toward: ${milestone.title}`;
}


function getWhyItMatters(task: any) {
  if (task.notesDependencies) return task.notesDependencies.slice(0, 120);
  if (task.priority === 'CRITICAL') return 'Critical path task — delays here delay launch.';
  return 'Advances the venture forward.';
}

function getEstimatedTime(task: any) {
  if (task.category === 'Decision') return '5-15 min';
  if (task.category === 'QP' || task.category === 'Entity') return '30 min';
  if (task.category === 'SOP' || task.category === 'Formula') return '2-4 hours';
  if (task.category === 'Photography' || task.category === 'Video') return '4-8 hours';
  return '30-60 min';
}

export default function TodayPage() {
  const { state, markTaskDone } = useAppState();
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  const actionable = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && !doneIds.includes(t.id))
    .sort((a: any, b: any) => {
      const pri: any = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = (pri[b.priority] || 0) - (pri[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const aOver = a.dayRangeEnd ? dayNumber - a.dayRangeEnd : -999;
      const bOver = b.dayRangeEnd ? dayNumber - b.dayRangeEnd : -999;
      return bOver - aOver;
    })
    .slice(0, 3);

  const bottleneck = findBottleneck(state, dayNumber);
  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((t: any) => t.status === 'done').length + doneIds.length;
  const pendingDecisions = state.decisions.filter((d: any) => d.status === 'pending').length;
  const nextMilestone = state.milestones.find((m: any) => m.status !== 'achieved') || state.milestones[0];
  const milestoneDaysLeft = nextMilestone ? Math.max(0, nextMilestone.dayTarget - dayNumber) : 0;
  const weekGoal = getWeekGoal(state, dayNumber);

  function handleDone(taskId: string) {
    markTaskDone(taskId);
    setDoneIds(prev => [...prev, taskId]);
  }


  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Founder Brief */}
      <div className="space-y-1 pt-2">
        <p className="text-zinc-500 text-sm">Day {dayNumber} &bull; Week {weekNumber}</p>
        <h1 className="text-3xl font-bold text-zinc-100">Good morning, Vidhi.</h1>
      </div>

      {/* Daily Brief Card */}
      <div className="border border-zinc-800 rounded-xl p-5 space-y-4 bg-zinc-900/30">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">This Week</p>
            <p className="text-sm text-zinc-200 mt-1">{weekGoal}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Next Milestone</p>
            <p className="text-sm text-zinc-200 mt-1">{nextMilestone?.title || '—'}</p>
            <p className="text-xs text-zinc-500">{milestoneDaysLeft}d remaining</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-100">{doneTasks}/{totalTasks}</div>
            <div className="text-xs text-zinc-600">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{pendingDecisions}</div>
            <div className="text-xs text-zinc-600">Decisions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-100">{VENTURE_CONFIG.launchTargetDays - dayNumber}</div>
            <div className="text-xs text-zinc-600">Days to Launch</div>
          </div>
        </div>
      </div>


      {/* Bottleneck */}
      {bottleneck && (
        <div className="border border-red-900/40 bg-red-950/10 rounded-xl p-5">
          <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-2">Current Bottleneck</p>
          <h2 className="text-lg font-semibold text-zinc-100">{bottleneck.task.title}</h2>
          <p className="text-sm text-zinc-400 mt-1">{bottleneck.reason}</p>
          <p className="text-xs text-zinc-600 mt-2">{bottleneck.task.department} &bull; {bottleneck.type}</p>
        </div>
      )}

      {/* Top 3 Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Today&apos;s Top 3 Actions</h2>
        {actionable.length === 0 && (
          <p className="text-zinc-500 text-sm">No actionable tasks right now. Check decisions or blocked items.</p>
        )}
        {actionable.map((task, i) => (
          <div key={task.id} className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl font-bold text-zinc-700">{i + 1}</span>
                <div>
                  <h3 className="font-medium text-zinc-100">{task.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{task.department} &bull; {task.category} &bull; {task.owner}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'CRITICAL' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                {task.priority}
              </span>
            </div>
            <div className="pl-9 space-y-2">
              <div className="flex gap-4 text-xs">
                <span className="text-zinc-500">Why:</span>
                <span className="text-zinc-400">{getWhyItMatters(task)}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-zinc-500">Time:</span>
                <span className="text-zinc-400">{getEstimatedTime(task)}</span>
              </div>
              <button
                onClick={() => handleDone(task.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors"
              >
                ✓ Done
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Done this session */}
      {doneIds.length > 0 && (
        <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-xl p-4">
          <p className="text-sm text-emerald-400 font-medium">✓ {doneIds.length} completed just now</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800">
        <Link href="/" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-500 hover:text-zinc-300">Radar</Link>
        <Link href="/decisions" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-500 hover:text-zinc-300">Decisions</Link>
        <Link href="/milestones" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-500 hover:text-zinc-300">Milestones</Link>
        <Link href="/admin" className="px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-500 hover:text-zinc-300">Admin</Link>
      </nav>
    </div>
  );
}
