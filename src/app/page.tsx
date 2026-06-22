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
  if (task.priority === 'CRITICAL') return `On ${streamName} critical path.`;
  if (task.notesDependencies) return task.notesDependencies.slice(0, 100);
  return `Part of ${streamName}.`;
}

function getIfDone(task: any, state: any) {
  const stream = state.streams.find((s: any) => s.id === task.streamId);
  const streamName = stream?.name || task.department;
  const remaining = state.tasks.filter((t: any) => t.streamId === task.streamId && t.status !== 'done' && t.id !== task.id).length;
  if (remaining <= 3 && remaining > 0) return `${streamName}: only ${remaining} left.`;
  if (task.priority === 'CRITICAL') return `${streamName} critical path advances.`;
  return `${streamName} moves forward.`;
}

export default function HomePage() {
  const { state, isLoaded, markTaskDone, commitTask, acceptDecisionDefault } = useAppState();
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-[var(--svaas-brown-light)]">Loading...</div>;

  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // Section 1: Commitment
  const commitment = state.tasks.find((t: any) => t.status === 'committed_today');
  const suggestedTask = !commitment
    ? state.tasks
        .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
        .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0]
    : null;

  // Section 2: Biggest blocker (leverage scored)
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

  // Section 3: Single highest-leverage decision
  const topDecision = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
      const aL = (a.impactScore || 0) * Math.max(1, a.streamsAffected || 1) + (a.tasksAffected || 0) * 2;
      const bL = (b.impactScore || 0) * Math.max(1, b.streamsAffected || 1) + (b.tasksAffected || 0) * 2;
      return bL - aL;
    })[0] || null;

  // Section 4: Overdue waiting-on
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

  // Section 5: This week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const completedThisWeek = state.tasks.filter((t: any) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const overdueCount = blockers.filter(b => b.blockerType === 'overdue').length;
  const blockedCount = blockers.filter(b => b.blockerType === 'blocked').length;

  // Empty state check
  const hasContent = commitment || suggestedTask || biggestBlocker || topDecision || overdueWaiting.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-2">
        <p className="text-xs text-[var(--svaas-brown-light)]">Day {dayNumber} · Week {weekNumber} · {daysToLaunch}d to launch</p>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-8 text-center">
          <p className="text-[var(--svaas-brown)] font-medium">All clear.</p>
          <p className="text-[var(--svaas-brown-light)] text-sm mt-1">Your venture is on track. Open Today to move forward.</p>
          <Link href="/today" className="inline-block mt-4 px-4 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl">Open Today</Link>
        </div>
      )}

      {/* SECTION 1: TODAY'S COMMITMENT — Dominant: Sand/Warm */}
      {commitment ? (
        <section className="border-2 border-[var(--svaas-sand)]/40 bg-[var(--svaas-cream)] rounded-2xl p-6 space-y-4">
          <p className="text-xs text-[var(--svaas-brown-light)]">Today&apos;s commitment</p>
          <p className="text-2xl font-semibold text-[var(--svaas-brown-dark)] leading-tight">{commitment.title}</p>
          <div className="space-y-1.5 text-sm text-[var(--svaas-brown)]">
            <p>{getWhy(commitment, state)}</p>
            <p className="text-[var(--svaas-olive)]">If done: {getIfDone(commitment, state)}</p>
            <p className="text-[var(--svaas-clay)]">If ignored: {getConsequence(commitment)}</p>
          </div>
          <div className="pt-2">
            <button onClick={() => markTaskDone(commitment.id)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-sm rounded-xl font-medium">Done</button>
          </div>
        </section>
      ) : suggestedTask ? (
        <section className="border-2 border-[var(--svaas-sand)]/40 bg-[var(--svaas-cream)] rounded-2xl p-6 space-y-4">
          <p className="text-xs text-[var(--svaas-brown-light)]">Today&apos;s commitment</p>
          <p className="text-xl font-medium text-[var(--svaas-brown-dark)] leading-tight">{suggestedTask.title}</p>
          <div className="space-y-1.5 text-sm text-[var(--svaas-brown)]">
            <p>{getWhy(suggestedTask, state)}</p>
            <p className="text-[var(--svaas-olive)]">If done: {getIfDone(suggestedTask, state)}</p>
            <p className="text-[var(--svaas-clay)]">If ignored: {getConsequence(suggestedTask)}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => commitTask(suggestedTask.id)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-sm rounded-xl font-medium">Commit today</button>
            <Link href="/today" className="px-4 py-2.5 text-[var(--svaas-brown-light)] text-sm">Choose different</Link>
          </div>
        </section>
      ) : null}

      {/* SECTION 2: BIGGEST BLOCKER — Clay wash */}
      {biggestBlocker && (
        <section className="border border-[var(--svaas-clay)]/15 bg-[var(--svaas-clay-light)] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[var(--svaas-clay)]">Stuck</p>
          <p className="text-base font-medium text-[var(--svaas-brown-dark)] leading-tight">{biggestBlocker.title}</p>
          <div className="space-y-1 text-sm">
            <p className="text-[var(--svaas-brown)]">
              {biggestBlocker.blockerType === 'blocked'
                ? biggestBlocker.blockedReason
                : `${dayNumber - (biggestBlocker.dayRangeEnd || 0)}d overdue`}
            </p>
            <p className="text-[var(--svaas-clay)]">If not resolved: {getConsequence(biggestBlocker)}</p>
          </div>
          <div className="pt-1">
            <Link href="/warroom" className="text-sm text-[var(--svaas-clay)] font-medium">
              War Room ({blockers.length}) →
            </Link>
          </div>
        </section>
      )}

      {/* SECTION 3: DECISION REQUIRED — Olive wash */}
      {topDecision && (
        <section className="border border-[var(--svaas-olive)]/10 bg-[var(--svaas-olive-light)] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-[var(--svaas-olive)]">Decision needed</p>
          <p className="text-base font-medium text-[var(--svaas-brown-dark)] leading-tight">{topDecision.title}</p>
          <div className="space-y-1 text-sm">
            <p className="text-[var(--svaas-brown)]">{topDecision.context || 'Unlocks dependent work.'}</p>
            <p className="text-[var(--svaas-olive)]">
              If not decided: {topDecision.streamsAffected > 0
                ? `${topDecision.streamsAffected} stream${topDecision.streamsAffected > 1 ? 's' : ''} stall.`
                : 'Dependent work stays frozen.'}
            </p>
          </div>
          <div className="pt-1">
            <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-sm rounded-xl font-medium">Accept: {topDecision.defaultOption}</button>
          </div>
        </section>
      )}

      {/* SECTION 4: WAITING — Muted herb/sage wash */}
      {overdueWaiting.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium text-[var(--svaas-slate)]">Waiting — overdue</p>
          {overdueWaiting.map((t: any) => (
            <div key={t.id} className="border border-[var(--svaas-slate)]/10 bg-[var(--svaas-slate-light)] rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{t.waitingOnPerson} · {t.daysLate}d late</p>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-xs rounded-xl shrink-0">Received</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* SECTION 5: THIS WEEK — Lightest, lowest weight */}
      <section className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--svaas-brown-light)]">This week</p>
          <Link href="/review" className="text-xs text-[var(--svaas-brown-light)]">Review →</Link>
        </div>
        <p className="text-sm text-[var(--svaas-brown)]">
          {completedThisWeek > 0 && <><span className="font-medium">{completedThisWeek}</span> done</>}
          {overdueCount > 0 && <> · <span className="font-medium">{overdueCount}</span> overdue</>}
          {blockedCount > 0 && <> · <span className="font-medium">{blockedCount}</span> blocked</>}
          {waitingOn.length > 0 && <> · <span className="font-medium">{waitingOn.length}</span> waiting</>}
          {completedThisWeek === 0 && overdueCount === 0 && blockedCount === 0 && waitingOn.length === 0 && 'No activity yet.'}
        </p>
        {state.weeklyCommitment && state.weeklyCommitment.weekNumber >= weekNumber - 1 && (
          <p className="text-xs text-[var(--svaas-brown-light)] mt-2">
            Focus: &ldquo;{state.weeklyCommitment.text}&rdquo;
          </p>
        )}
      </section>

      <AppNav />
    </div>
  );
}
