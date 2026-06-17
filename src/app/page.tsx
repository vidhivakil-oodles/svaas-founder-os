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
  if (task.notesDependencies) return task.notesDependencies.slice(0, 80);
  return 'Launch timeline extends.';
}

function getImpactIfDone(task: any, state: any) {
  const stream = state.streams.find((s: any) => s.id === task.streamId);
  if (task.priority === 'CRITICAL') return `${stream?.name || task.department} critical path advances.`;
  return `${stream?.name || task.department} stream moves forward.`;
}

export default function HomePage() {
  const { state, isLoaded, markTaskDone, commitTask, acceptDecisionDefault } = useAppState();
  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();

  if (!isLoaded) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // ──────── DATA ────────

  // Today's single commitment
  const commitment = state.tasks.find((t: any) => t.status === 'committed_today');

  // Best suggestion if no commitment (highest leverage: CRITICAL + closest deadline)
  const suggestedTask = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999))[0];

  // Waiting on others
  const waitingOn = state.tasks.filter((t: any) => t.status === 'waiting_on');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const waitingWithOverdue = waitingOn.map((t: any) => {
    const daysLate = t.waitingOnDate
      ? Math.max(0, Math.floor((today.getTime() - new Date(t.waitingOnDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    return { ...t, daysLate, isOverdue: daysLate > 0 };
  }).sort((a: any, b: any) => b.daysLate - a.daysLate);

  // Decisions — ordered by leverage (impactScore × streamsAffected), not by age
  const pendingDecisions = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
      const aLeverage = (a.impactScore || 0) * Math.max(1, a.streamsAffected || 1) + (a.tasksAffected || 0);
      const bLeverage = (b.impactScore || 0) * Math.max(1, b.streamsAffected || 1) + (b.tasksAffected || 0);
      return bLeverage - aLeverage;
    });

  // This week summary
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const completedThisWeek = state.tasks.filter((t: any) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const overdueCount = state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd).length;
  const waitingCount = waitingOn.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header — minimal */}
      <div className="pt-4">
        <p className="text-zinc-600 text-sm">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch}d to launch</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">What should you do next?</h1>
      </div>

      {/* ═══════════════════════════════════════════════
          1. TODAY'S COMMITMENT — Hero
          ═══════════════════════════════════════════════ */}
      {commitment ? (
        <div className="border-2 border-emerald-600/50 bg-emerald-950/15 rounded-xl p-5 space-y-3">
          <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Today&apos;s Commitment</p>
          <p className="text-xl font-semibold text-zinc-50">{commitment.title}</p>
          <div className="space-y-1 text-xs">
            <p className="text-zinc-400"><span className="text-zinc-500">Why:</span> {getConsequence(commitment)}</p>
            <p className="text-emerald-400/80"><span className="text-zinc-500">If done:</span> {getImpactIfDone(commitment, state)}</p>
            <p className="text-red-400/70"><span className="text-zinc-500">If ignored:</span> {getConsequence(commitment)}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => markTaskDone(commitment.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">✓ Done</button>
            <Link href="/today" className="px-3 py-2 border border-emerald-900/40 text-emerald-400 text-sm rounded-lg hover:border-emerald-700/40">Manage →</Link>
          </div>
        </div>
      ) : (
        <div className="border-2 border-zinc-700/50 bg-zinc-900/30 rounded-xl p-5 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">No Commitment Yet</p>
          {suggestedTask ? (
            <>
              <p className="text-lg font-medium text-zinc-100">{suggestedTask.title}</p>
              <div className="space-y-1 text-xs">
                <p className="text-zinc-400"><span className="text-zinc-500">Why:</span> {getConsequence(suggestedTask)}</p>
                <p className="text-emerald-400/80"><span className="text-zinc-500">If done:</span> {getImpactIfDone(suggestedTask, state)}</p>
                <p className="text-red-400/70"><span className="text-zinc-500">If ignored:</span> {getConsequence(suggestedTask)}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => commitTask(suggestedTask.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">Commit Today</button>
                <Link href="/today" className="px-3 py-2 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:border-zinc-500">Choose different →</Link>
              </div>
            </>
          ) : (
            <p className="text-zinc-400 text-sm">No critical tasks remaining. Check streams for what to focus on.</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          2. WAITING FOR OTHERS
          ═══════════════════════════════════════════════ */}
      {waitingWithOverdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-blue-400 uppercase tracking-wide">
            Waiting For Others ({waitingWithOverdue.length})
          </h2>
          {waitingWithOverdue.slice(0, 4).map((t: any) => (
            <div key={t.id} className={`border ${t.isOverdue ? 'border-amber-900/50 bg-amber-950/10' : 'border-blue-900/30 bg-blue-950/5'} rounded-xl p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 font-medium text-sm">{t.title}</p>
                  <p className={`text-xs mt-0.5 ${t.isOverdue ? 'text-amber-400 font-medium' : 'text-zinc-500'}`}>
                    {t.waitingOnPerson}{t.isOverdue ? ` — ${t.daysLate}d overdue` : t.waitingOnDate ? ` — due ${t.waitingOnDate}` : ''}
                  </p>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg shrink-0 ml-2">Received</button>
              </div>
            </div>
          ))}
          {waitingWithOverdue.length > 4 && (
            <Link href="/today" className="text-xs text-blue-400 hover:text-blue-300">+{waitingWithOverdue.length - 4} more →</Link>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          3. DECISIONS NEEDED (by leverage)
          ═══════════════════════════════════════════════ */}
      {pendingDecisions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wide">
            Decisions Needed ({pendingDecisions.length})
          </h2>
          {pendingDecisions.slice(0, 3).map((d: any) => (
            <div key={d.id} className="border border-amber-900/30 bg-amber-950/5 rounded-xl p-4 space-y-2">
              <p className="text-zinc-200 font-medium text-sm">{d.title}</p>
              <p className="text-xs text-zinc-500">
                {d.streamsAffected > 0 ? `Affects ${d.streamsAffected} stream${d.streamsAffected > 1 ? 's' : ''}` : ''}
                {d.tasksAffected > 0 ? ` • Blocks ${d.tasksAffected} task${d.tasksAffected > 1 ? 's' : ''}` : ''}
                {!d.streamsAffected && !d.tasksAffected ? 'Dependent work waits' : ''}
              </p>
              <div className="flex gap-2">
                <button onClick={() => acceptDecisionDefault(d.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium">Accept: {d.defaultOption}</button>
                <Link href="/decisions" className="px-3 py-1.5 border border-amber-900/30 text-amber-400 text-xs rounded-lg hover:border-amber-700/40">Options →</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          4. THIS WEEK — brief, not dashboard
          ═══════════════════════════════════════════════ */}
      <div className="border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-zinc-500 uppercase tracking-wide font-medium">This Week</h2>
          <Link href="/review" className="text-xs text-zinc-600 hover:text-zinc-400">Review →</Link>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{completedThisWeek}</div>
            <div className="text-xs text-zinc-600">Done</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{overdueCount}</div>
            <div className="text-xs text-zinc-600">Overdue</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${waitingCount > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>{waitingCount}</div>
            <div className="text-xs text-zinc-600">Waiting</div>
          </div>
        </div>
        {/* Weekly commitment from review */}
        {state.weeklyCommitment && state.weeklyCommitment.weekNumber >= weekNumber - 1 && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Week focus:</p>
            <p className="text-sm text-zinc-300 mt-0.5">&ldquo;{state.weeklyCommitment.text}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <AppNav />
    </div>
  );
}
