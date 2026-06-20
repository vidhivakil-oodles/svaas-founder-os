'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav } from '@/components/shared/nav';

function getConsequence(task: any) {
  if (task.department === 'LEGAL') return 'LLP, trademark, bank account all wait.';
  if (task.department === 'COMPLIANCE' && task.category === 'QP') return 'No QP → no licence → no launch.';
  if (task.department === 'COMPLIANCE') return 'Compliance chain stalls.';
  if (task.department === 'PRODUCT' && task.category === 'Formula') return 'Cannot produce or sell without locked formula.';
  if (task.department === 'PRODUCT') return 'Product development blocked.';
  if (task.department === 'PACKAGING') return 'Customer-facing work delayed.';
  if (task.department === 'SUPPLY CHAIN') return 'Production stops without ingredients.';
  if (task.notesDependencies) return task.notesDependencies.slice(0, 100);
  return 'Launch timeline extends.';
}

function getWhy(task: any, state: any) {
  const stream = state.streams.find((s: any) => s.id === task.streamId);
  const streamName = stream?.name || task.department;
  if (task.priority === 'CRITICAL') return `On ${streamName} critical path. Blocks downstream work.`;
  if (task.notesDependencies) return task.notesDependencies.slice(0, 100);
  return `Part of ${streamName} stream.`;
}

function getImpactIfDone(task: any, state: any) {
  const stream = state.streams.find((s: any) => s.id === task.streamId);
  const streamName = stream?.name || task.department;
  const remaining = state.tasks.filter((t: any) => t.streamId === task.streamId && t.status !== 'done' && t.id !== task.id).length;
  if (remaining <= 3 && remaining > 0) return `${streamName}: only ${remaining} tasks remain after this.`;
  if (task.priority === 'CRITICAL') return `${streamName} critical path advances.`;
  return `${streamName} moves forward.`;
}

