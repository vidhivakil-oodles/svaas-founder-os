import { getDecisions } from '@/services/venture-engine';
import { DecisionActions } from '@/components/shared/decision-actions';
import Link from 'next/link';

export default function DecisionsPage() {
  const decisions = getDecisions();
  const totalDelay = decisions.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.estimatedDelayDays, 0);
  const totalBlocked = decisions.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.tasksAffected, 0);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Decisions</h1>
        <p className="text-sm text-zinc-500">Ranked by impact. Highest-damage decisions first.</p>
      </header>

      {/* Decision Debt Summary */}
      <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-400 mb-2">Decision Debt</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-zinc-100">{totalDelay}d</div>
            <div className="text-xs text-zinc-500">Total delay caused</div>
          </div>
          <div>
            <div className="text-xl font-bold text-zinc-100">{totalBlocked}</div>
            <div className="text-xs text-zinc-500">Tasks waiting</div>
          </div>
          <div>
            <div className="text-xl font-bold text-zinc-100">{decisions.filter(d => d.status === 'pending').length}</div>
            <div className="text-xs text-zinc-500">Open decisions</div>
          </div>
        </div>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {decisions.filter(d => d.status === 'pending').map((decision, index) => {
          const isOverdue = decision.deadline && new Date(decision.deadline) < new Date();

          return (
            <div key={decision.id} className={`border ${isOverdue ? 'border-red-900/50 bg-red-950/10' : 'border-zinc-800'} rounded-lg p-5 space-y-4`}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-600 font-mono">#{index + 1}</span>
                    <h3 className="font-semibold text-zinc-100">{decision.title}</h3>
                  </div>
                  {decision.context && (
                    <p className="text-sm text-zinc-400 mt-1">{decision.context}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold ${decision.impactScore >= 60 ? 'text-red-400' : decision.impactScore >= 30 ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {decision.impactScore}
                  </div>
                  <div className="text-xs text-zinc-600">impact</div>
                </div>
              </div>

              {/* Impact Box */}
              <div className="bg-zinc-900/50 rounded-md p-3 grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{decision.streamsAffected}</div>
                  <div className="text-xs text-zinc-600">streams</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{decision.tasksAffected}</div>
                  <div className="text-xs text-zinc-600">tasks</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{decision.estimatedDelayDays}d</div>
                  <div className="text-xs text-zinc-600">delay</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{decision.cascadeDepth}</div>
                  <div className="text-xs text-zinc-600">depth</div>
                </div>
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-2 text-xs">
                {isOverdue ? (
                  <span className="text-red-400 font-medium">OVERDUE — was due {decision.deadline}</span>
                ) : (
                  <span className="text-zinc-500">Due: {decision.deadline}</span>
                )}
                {decision.deferCount > 0 && (
                  <span className="text-amber-400">Deferred {decision.deferCount}x</span>
                )}
                {decision.deferCount >= decision.maxDeferrals && (
                  <span className="text-red-400 font-medium">NO MORE DEFERRALS</span>
                )}
              </div>

              {/* Default + Actions */}
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500 mb-3">
                  <span className="text-zinc-400 font-medium">Default:</span> {decision.defaultOption}
                  {decision.defaultRationale && (
                    <span className="text-zinc-600"> — {decision.defaultRationale}</span>
                  )}
                </p>
                <DecisionActions decision={decision} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
