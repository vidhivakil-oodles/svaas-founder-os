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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'committed_today': return 'Committed';
    case 'in_progress': return 'In progress';
    case 'blocked': return 'Blocked';
    case 'waiting_on': return 'Waiting';
    default: return '';
  }
}

function getSpineColor(status: string): string {
  switch (status) {
    case 'committed_today': case 'in_progress': return 'bg-[var(--svaas-olive)]';
    case 'blocked': return 'bg-[var(--svaas-clay)]';
    case 'waiting_on': return 'bg-[var(--svaas-slate)]';
    default: return 'bg-[var(--svaas-sand)]/50';
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
  const top3 = actionable.slice(0, 3);
  const remaining = actionable.slice(3);
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

  // Top 3 large cards
  function renderLargeTask(task: any) {
    const primary = getPrimaryAction(task);
    const kebabActions = getTaskKebab(task);
    const statusLabel = getStatusLabel(task.status);

    return (
      <div key={task.id} className="border border-[var(--svaas-sand)]/40 bg-[var(--svaas-cream)] rounded-xl overflow-hidden">
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {statusLabel && <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-1.5">{statusLabel}</p>}
              <h3 className="text-[16px] font-medium text-[var(--svaas-brown-dark)] leading-snug font-[family-name:var(--font-serif)]">{task.title}</h3>
            </div>
            <KebabMenu actions={kebabActions} />
          </div>
          {task.blockedReason && <p className="text-[13px] text-[var(--svaas-clay)]">Blocked: {task.blockedReason}</p>}
          {task.status === 'waiting_on' && task.waitingOnPerson && (
            <p className="text-[13px] text-[var(--svaas-slate)]">Waiting on: {task.waitingOnPerson}{task.waitingOnDate ? ` (expected ${task.waitingOnDate})` : ''}</p>
          )}
          <div className="flex items-center gap-3 text-[12px] text-[var(--svaas-brown-light)]">
            <span>{task.owner}</span>
            <span className={task.priority === 'CRITICAL' ? 'text-[var(--svaas-clay)] font-medium' : ''}>{task.priority}</span>
            {task.dayRangeEnd && dayNumber > task.dayRangeEnd && (
              <span className="text-[var(--svaas-clay)]">{dayNumber - task.dayRangeEnd}d overdue</span>
            )}
          </div>
          {primary && (
            <div className="flex items-center gap-3 pt-1">
              <button onClick={primary.onClick} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">{primary.label}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact rows for the rest
  function renderCompactTask(task: any) {
    const primary = getPrimaryAction(task);
    const kebabActions = getTaskKebab(task);

    return (
      <div key={task.id} className="flex items-center gap-0">
        <div className={`w-1 self-stretch ${getSpineColor(task.status)} shrink-0`} />
        <div className="flex-1 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)] truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--svaas-brown-light)]">
              <span>{task.owner}</span>
              <span>{task.priority}</span>
              {task.dayRangeEnd && dayNumber > task.dayRangeEnd && (
                <span className="text-[var(--svaas-clay)]">{dayNumber - task.dayRangeEnd}d overdue</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {primary && <button onClick={primary.onClick} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">{primary.label}</button>}
            <KebabMenu actions={kebabActions} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-3">
        <BackToHome />
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">Stream</p>
          <h1 className="text-[24px] font-medium text-[var(--svaas-brown-dark)] mt-1 font-[family-name:var(--font-serif)]">{stream.name}</h1>
        </div>
      </header>

      {/* Progress - editorial narrative */}
      <div className="space-y-3">
        <p className="text-[14px] text-[var(--svaas-brown)]">
          {done} of {tasks.length} actions complete ({progress}%).
          {blocked > 0 && <span className="text-[var(--svaas-clay)]"> {blocked} blocked.</span>}
        </p>
        <div className="h-1 bg-[var(--svaas-sand)]/30 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--svaas-olive)] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Bottleneck - left spine */}
      {stream.currentBottleneck && (
        <div className="flex gap-0 rounded-xl overflow-hidden border border-[var(--svaas-sand)]/30">
          <div className="w-1.5 bg-[var(--svaas-clay)] shrink-0" />
          <div className="flex-1 px-5 py-4 bg-[var(--svaas-cream)]">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-clay)] uppercase mb-1">Current bottleneck</p>
            <p className="text-[14px] text-[var(--svaas-brown-dark)]">{stream.currentBottleneck}</p>
            {stream.waitingOn && <p className="text-[12px] text-[var(--svaas-brown-light)] mt-1">Waiting on: {stream.waitingOn}</p>}
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="flex gap-0 rounded-xl overflow-hidden border border-[var(--svaas-sand)]/30">
          <div className="w-1.5 bg-[var(--svaas-olive)] shrink-0" />
          <div className="flex-1 px-5 py-4 bg-[var(--svaas-cream)]">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-1">Next milestone</p>
            <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{nextMilestone.title}</p>
            <p className="text-[12px] text-[var(--svaas-brown-light)] mt-1">{milestoneGatesRemaining} requirement{milestoneGatesRemaining !== 1 ? 's' : ''} remaining · Target Day {nextMilestone.dayTarget}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TOP 3 — Large cards with full detail
          ═══════════════════════════════════════════════════════ */}
      {top3.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-dark)] uppercase mb-3">Top actions</p>
          <div className="space-y-3">
            {top3.map(renderLargeTask)}
          </div>
        </section>
      )}

      {top3.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-[16px] text-[var(--svaas-olive)] font-medium">All caught up in this stream.</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          REMAINING — Compact rows, collapsed by default
          ═══════════════════════════════════════════════════════ */}
      {remaining.length > 0 && (
        <section>
          {!showAll ? (
            <button
              onClick={() => setShowAll(true)}
              className="text-[13px] text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] transition-colors"
            >
              View all tasks ({remaining.length} more)
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">All tasks</p>
                <button onClick={() => setShowAll(false)} className="text-[13px] text-[var(--svaas-brown-light)]">Collapse</button>
              </div>
              <div className="border border-[var(--svaas-sand)]/30 bg-[var(--svaas-cream)] rounded-xl overflow-hidden divide-y divide-[var(--svaas-sand)]/20">
                {remaining.map(renderCompactTask)}
              </div>
            </>
          )}
        </section>
      )}

      {/* Done Tasks (collapsed) */}
      {doneTasks.length > 0 && (
        <details className="pt-2">
          <summary className="text-[13px] text-[var(--svaas-brown-light)] cursor-pointer hover:text-[var(--svaas-brown)]">
            {doneTasks.length} completed
          </summary>
          <div className="mt-3 space-y-1.5">
            {doneTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className="text-[13px] text-[var(--svaas-olive)]">&#10003;</span>
                <p className="text-[13px] text-[var(--svaas-brown-light)] line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <AppNav />
    </div>
  );
}
