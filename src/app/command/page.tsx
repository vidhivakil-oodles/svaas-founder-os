import { getHighestLeverageAction, getBottlenecks, getOverdueDecisions, getWaitingOn, getVentureHealth, getRecoveryPlaybook } from '@/services/venture-engine';
import { MarkDoneButton, BlockTaskButton } from '@/components/shared/task-actions';
import { QuickActions } from '@/components/venture-radar/quick-actions';
import Link from 'next/link';

export default function CommandCenterPage() {
  const leverageAction = getHighestLeverageAction();
  const bottlenecks = getBottlenecks().slice(0, 3);
  const overdueDecisions = getOverdueDecisions().slice(0, 3);
  const waitingOn = getWaitingOn();
  const health = getVentureHealth();
  const recovery = getRecoveryPlaybook();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Command Center</h1>
          <p className="text-sm text-zinc-500">
            Day {health.dayNumber} &bull; Milestone: {health.currentMilestone?.title}
          </p>
        </div>
      </header>

      {/* Highest Leverage Action */}
      {leverageAction && (
        <div className="border-2 border-amber-800/60 bg-amber-950/20 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-medium text-sm">🎯 HIGHEST LEVERAGE ACTION TODAY</span>
            {leverageAction.leverageScore && (
              <span className="text-xs text-zinc-600">Score: {leverageAction.leverageScore}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">{leverageAction.title}</h2>
          {leverageAction.notesDependencies && (
            <p className="text-sm text-zinc-400">
              <span className="text-amber-500 font-medium">WHY:</span> {leverageAction.notesDependencies}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Owner: {leverageAction.owner}</span>
            <span>Stream: {leverageAction.streamSlug}</span>
            <span>Priority: {leverageAction.priority}</span>
            {leverageAction.downstreamCount && leverageAction.downstreamCount > 0 && (
              <span className="text-amber-400">Unblocks {leverageAction.downstreamCount} tasks</span>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <MarkDoneButton taskId={leverageAction.id} size="md" />
            <BlockTaskButton taskId={leverageAction.id} />
          </div>
        </div>
      )}

      {/* Blocked Items */}
      {bottlenecks.length > 0 && (
        <div className="border border-red-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-red-400">⛔ BLOCKED ({bottlenecks.length})</h3>
          <div className="space-y-2">
            {bottlenecks.map((b, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-zinc-600 mt-0.5">•</span>
                <div>
                  <span className="text-zinc-300">{b.task.title}</span>
                  <span className="text-zinc-600"> — {b.reason}</span>
                  {b.daysStuck > 0 && (
                    <span className="text-red-400 text-xs ml-2">({b.daysStuck}d overdue)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Decisions */}
      {overdueDecisions.length > 0 && (
        <div className="border border-amber-900/40 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-amber-400">⚡ DECISIONS OVERDUE ({overdueDecisions.length})</h3>
          <div className="space-y-3">
            {overdueDecisions.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-200">{d.title}</p>
                  <p className="text-xs text-zinc-500">
                    Blocks {d.tasksAffected} tasks across {d.streamsAffected} streams
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-300 transition-colors">
                    Default: {d.defaultOption}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting On */}
      {waitingOn.length > 0 && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">⏳ WAITING ON ({waitingOn.length})</h3>
          <div className="space-y-2">
            {waitingOn.map((w) => (
              <div key={w.id} className="flex items-start gap-3 text-sm">
                <span className="text-zinc-600 mt-0.5">•</span>
                <div>
                  <span className="text-zinc-300">{w.personOrVendor}</span>
                  <span className="text-zinc-600"> — {w.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery Playbook */}
      {health.momentumScore < 40 && recovery.length > 0 && (
        <QuickActions actions={recovery} />
      )}

      {/* Navigation */}
      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          ← Radar
        </Link>
        <Link href="/decisions" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          All Decisions
        </Link>
        <Link href="/dependencies" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Dependencies
        </Link>
      </nav>
    </div>
  );
}