export default function HomePage() {
  const { state, isLoaded, markTaskDone, commitTask, acceptDecisionDefault } = useAppState();
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // ──────── DATA ────────

  // Section 1: Today's single commitment
  const commitment = state.tasks.find((t: any) => t.status === 'committed_today');
  const suggestedTask = !commitment
    ? state.tasks
        .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
        .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0]
    : null;

  // Section 2: Biggest blocker — highest leverage blocked/overdue item
  // Leverage = priority weight + downstream impact + days stuck
  const blockers = [
    ...state.tasks.filter((t: any) => t.status === 'blocked').map((t: any) => ({
      ...t, blockerType: 'blocked' as const,
      leverage: (t.priority === 'CRITICAL' ? 10 : t.priority === 'HIGH' ? 6 : 3) + (t.downstreamCount || 0) * 2,
    })),
    ...state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd).map((t: any) => ({
      ...t, blockerType: 'overdue' as const,
      leverage: 10 + (dayNumber - (t.dayRangeEnd || 0)) + (t.downstreamCount || 0) * 2,
    })),
  ].sort((a, b) => b.leverage - a.leverage);
  const biggestBlocker = blockers[0] || null;

  // Section 3: Single highest leverage decision
  const topDecision = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
      const aL = (a.impactScore || 0) * Math.max(1, a.streamsAffected || 1) + (a.tasksAffected || 0) * 2;
      const bL = (b.impactScore || 0) * Math.max(1, b.streamsAffected || 1) + (b.tasksAffected || 0) * 2;
      return bL - aL;
    })[0] || null;

  // Section 4: All overdue waiting-on items
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const waitingOn = state.tasks.filter((t: any) => t.status === 'waiting_on');
  const overdueWaiting = waitingOn
    .map((t: any) => {
      const daysLate = t.waitingOnDate
        ? Math.max(0, Math.floor((today.getTime() - new Date(t.waitingOnDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return { ...t, daysLate, isOverdue: daysLate > 0 };
    })
    .filter((t: any) => t.isOverdue)
    .sort((a: any, b: any) => b.daysLate - a.daysLate);

  // Section 5: This week brief
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const completedThisWeek = state.tasks.filter((t: any) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const overdueCount = blockers.filter(b => b.blockerType === 'overdue').length;
  const blockedCount = blockers.filter(b => b.blockerType === 'blocked').length;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-4">
        <p className="text-zinc-600 text-xs">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch}d to launch</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: TODAY'S COMMITMENT (hero)
          ═══════════════════════════════════════════════════════════ */}
      {commitment ? (
        <section className="border-2 border-emerald-600/50 bg-emerald-950/15 rounded-xl p-5 space-y-3">
          <p className="text-xs text-emerald-400 uppercase tracking-wide font-semibold">Today&apos;s Commitment</p>
          <p className="text-xl font-semibold text-zinc-50">{commitment.title}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-zinc-400">{getWhy(commitment, state)}</p>
            <p className="text-emerald-400/90">If done → {getImpactIfDone(commitment, state)}</p>
            <p className="text-red-400/80">If ignored → {getConsequence(commitment)}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => markTaskDone(commitment.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">✓ Done</button>
            <Link href="/today" className="px-4 py-2 border border-emerald-900/40 text-emerald-400 text-sm rounded-lg hover:border-emerald-700/40">Manage →</Link>
          </div>
        </section>
      ) : (
        <section className="border-2 border-zinc-700/40 bg-zinc-900/30 rounded-xl p-5 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Today&apos;s Commitment</p>
          {suggestedTask ? (
            <>
              <p className="text-lg font-medium text-zinc-100">{suggestedTask.title}</p>
              <div className="space-y-1.5 text-sm">
                <p className="text-zinc-400">{getWhy(suggestedTask, state)}</p>
                <p className="text-emerald-400/90">If done → {getImpactIfDone(suggestedTask, state)}</p>
                <p className="text-red-400/80">If ignored → {getConsequence(suggestedTask)}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => commitTask(suggestedTask.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">Commit Today</button>
                <Link href="/today" className="px-4 py-2 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:border-zinc-500">Choose different →</Link>
              </div>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">No critical tasks pending. Check streams.</p>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: BIGGEST BLOCKER (single)
          ═══════════════════════════════════════════════════════════ */}
      {biggestBlocker && (
        <section className="border border-red-900/40 bg-red-950/10 rounded-xl p-5 space-y-3">
          <p className="text-xs text-red-400 uppercase tracking-wide font-semibold">Biggest Blocker</p>
          <p className="text-lg font-medium text-zinc-100">{biggestBlocker.title}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-zinc-400">
              {biggestBlocker.blockerType === 'blocked'
                ? `Blocked: ${biggestBlocker.blockedReason}`
                : `${dayNumber - (biggestBlocker.dayRangeEnd || 0)}d overdue. Should have been done Day ${biggestBlocker.dayRangeEnd}.`}
            </p>
            <p className="text-red-400/80">
              If not resolved → {getConsequence(biggestBlocker)}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            {biggestBlocker.blockerType === 'overdue' && (
              <button onClick={() => markTaskDone(biggestBlocker.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">✓ Resolved</button>
            )}
            <Link href="/warroom" className="px-4 py-2 border border-red-900/40 text-red-400 text-sm rounded-lg hover:border-red-700/40">
              War Room ({blockers.length}) →
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: DECISION REQUIRED (single highest leverage)
          ═══════════════════════════════════════════════════════════ */}
      {topDecision && (
        <section className="border border-amber-900/40 bg-amber-950/10 rounded-xl p-5 space-y-3">
          <p className="text-xs text-amber-400 uppercase tracking-wide font-semibold">Decision Required</p>
          <p className="text-lg font-medium text-zinc-100">{topDecision.title}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-zinc-400">
              {topDecision.context || 'This decision unlocks dependent work.'}
            </p>
            <p className="text-amber-400/80">
              If not decided → {topDecision.streamsAffected > 0
                ? `${topDecision.streamsAffected} stream${topDecision.streamsAffected > 1 ? 's' : ''} stall.`
                : topDecision.tasksAffected > 0
                ? `${topDecision.tasksAffected} downstream task${topDecision.tasksAffected > 1 ? 's' : ''} blocked.`
                : 'Dependent work stays frozen.'}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">Accept: {topDecision.defaultOption}</button>
            <Link href="/decisions" className="px-4 py-2 border border-amber-900/40 text-amber-400 text-sm rounded-lg hover:border-amber-700/40">See options →</Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: WAITING ON OTHERS (all overdue follow-ups)
          ═══════════════════════════════════════════════════════════ */}
      {overdueWaiting.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold">
            Waiting On Others — Overdue ({overdueWaiting.length})
          </p>
          {overdueWaiting.map((t: any) => (
            <div key={t.id} className="border border-blue-900/40 bg-blue-950/10 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-zinc-200">{t.title}</p>
              <div className="text-xs space-y-1">
                <p className="text-zinc-400">Waiting on {t.waitingOnPerson}. Expected {t.waitingOnDate}.</p>
                <p className="text-amber-400/80">{t.daysLate}d late. If not followed up → this stays unresolved.</p>
              </div>
              <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium">Received</button>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: THIS WEEK (brief only)
          ═══════════════════════════════════════════════════════════ */}
      <section className="border border-zinc-800/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">This Week</p>
          <Link href="/review" className="text-xs text-zinc-600 hover:text-zinc-400">Review →</Link>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-lg font-bold text-emerald-400">{completedThisWeek}</span>
            <span className="text-xs text-zinc-600 ml-1.5">done</span>
          </div>
          {overdueCount > 0 && (
            <div>
              <span className="text-lg font-bold text-red-400">{overdueCount}</span>
              <span className="text-xs text-zinc-600 ml-1.5">overdue</span>
            </div>
          )}
          {blockedCount > 0 && (
            <div>
              <span className="text-lg font-bold text-amber-400">{blockedCount}</span>
              <span className="text-xs text-zinc-600 ml-1.5">blocked</span>
            </div>
          )}
          {waitingOn.length > 0 && (
            <div>
              <span className="text-lg font-bold text-blue-400">{waitingOn.length}</span>
              <span className="text-xs text-zinc-600 ml-1.5">waiting</span>
            </div>
          )}
        </div>
        {state.weeklyCommitment && state.weeklyCommitment.weekNumber >= weekNumber - 1 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60">
            <p className="text-xs text-zinc-600">Week focus:</p>
            <p className="text-sm text-zinc-300">&ldquo;{state.weeklyCommitment.text}&rdquo;</p>
          </div>
        )}
      </section>

      <AppNav />
    </div>
  );
}
