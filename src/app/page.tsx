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

  const commitment = state.tasks.find((t: any) => t.status === 'committed_today');
  const suggestedTask = !commitment
    ? state.tasks
        .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
        .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0]
    : null;

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

  const topDecision = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
      const aL = (a.impactScore || 0) * Math.max(1, a.streamsAffected || 1) + (a.tasksAffected || 0) * 2;
      const bL = (b.impactScore || 0) * Math.max(1, b.streamsAffected || 1) + (b.tasksAffected || 0) * 2;
      return bL - aL;
    })[0] || null;

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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const completedThisWeek = state.tasks.filter((t: any) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const overdueCount = blockers.filter(b => b.blockerType === 'overdue').length;
  const blockedCount = blockers.filter(b => b.blockerType === 'blocked').length;

  const hasContent = commitment || suggestedTask || biggestBlocker || topDecision || overdueWaiting.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <p className="text-[13px] text-[var(--svaas-brown-light)]">Day {dayNumber} · Week {weekNumber} · {daysToLaunch}d to launch</p>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="bg-[var(--svaas-cream)] rounded-2xl p-10 text-center">
          <p className="text-lg text-[var(--svaas-brown)] font-medium">All clear.</p>
          <p className="text-[var(--svaas-brown-light)] text-sm mt-2">Your venture is on track.</p>
          <Link href="/today" className="inline-block mt-5 px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-sm rounded-xl font-medium">Open Today</Link>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LEVEL 1: TODAY'S COMMITMENT — Hero
          Largest. Most space. Dominates the page.
          ═══════════════════════════════════════════ */}
      {commitment ? (
        <section className="bg-[var(--svaas-cream)] border border-[var(--svaas-sand)]/50 rounded-2xl px-6 py-8 space-y-5">
          <p className="text-[13px] font-medium tracking-wide text-[var(--svaas-sand)] uppercase">Today&apos;s commitment</p>
          <h1 className="text-[28px] font-semibold text-[var(--svaas-brown-dark)] leading-[1.2]">{commitment.title}</h1>
          <div className="space-y-2 text-[15px]">
            <p className="text-[var(--svaas-brown)]">{getWhy(commitment, state)}</p>
            <p className="text-[var(--svaas-olive)]">If done → {getIfDone(commitment, state)}</p>
            <p className="text-[var(--svaas-clay)]">If ignored → {getConsequence(commitment)}</p>
          </div>
          <div className="pt-3">
            <button onClick={() => markTaskDone(commitment.id)} className="px-6 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[15px] rounded-xl font-medium">Done</button>
          </div>
        </section>
      ) : suggestedTask ? (
        <section className="bg-[var(--svaas-cream)] border border-[var(--svaas-sand)]/50 rounded-2xl px-6 py-8 space-y-5">
          <p className="text-[13px] font-medium tracking-wide text-[var(--svaas-sand)] uppercase">Today&apos;s commitment</p>
          <h1 className="text-[26px] font-medium text-[var(--svaas-brown-dark)] leading-[1.2]">{suggestedTask.title}</h1>
          <div className="space-y-2 text-[15px]">
            <p className="text-[var(--svaas-brown)]">{getWhy(suggestedTask, state)}</p>
            <p className="text-[var(--svaas-olive)]">If done → {getIfDone(suggestedTask, state)}</p>
            <p className="text-[var(--svaas-clay)]">If ignored → {getConsequence(suggestedTask)}</p>
          </div>
          <div className="flex items-center gap-4 pt-3">
            <button onClick={() => commitTask(suggestedTask.id)} className="px-6 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[15px] rounded-xl font-medium">Commit today</button>
            <Link href="/today" className="text-[14px] text-[var(--svaas-brown-light)]">Choose different</Link>
          </div>
        </section>
      ) : null}

      {/* ═══════════════════════════════════════════
          LEVEL 2: STUCK — Clay family
          Clearly secondary. Visible. Earthy.
          ═══════════════════════════════════════════ */}
      {biggestBlocker && (
        <section className="bg-[var(--svaas-clay-light)] border border-[var(--svaas-clay)]/12 rounded-2xl px-5 py-5 space-y-3">
          <p className="text-[12px] font-semibold tracking-wide text-[var(--svaas-clay)] uppercase">Stuck</p>
          <h2 className="text-[20px] font-medium text-[var(--svaas-brown-dark)] leading-tight">{biggestBlocker.title}</h2>
          <p className="text-[14px] text-[var(--svaas-brown)]">
            {biggestBlocker.blockerType === 'blocked'
              ? biggestBlocker.blockedReason
              : `${dayNumber - (biggestBlocker.dayRangeEnd || 0)}d overdue`}
          </p>
          <p className="text-[14px] text-[var(--svaas-clay)]">If not resolved → {getConsequence(biggestBlocker)}</p>
          <Link href="/warroom" className="inline-block text-[13px] text-[var(--svaas-clay)] font-medium pt-1">
            War Room ({blockers.length}) →
          </Link>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          LEVEL 3: DECISION — Olive family
          Clearly different from Stuck. Scannable.
          ═══════════════════════════════════════════ */}
      {topDecision && (
        <section className="bg-[var(--svaas-olive-light)] border border-[var(--svaas-olive)]/10 rounded-2xl px-5 py-5 space-y-3">
          <p className="text-[12px] font-semibold tracking-wide text-[var(--svaas-olive)] uppercase">Decision needed</p>
          <h2 className="text-[20px] font-medium text-[var(--svaas-brown-dark)] leading-tight">{topDecision.title}</h2>
          <p className="text-[14px] text-[var(--svaas-brown)]">{topDecision.context || 'Unlocks dependent work.'}</p>
          <p className="text-[14px] text-[var(--svaas-olive)]">
            If not decided → {topDecision.streamsAffected > 0
              ? `${topDecision.streamsAffected} stream${topDecision.streamsAffected > 1 ? 's' : ''} stall.`
              : 'Dependent work stays frozen.'}
          </p>
          <div className="pt-2">
            <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[14px] rounded-xl font-medium">Accept: {topDecision.defaultOption}</button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          LEVEL 3.5: WAITING — Herb/sage tint
          ═══════════════════════════════════════════ */}
      {overdueWaiting.length > 0 && (
        <section className="space-y-2">
          <p className="text-[12px] font-semibold tracking-wide text-[var(--svaas-slate)] uppercase">Waiting — overdue</p>
          {overdueWaiting.map((t: any) => (
            <div key={t.id} className="bg-[var(--svaas-slate-light)] border border-[var(--svaas-slate)]/10 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-[13px] text-[var(--svaas-brown-light)] mt-0.5">{t.waitingOnPerson} · {t.daysLate}d late</p>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-xl shrink-0">Received</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          LEVEL 4: THIS WEEK — Summary footer
          Lowest weight. No card. Just text.
          ═══════════════════════════════════════════ */}
      <section className="pt-2 border-t border-[var(--svaas-sand)]/30">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--svaas-brown-light)]">
            This week:
            {completedThisWeek > 0 && <> <span className="font-semibold text-[var(--svaas-olive)]">{completedThisWeek}</span> done</>}
            {overdueCount > 0 && <> · <span className="font-semibold text-[var(--svaas-clay)]">{overdueCount}</span> overdue</>}
            {blockedCount > 0 && <> · <span className="font-semibold">{blockedCount}</span> blocked</>}
            {waitingOn.length > 0 && <> · <span className="font-semibold">{waitingOn.length}</span> waiting</>}
            {completedThisWeek === 0 && overdueCount === 0 && blockedCount === 0 && waitingOn.length === 0 && ' No activity yet.'}
          </p>
          <Link href="/review" className="text-[13px] text-[var(--svaas-brown-light)]">Review →</Link>
        </div>
        {state.weeklyCommitment && state.weeklyCommitment.weekNumber >= weekNumber - 1 && (
          <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1.5">
            Focus: &ldquo;{state.weeklyCommitment.text}&rdquo;
          </p>
        )}
      </section>

      <AppNav />
    </div>
  );
}
