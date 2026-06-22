'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AppNav, BackToHome } from '@/components/shared/nav';
import { KebabMenu } from '@/components/shared/kebab-menu';

const STATUS_ICONS: Record<string, string> = { done: '\u2713', in_progress: '\u25D0', committed_today: '\u25C9', waiting_on: '\u23F3', blocked: '\u2298', not_started: '\u25CB', deferred: '\u25CC' };
const PRIORITY_WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function getActionableTasks(tasks: any[], dayNumber: number) {
  const statusOrder: Record<string, number> = { committed_today: 0, in_progress: 1, blocked: 2, waiting_on: 3, not_started: 4 };

  return tasks
    .filter(t => t.status !== 'done' && t.status !== 'deferred')
    .sort((a, b) => {
      const sDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (sDiff !== 0) return sDiff;
      const pDiff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const aOverdue = a.dayRangeEnd && dayNumber > a.dayRangeEnd ? 1 : 0;
      const bOverdue = b.dayRangeEnd && dayNumber > b.dayRangeEnd ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      return (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999);
    });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'done': return 'text-[var(--svaas-olive)]';
    case 'in_progress': case 'committed_today': return 'text-[var(--svaas-amber)]';
    case 'blocked': return 'text-[var(--svaas-clay)]';
    case 'waiting_on': return 'text-[var(--svaas-slate)]';
    default: return 'text-[var(--svaas-brown-light)]';
  }
}

