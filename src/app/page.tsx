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
    <div className="space-y-10">
      {/* Header — minimal, editorial */}
      <header className="pt-3 flex items-baseline justify-between">
        <p className="text-[13px] text-[var(--svaas-brown-light)] tracking-wide">Day {dayNumber} · Week {weekNumber}</p>
        <p className="text-[13px] text-[var(--svaas-brown-light)]">{daysToLaunch}d to launch</p>
      </header>

      {/* Empty state */}
      {!hasContent && (
        <div className="py-16 text-center">
          <p className="text-[22px] text-[var(--svaas-brown)] font-medium">All clear.</p>
          <p className="text-[var(--svaas-brown-light)] text-[15px] mt-3">Your venture is on track.</p>
          <Link href="/today" className="inline-block mt-6 px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-sm rounded-lg font-medium">Open Today</Link>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRIMARY PANEL — Today's Commitment
          50-60% of visual attention. Editorial typography.
          ═══════════════════════════════════════════════════════ */}
      {(commitment || suggestedTask) && (
        <section className="py-2">
          <p className="text-[12px] font-semibold tracking-[0.15em] text-[var(--svaas-olive)] uppercase mb-4">Your focus today</p>
          <h1 className="text-[32px] font-semibold text-[var(--svaas-brown-dark)] leading-[1.15] tracking-[-0.01em] font-[family-name:var(--font-serif)]">
            {commitment?.title || suggestedTask?.title}
          </h1>
          <div className="mt-5 space-y-1.5 text-[15px] leading-relaxed">
            <p className="text-[var(--svaas-brown)]">{getWhy((commitment || suggestedTask)!, state)}</p>
            <p className="text-[var(--svaas-olive)]">If done → {getIfDone((commitment || suggestedTask)!, state)}</p>
            <p className="text-[var(--svaas-clay)]">If ignored → {getConsequence((commitment || suggestedTask)!)}</p>
          </div>
          <div className="mt-7">
            {commitment ? (
              <button onClick={() => markTaskDone(commitment.id)} className="px-7 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[15px] rounded-lg font-medium tracking-wide">Done</button>
            ) : (
              <div className="flex items-center gap-5">
                <button onClick={() => commitTask(suggestedTask!.id)} className="px-7 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[15px] rounded-lg font-medium tracking-wide">Commit today</button>
                <Link href="/today" className="text-[14px] text-[var(--svaas-brown-light)]">Choose different</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Divider */}
      {(commitment || suggestedTask) && (biggestBlocker || topDecision) && (
        <hr className="border-[var(--svaas-sand)]/40" />
      )}

      {/* ═══════════════════════════════════════════════════════
          SECONDARY PANELS — Horizontal strip on large screens
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stuck — left clay spine */}
        {biggestBlocker && (
          <section className="flex gap-0 rounded-xl overflow-hidden border border-[var(--svaas-sand)]/30">
            <div className="w-1.5 bg-[var(--svaas-clay)] shrink-0" />
            <div className="flex-1 px-5 py-4 bg-[var(--svaas-cream)]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-clay)] uppercase">Needs attention</p>
                  <h3 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] mt-1.5 leading-snug font-[family-name:var(--font-serif)]">{biggestBlocker.title}</h3>
                  <p className="text-[13px] text-[var(--svaas-brown)] mt-2">
                    {biggestBlocker.blockerType === 'blocked'
                      ? biggestBlocker.blockedReason
                      : `${dayNumber - (biggestBlocker.dayRangeEnd || 0)}d overdue`}
                  </p>
                </div>
                <Link href="/warroom" className="text-[12px] text-[var(--svaas-clay)] font-medium shrink-0 ml-4">
                  {blockers.length} →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Decision — left olive spine */}
        {topDecision && (
          <section className="flex gap-0 rounded-xl overflow-hidden border border-[var(--svaas-sand)]/30">
            <div className="w-1.5 bg-[var(--svaas-olive)] shrink-0" />
            <div className="flex-1 px-5 py-4 bg-[var(--svaas-cream)]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">Requires your decision</p>
                  <h3 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] mt-1.5 leading-snug font-[family-name:var(--font-serif)]">{topDecision.title}</h3>
                  <p className="text-[13px] text-[var(--svaas-brown)] mt-2">{topDecision.context || 'Unlocks dependent work.'}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="text-[12px] text-[var(--svaas-brown-light)]">Recommended: {topDecision.defaultOption}</p>
                <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Accept</button>
              </div>
            </div>
          </section>
        )}

        {/* Waiting — left sand/amber spine */}
        {overdueWaiting.length > 0 && (
          <section className="flex gap-0 rounded-xl overflow-hidden border border-[var(--svaas-sand)]/30">
            <div className="w-1.5 bg-[var(--svaas-sand)] shrink-0" />
            <div className="flex-1 px-5 py-4 bg-[var(--svaas-cream)]">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Waiting — overdue</p>
              <div className="mt-3 space-y-3">
                {overdueWaiting.slice(0, 3).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                      <p className="text-[12px] text-[var(--svaas-brown-light)]">{t.waitingOnPerson} · {t.daysLate}d late</p>
                    </div>
                    <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg shrink-0">Received</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          FOOTER — This Week summary
          ═══════════════════════════════════════════════════════ */}
      <footer className="flex items-center justify-between text-[13px] text-[var(--svaas-brown-light)] pt-2">
        <p>
          This week:
          {completedThisWeek > 0 && <> <span className="font-semibold">{completedThisWeek}</span> done</>}
          {overdueCount > 0 && <> · <span className="font-semibold">{overdueCount}</span> overdue</>}
          {blockedCount > 0 && <> · <span className="font-semibold">{blockedCount}</span> blocked</>}
          {waitingOn.length > 0 && <> · <span className="font-semibold">{waitingOn.length}</span> waiting</>}
          {completedThisWeek === 0 && overdueCount === 0 && blockedCount === 0 && waitingOn.length === 0 && ' No activity yet.'}
        </p>
        <Link href="/review">Review →</Link>
      </footer>

      <AppNav />
    </div>
  );
}
