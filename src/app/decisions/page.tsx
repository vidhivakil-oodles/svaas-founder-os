'use client';

import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';

export default function DecisionsPage() {
  const { state, acceptDecisionDefault, makeDecision, deferDecision } = useAppState();

  const pending = state.decisions
    .filter(d => d.status === 'pending')
    .sort((a, b) => b.impactScore - a.impactScore);

  const decided = state.decisions.filter(d => d.status === 'decided');

  const totalDelay = pending.reduce((sum, d) => sum + d.estimatedDelayDays, 0);
  const totalBlocked = pending.reduce((sum, d) => sum + d.tasksAffected, 0);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Decisions</h1>
        <p className="text-sm text-zinc-500">Ranked by impact. Highest-damage first.</p>
      </header>

      {/* Decision Debt */}
      {pending.length > 0 && (
        <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-400 mb-2">Decision Debt</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-xl font-bold text-zinc-100">{totalDelay}d</div><div className="text-xs text-zinc-500">Total delay</div></div>
            <div><div className="text-xl font-bold text-zinc-100">{totalBlocked}</div><div className="text-xs text-zinc-500">Tasks waiting</div></div>
            <div><div className="text-xl font-bold text-zinc-100">{pending.length}</div><div className="text-xs text-zinc-500">Open</div></div>
          </div>
        </div>
      )}

      {/* Pending Decisions */}
      <div className="space-y-4">
        {pending.map((d, idx) => {
          const isOverdue = d.deadline && new Date(d.deadline) < new Date();
          return (
            <div key={d.id} className={`border ${isOverdue ? 'border-red-900/50 bg-red-950/10' : 'border-zinc-800'} rounded-lg p-5 space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-zinc-600 font-mono">#{idx + 1} </span>
                  <span className="font-semibold text-zinc-100">{d.title}</span>
                  {d.context && <p className="text-sm text-zinc-400 mt-1">{d.context}</p>}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${d.impactScore >= 60 ? 'text-red-400' : d.impactScore >= 30 ? 'text-amber-400' : 'text-zinc-400'}`}>{d.impactScore}</div>
                  <div className="text-xs text-zinc-600">impact</div>
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-md p-3 grid grid-cols-4 gap-3 text-center">
                <div><div className="text-sm font-semibold text-zinc-200">{d.streamsAffected}</div><div className="text-xs text-zinc-600">streams</div></div>
                <div><div className="text-sm font-semibold text-zinc-200">{d.tasksAffected}</div><div className="text-xs text-zinc-600">tasks</div></div>
                <div><div className="text-sm font-semibold text-zinc-200">{d.estimatedDelayDays}d</div><div className="text-xs text-zinc-600">delay</div></div>
                <div><div className="text-sm font-semibold text-zinc-200">{d.cascadeDepth}</div><div className="text-xs text-zinc-600">depth</div></div>
              </div>

              {isOverdue && <p className="text-xs text-red-400 font-medium">OVERDUE — was due {d.deadline}</p>}
              {d.deferCount > 0 && <p className="text-xs text-amber-400">Deferred {d.deferCount}x{d.deferCount >= d.maxDeferrals ? ' — NO MORE DEFERRALS' : ''}</p>}

              <div className="border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500 mb-3"><span className="text-zinc-400 font-medium">Default:</span> {d.defaultOption}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => acceptDecisionDefault(d.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md font-medium transition-colors">
                    Accept: {d.defaultOption}
                  </button>
                  {d.options.filter(o => o.label !== d.defaultOption).map(opt => (
                    <button key={opt.label} onClick={() => makeDecision(d.id, opt.label)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md transition-colors">
                      {opt.label}
                    </button>
                  ))}
                  {d.deferCount < d.maxDeferrals && (
                    <button onClick={() => deferDecision(d.id)} className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-sm rounded-md transition-colors">
                      Defer 7d
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently Decided */}
      {decided.length > 0 && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">✅ Recently Decided</h3>
          {decided.map(d => (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400">✓</span>
              <span className="text-zinc-300">{d.title}</span>
              <span className="text-zinc-600">→ {d.decisionMade}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