export default function StreamPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { state, markTaskDone, blockTask, startTask, commitTask, deferTask, waitingOnTask, cancelTask, unblockTask } = useAppState();
  const [showAll, setShowAll] = useState(false);

  const stream = state.streams.find(s => s.slug === slug);
  if (!stream) return <div className="p-8 text-[var(--svaas-brown-light)]">Stream not found.</div>;

  const tasks = state.tasks.filter(t => t.streamSlug === slug);
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const start = new Date('2026-06-01');
  const today = new Date();
  const dayNumber = Math.max(1, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const actionable = getActionableTasks(tasks, dayNumber);
  const top5 = actionable.slice(0, 5);
  const remaining = actionable.slice(5);
  const doneTasks = tasks.filter(t => t.status === 'done');

  const streamPhases = [...new Set(tasks.map(t => t.phase))];
  const nextMilestone = state.milestones.find(m => streamPhases.includes(m.phase) && m.status !== 'achieved');
  const milestoneGatesRemaining = nextMilestone ? nextMilestone.gateCriteria.filter(g => !g.met).length : 0;

  function getTaskKebab(task: any) {
    const actions = [];
    if (task.status === 'not_started') {
      actions.push({ label: 'Start', onClick: () => startTask(task.id) });
      actions.push({ label: 'Waiting On...', onClick: () => waitingOnTask(task.id, 'TBD', '', '') });
      actions.push({ label: 'Block...', onClick: () => blockTask(task.id, 'Blocked from stream') });
      actions.push({ label: 'Defer', onClick: () => deferTask(task.id, 'Deferred', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) });
    }
    if (task.status === 'committed_today' || task.status === 'in_progress') {
      actions.push({ label: 'Waiting On...', onClick: () => waitingOnTask(task.id, 'TBD', '', '') });
      actions.push({ label: 'Block...', onClick: () => blockTask(task.id, 'Blocked from stream') });
      actions.push({ label: 'Defer', onClick: () => deferTask(task.id, 'Deferred', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) });
    }
    if (task.status === 'blocked') {
      actions.push({ label: 'Done', onClick: () => markTaskDone(task.id) });
      actions.push({ label: 'Defer', onClick: () => deferTask(task.id, 'Deferred while blocked', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) });
    }
    if (task.status === 'waiting_on') {
      actions.push({ label: 'Done', onClick: () => markTaskDone(task.id) });
      actions.push({ label: 'Defer', onClick: () => deferTask(task.id, 'Deferred while waiting', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) });
    }
    actions.push({ label: 'Cancel', onClick: () => cancelTask(task.id), destructive: true });
    return actions;
  }

  function getPrimaryAction(task: any) {
    if (task.status === 'committed_today' || task.status === 'in_progress') {
      return { label: 'Done', onClick: () => markTaskDone(task.id) };
    }
    if (task.status === 'not_started') {
      return { label: 'Commit', onClick: () => commitTask(task.id) };
    }
    if (task.status === 'blocked') {
      return { label: 'Unblock', onClick: () => unblockTask(task.id) };
    }
    if (task.status === 'waiting_on') {
      return { label: 'Received', onClick: () => markTaskDone(task.id) };
    }
    return null;
  }

  function renderTask(task: any) {
    const primary = getPrimaryAction(task);
    const kebabActions = getTaskKebab(task);

    return (
      <div key={task.id} className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className={`text-sm mt-0.5 ${getStatusColor(task.status)}`}>{STATUS_ICONS[task.status] || '\u25CB'}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.status === 'done' ? 'text-[var(--svaas-brown-light)] line-through' : 'text-[var(--svaas-brown-dark)]'}`}>{task.title}</p>
            {task.blockedReason && <p className="text-xs text-[var(--svaas-clay)] mt-1">Blocked: {task.blockedReason}</p>}
            {task.status === 'waiting_on' && task.waitingOnPerson && (
              <p className="text-xs text-[var(--svaas-slate)] mt-1">Waiting on: {task.waitingOnPerson}{task.waitingOnDate ? ` (expected ${task.waitingOnDate})` : ''}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--svaas-brown-light)]">
              <span>{task.owner}</span>
              <span className={task.priority === 'CRITICAL' ? 'text-[var(--svaas-clay)]' : task.priority === 'HIGH' ? 'text-[var(--svaas-amber)]' : ''}>{task.priority}</span>
              {task.dayRangeEnd && dayNumber > task.dayRangeEnd && (
                <span className="text-[var(--svaas-clay)]">{dayNumber - task.dayRangeEnd}d overdue</span>
              )}
            </div>
          </div>
        </div>
        {primary && task.status !== 'done' && (
          <div className="flex items-center gap-1 pl-6">
            <button onClick={primary.onClick} className="px-4 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium">{primary.label}</button>
            {kebabActions.length > 0 && <KebabMenu actions={kebabActions} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-2xl font-medium text-[var(--svaas-brown-dark)] mt-3">{stream.name}</h1>
      </header>

      {/* Progress narrative */}
      <div className="space-y-3">
        <p className="text-sm text-[var(--svaas-brown)]">
          {done} of {tasks.length} actions complete ({progress}%).
          {blocked > 0 && <span className="text-[var(--svaas-clay)]"> {blocked} blocked.</span>}
        </p>
        <div className="h-1.5 bg-[var(--svaas-sand)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--svaas-olive)] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Bottleneck */}
      {stream.currentBottleneck && (
        <div className="border border-[var(--svaas-clay)]/20 bg-[var(--svaas-clay-light)] rounded-2xl p-5">
          <p className="text-xs text-[var(--svaas-clay)] mb-2">Current bottleneck</p>
          <p className="text-sm text-[var(--svaas-brown-dark)]">{stream.currentBottleneck}</p>
          {stream.waitingOn && <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Waiting on: {stream.waitingOn}</p>}
        </div>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-5">
          <p className="text-xs text-[var(--svaas-brown-light)] mb-2">Next milestone</p>
          <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{nextMilestone.title}</p>
          <p className="text-xs text-[var(--svaas-brown-light)] mt-1">{milestoneGatesRemaining} requirement{milestoneGatesRemaining !== 1 ? 's' : ''} remaining · Target Day {nextMilestone.dayTarget}</p>
        </div>
      )}

      {/* Top 5 Actionable Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--svaas-brown-light)]">Top actions</p>
          <span className="text-xs text-[var(--svaas-brown-light)]">{actionable.length} actionable</span>
        </div>
        {top5.length === 0 ? (
          <div className="border border-[var(--svaas-olive)]/20 bg-[var(--svaas-olive-light)] rounded-2xl p-6 text-center">
            <p className="text-[var(--svaas-olive)] font-medium">All caught up in this stream.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top5.map(renderTask)}
          </div>
        )}
      </div>

      {/* Collapsed remaining */}
      {remaining.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] transition-colors"
          >
            {showAll ? `Hide ${remaining.length} more tasks` : `View ${remaining.length} more tasks`}
          </button>
          {showAll && (
            <div className="mt-4 space-y-3">
              {remaining.map(renderTask)}
            </div>
          )}
        </div>
      )}

      {/* Done Tasks (collapsed) */}
      {doneTasks.length > 0 && (
        <details className="pt-2">
          <summary className="text-sm text-[var(--svaas-brown-light)] cursor-pointer hover:text-[var(--svaas-brown)]">
            {doneTasks.length} completed
          </summary>
          <div className="mt-3 space-y-2">
            {doneTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className="text-sm text-[var(--svaas-olive)]">&#10003;</span>
                <p className="text-sm text-[var(--svaas-brown-light)] line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <AppNav />
    </div>
  );
}
