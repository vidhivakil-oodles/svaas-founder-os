'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';

export default function DecisionsPage() {
  const { state, acceptDecisionDefault, makeDecision, deferDecision } = useAppState();
  const dayNumber = getDayNumber();

  const pending = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
      // Rank: overdue first, then by deadline proximity
      const aOverdue = a.deadline && new Date(a.deadline) < new Date() ? 1 : 0;
      const bOverdue = b.deadline && new Date(b.deadline) < new Date() ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return aDate - bDate;
    });

  const decided = state.decisions.filter((d: any) => d.status === 'decided' || d.status === 'defaulted');
  const topDecision = pending[0];

  function getCostOfWaiting(d: any) {
    if (!d.deadline) return 'Unknown — no deadline set';
    const daysOver = Math.max(0, Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000*60*60*24)));
    if (daysOver > 0) return `Already ${daysOver} days overdue. Downstream work is stalled.`;
    const daysUntil = Math.floor((new Date(d.deadline).getTime() - Date.now()) / (1000*60*60*24));
    return `${daysUntil} days until deadline. After that, dependent work stalls.`;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header>
        <BackToHome />
        <h1 className="text-2xl font-bold text-zinc-100 mt-2">Decisions</h1>
        <p className="text-sm text-zinc-500">{pending.length} pending &bull; {decided.length} decided</p>
      </header>

      {/* Decision of the Day */}
      {topDecision && (
        <div className="border-2 border-amber-800/50 bg-amber-950/15 rounded-xl p-5 space-y-4">
          <p className="text-xs text-amber-400 uppercase tracking-wide font-medium">Decision of the Day</p>
          <h2 className="text-xl font-semibold text-zinc-100">{topDecision.title}</h2>
          {topDecision.context && <p className="text-sm text-zinc-400">{topDecision.context}</p>}
          
          <div className="border-t border-amber-900/30 pt-3 space-y-2">
            <div className="text-xs"><span className="text-zinc-500">Why it matters:</span> <span className="text-zinc-300">Blocks downstream streams and tasks until decided.</span></div>
            <div className="text-xs"><span className="text-zinc-500">Cost of waiting:</span> <span className="text-amber-400">{getCostOfWaiting(topDecision)}</span></div>
            <div className="text-xs"><span className="text-zinc-500">Default if undecided:</span> <span className="text-zinc-300">{topDecision.defaultOption}</span></div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">
              Accept: {topDecision.defaultOption}
            </button>
            {topDecision.options.filter((o: any) => o.label !== topDecision.defaultOption).map((opt: any) => (
              <button key={opt.label} onClick={() => makeDecision(topDecision.id, opt.label)} className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Remaining Pending */}
      {pending.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm text-zinc-500">Also pending</h3>
          {pending.slice(1).map((d: any) => {
            const isOverdue = d.deadline && new Date(d.deadline) < new Date();
            return (
              <div key={d.id} className={`border ${isOverdue ? 'border-red-900/40 bg-red-950/10' : 'border-zinc-800'} rounded-xl p-4 space-y-3`}>
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-zinc-200">{d.title}</h3>
                  {isOverdue && <span className="text-xs text-red-400 font-medium">OVERDUE</span>}
                </div>
                <p className="text-xs text-zinc-500">Default: {d.defaultOption} &bull; Due: {d.deadline || '—'}</p>
                <div className="flex gap-2">
                  <button onClick={() => acceptDecisionDefault(d.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium">
                    Accept: {d.defaultOption}
                  </button>
                  {d.deferCount < d.maxDeferrals && (
                    <button onClick={() => deferDecision(d.id)} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-xs rounded-lg">
                      Defer 7d
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently Decided */}
      {decided.length > 0 && (
        <div className="border border-zinc-800 rounded-xl p-4 space-y-2">
          <h3 className="text-sm text-zinc-500">Decided</h3>
          {decided.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 text-sm py-1">
              <span className="text-emerald-400">✓</span>
              <span className="text-zinc-300">{d.title}</span>
              <span className="text-zinc-600">→ {d.decisionMade}</span>
            </div>
          ))}
        </div>
      )}

      <AppNav />
    </div>
  );
}
