'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';
import { KebabMenu } from '@/components/shared/kebab-menu';

export default function DecisionsPage() {
  const { state, acceptDecisionDefault, makeDecision, deferDecision } = useAppState();
  const dayNumber = getDayNumber();

  const pending = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => {
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
    if (!d.deadline) return 'Unknown - no deadline set';
    const daysOver = Math.max(0, Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000*60*60*24)));
    if (daysOver > 0) return `Already ${daysOver} days overdue. Downstream work is stalled.`;
    const daysUntil = Math.floor((new Date(d.deadline).getTime() - Date.now()) / (1000*60*60*24));
    return `${daysUntil} days until deadline. After that, dependent work stalls.`;
  }

  function getDecisionKebab(d: any) {
    const actions = [];
    const alternatives = d.options?.filter((o: any) => o.label !== d.defaultOption) || [];
    alternatives.forEach((opt: any) => {
      actions.push({ label: opt.label, onClick: () => makeDecision(d.id, opt.label) });
    });
    if (d.deferCount < d.maxDeferrals) {
      actions.push({ label: 'Defer 7d', onClick: () => deferDecision(d.id) });
    }
    return actions;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-2xl font-medium text-[var(--svaas-brown-dark)] mt-3">Decisions</h1>
        <p className="text-sm text-[var(--svaas-brown-light)] mt-1">{pending.length} pending · {decided.length} decided</p>
      </header>

      {/* Decision of the Day - featured */}
      {topDecision && (
        <div className="border border-[var(--svaas-amber)]/20 bg-[var(--svaas-amber-light)] rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <p className="text-xs text-[var(--svaas-amber)]">Decision of the day</p>
            <KebabMenu actions={getDecisionKebab(topDecision)} />
          </div>
          <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">{topDecision.title}</h2>
          {topDecision.context && <p className="text-sm text-[var(--svaas-brown)]">{topDecision.context}</p>}
          
          <div className="border-t border-[var(--svaas-amber)]/10 pt-4 space-y-2">
            <div className="text-xs"><span className="text-[var(--svaas-brown-light)]">Why it matters:</span> <span className="text-[var(--svaas-brown)]">Blocks downstream streams and tasks until decided.</span></div>
            <div className="text-xs"><span className="text-[var(--svaas-brown-light)]">Cost of waiting:</span> <span className="text-[var(--svaas-amber)] font-medium">{getCostOfWaiting(topDecision)}</span></div>
            <div className="text-xs"><span className="text-[var(--svaas-brown-light)]">Default if undecided:</span> <span className="text-[var(--svaas-brown)]">{topDecision.defaultOption}</span></div>
          </div>

          <div className="pt-2">
            <button onClick={() => acceptDecisionDefault(topDecision.id)} className="px-4 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium">
              Accept: {topDecision.defaultOption}
            </button>
          </div>
        </div>
      )}

      {/* Remaining Pending - only Accept button visible */}
      {pending.length > 1 && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--svaas-brown-light)]">Also pending</p>
          {pending.slice(1).map((d: any) => {
            const isOverdue = d.deadline && new Date(d.deadline) < new Date();
            return (
              <div key={d.id} className={`border ${isOverdue ? 'border-[var(--svaas-clay)]/20 bg-[var(--svaas-clay-light)]' : 'border-[var(--svaas-sand)] bg-[var(--svaas-cream)]'} rounded-2xl p-5 space-y-3`}>
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-[var(--svaas-brown-dark)]">{d.title}</h3>
                  {isOverdue && <span className="text-[10px] text-[var(--svaas-clay)] font-medium">Overdue</span>}
                </div>
                <p className="text-xs text-[var(--svaas-brown-light)]">Default: {d.defaultOption} · Due: {d.deadline || 'None'}</p>
                <div>
                  <button onClick={() => acceptDecisionDefault(d.id)} className="px-4 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium">
                    Accept: {d.defaultOption}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently Decided */}
      {decided.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--svaas-brown-light)]">Decided</p>
          <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-5 space-y-2">
            {decided.map((d: any) => (
              <div key={d.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-[var(--svaas-olive)]">&#10003;</span>
                <span className="text-[var(--svaas-brown)]">{d.title}</span>
                <span className="text-[var(--svaas-brown-light)]">&rarr; {d.decisionMade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && decided.length === 0 && (
        <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-8 text-center">
          <p className="text-[var(--svaas-brown)] font-medium">No decisions at the moment.</p>
          <p className="text-sm text-[var(--svaas-brown-light)] mt-1">When decisions arise, they will appear here.</p>
        </div>
      )}

      <AppNav />
    </div>
  );
}
