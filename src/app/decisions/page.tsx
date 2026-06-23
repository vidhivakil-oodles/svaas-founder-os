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
  const otherPending = pending.slice(1);

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

  function getDeadlineLabel(d: any) {
    if (!d.deadline) return null;
    const daysOver = Math.max(0, Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000*60*60*24)));
    if (daysOver > 0) return { text: `${daysOver}d overdue`, urgent: true };
    const daysUntil = Math.floor((new Date(d.deadline).getTime() - Date.now()) / (1000*60*60*24));
    if (daysUntil <= 3) return { text: `Due in ${daysUntil}d`, urgent: false };
    return { text: `Due ${d.deadline}`, urgent: false };
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-[24px] font-medium text-[var(--svaas-brown-dark)] mt-3 font-[family-name:var(--font-serif)]">Decisions</h1>
        <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">{pending.length} pending · {decided.length} decided</p>
      </header>

      {/* ═══════════════════════════════════════════════════════
          DECISION OF THE DAY — Full-width featured panel
          ═══════════════════════════════════════════════════════ */}
      {topDecision && (
        <section className="border border-[var(--svaas-sand)]/40 bg-[var(--svaas-cream)] rounded-xl overflow-hidden">
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">Decision of the day</p>
              <KebabMenu actions={getDecisionKebab(topDecision)} />
            </div>
            <h2 className="text-[24px] font-medium text-[var(--svaas-brown-dark)] leading-snug font-[family-name:var(--font-serif)]">{topDecision.title}</h2>
            {topDecision.context && <p className="text-[14px] text-[var(--svaas-brown)] leading-relaxed">{topDecision.context}</p>}

            <div className="border-t border-[var(--svaas-sand)]/30 pt-4 space-y-2">
              <div className="text-[13px]">
                <span className="text-[var(--svaas-brown-light)]">Impact: </span>
                <span className="text-[var(--svaas-brown)]">Blocks downstream streams and tasks until decided.</span>
              </div>
              <div className="text-[13px]">
                <span className="text-[var(--svaas-brown-light)]">Cost of waiting: </span>
                <span className="text-[var(--svaas-clay)] font-medium">{getCostOfWaiting(topDecision)}</span>
              </div>
            </div>

            {/* Recommendation + verb-only buttons */}
            <div className="border-t border-[var(--svaas-sand)]/30 pt-4">
              <p className="text-[13px] text-[var(--svaas-brown-light)] mb-1">Drishti recommends</p>
              <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)] mb-4">{topDecision.defaultOption}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => acceptDecisionDefault(topDecision.id)}
                  className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    const alt = topDecision.options?.find((o: any) => o.label !== topDecision.defaultOption);
                    if (alt) makeDecision(topDecision.id, alt.label);
                    else if (topDecision.deferCount < topDecision.maxDeferrals) deferDecision(topDecision.id);
                  }}
                  className="px-5 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-[13px] rounded-lg font-medium"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          OTHER PENDING — Compact rows, not full cards
          Scannable in under 30 seconds
          ═══════════════════════════════════════════════════════ */}
      {otherPending.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase mb-3">Also pending</p>
          <div className="border border-[var(--svaas-sand)]/30 bg-[var(--svaas-cream)] rounded-xl divide-y divide-[var(--svaas-sand)]/20">
            {otherPending.map((d: any) => {
              const deadlineInfo = getDeadlineLabel(d);
              return (
                <div key={d.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Left spine accent for overdue */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)] truncate">{d.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] text-[var(--svaas-brown-light)]">Drishti recommends: {d.defaultOption}</span>
                      {deadlineInfo && (
                        <span className={`text-[11px] font-medium ${deadlineInfo.urgent ? 'text-[var(--svaas-clay)]' : 'text-[var(--svaas-brown-light)]'}`}>
                          · {deadlineInfo.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => acceptDecisionDefault(d.id)}
                      className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium"
                    >
                      Accept
                    </button>
                    <KebabMenu actions={getDecisionKebab(d)} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          DECIDED — Minimal, collapsed feel
          ═══════════════════════════════════════════════════════ */}
      {decided.length > 0 && (
        <section>
          <details>
            <summary className="text-[13px] text-[var(--svaas-brown-light)] cursor-pointer hover:text-[var(--svaas-brown)]">
              {decided.length} decided
            </summary>
            <div className="mt-3 border border-[var(--svaas-sand)]/30 bg-[var(--svaas-cream)] rounded-xl divide-y divide-[var(--svaas-sand)]/20">
              {decided.map((d: any) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-[var(--svaas-olive)] text-[14px]">&#10003;</span>
                  <span className="text-[14px] text-[var(--svaas-brown)]">{d.title}</span>
                  <span className="text-[13px] text-[var(--svaas-brown-light)]">&rarr; {d.decisionMade}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {pending.length === 0 && decided.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[18px] text-[var(--svaas-brown)] font-medium">No decisions at the moment.</p>
          <p className="text-[14px] text-[var(--svaas-brown-light)] mt-2">When decisions arise, they will appear here.</p>
        </div>
      )}

      <AppNav />
    </div>
  );
}
