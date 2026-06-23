'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';
import { VentureJournal, WeekJournalSummary } from '@/components/shared/venture-journal';

function calculateReviewData(state: any) {
  const weekNumber = getWeekNumber();
  const dayNumber = getDayNumber();
  const dayStart = (weekNumber - 1) * 7 + 1;
  const dayEnd = weekNumber * 7;

  const completedThisWeek = state.tasks
    .filter((t: any) => t.status === 'done' && t.completedAt)
    .map((t: any) => t.title)
    .slice(0, 5);

  const stuckItems = state.tasks
    .filter((t: any) => t.status === 'blocked' || (t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd))
    .slice(0, 5)
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      reason: t.blockedReason || 'Overdue',
      daysOverdue: t.dayRangeEnd ? Math.max(0, dayNumber - t.dayRangeEnd) : 0,
      stream: state.streams.find((s: any) => s.id === t.streamId)?.name || 'Unknown',
      status: t.status,
    }));

  const vendorWaits = state.waitingOn.filter((w: any) => w.status === 'active');

  const pendingDecisions = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => b.impactScore - a.impactScore)
    .slice(0, 3);

  const actionable = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
    .slice(0, 3);

  const attention = state.streams.map((s: any) => ({
    stream: s.name,
    actions: state.dailyEngagement
      .filter((e: any) => (e.streamsTouched || []).includes(s.slug))
      .length,
  })).sort((a: any, b: any) => b.actions - a.actions);

  const thisWeekActivity = state.dailyEngagement.filter((e: any) => e.hadActivity).length;

  return {
    weekNumber,
    dayRange: `Day ${dayStart}-${dayEnd}`,
    phase: VENTURE_CONFIG.currentPhase,
    completedThisWeek,
    stuckItems,
    vendorWaits,
    pendingDecisions,
    suggestedFocus: {
      primary: actionable[0]?.title || 'No critical actions pending',
      primaryId: actionable[0]?.id || null,
      reason: actionable[0]?.notesDependencies || '',
      secondary: actionable.slice(1).map((t: any) => t.title),
    },
    attention,
    dreamProtection: { thisWeek: thisWeekActivity, target: VENTURE_CONFIG.dreamProtectionTarget },
  };
}

const STEPS = [
  { id: 1, title: 'What Happened', time: '2 min' },
  { id: 2, title: 'What Got Stuck', time: '3 min' },
  { id: 3, title: 'Vendor Check', time: '2 min' },
  { id: 4, title: 'Decisions', time: '3 min' },
  { id: 5, title: 'Next Week', time: '3 min' },
  { id: 6, title: 'Momentum', time: '2 min' },
  { id: 7, title: 'Venture Journal', time: '2 min' },
  { id: 8, title: 'Close Week', time: '1 min' },
];

export default function WeeklyReviewPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [nextWeekCommitment, setNextWeekCommitment] = useState('');
  const [weekClosed, setWeekClosed] = useState(false);
  const { state, setWeeklyCommitment, commitTask, blockTask, waitingOnTask, markTaskDone, acceptDecisionDefault, deferDecision, markWaitingOnReceived, closeWeek } = useAppState();
  const data = calculateReviewData(state);

  const totalMinutes = STEPS.map(s => s.time.replace(' min', '')).reduce((sum, t) => sum + parseInt(t), 0);

  return (
    <div className="space-y-0 max-w-2xl mx-auto">
      {/* Masthead - Premium editorial header */}
      <header className="pt-3 pb-8 border-b border-[var(--svaas-sand)]/30">
        <BackToHome />
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">Weekly Review</p>
          <h1 className="text-[32px] font-semibold text-[var(--svaas-brown-dark)] mt-2 leading-tight font-[family-name:var(--font-serif)]">Week {data.weekNumber}</h1>
          <p className="text-[14px] text-[var(--svaas-brown-light)] mt-1">Prepared by Drishti · {data.dayRange} · {totalMinutes} minutes</p>
        </div>
      </header>

      {/* Progress rail - Thin editorial progress bar */}
      <div className="py-5 border-b border-[var(--svaas-sand)]/20">
        <div className="flex items-center gap-0.5 mb-2">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex-1 h-1 rounded-full transition-all ${
                step.id < currentStep ? 'bg-[var(--svaas-olive)]' :
                step.id === currentStep ? 'bg-[var(--svaas-brown-dark)] scale-y-150' : 'bg-[var(--svaas-sand)]/40'
              }`}
            />
          ))}
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{STEPS[currentStep - 1].title}</p>
          <p className="text-[12px] text-[var(--svaas-brown-light)]">{currentStep}/{STEPS.length} · {STEPS[currentStep - 1].time}</p>
        </div>
      </div>

      {/* Content - Narrative editorial sections, no card wrapper */}
      <div className="py-8 min-h-[300px]">

        {/* STEP 1: What Happened */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">What happened this week</h2>
            <p className="text-[14px] text-[var(--svaas-brown)] leading-relaxed">
              {data.completedThisWeek.length > 0
                ? `You completed ${data.completedThisWeek.length} action${data.completedThisWeek.length !== 1 ? 's' : ''} this week.`
                : 'No actions completed yet this week.'}
            </p>
            {data.completedThisWeek.length > 0 && (
              <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/20">
                {data.completedThisWeek.map((title: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className="text-[var(--svaas-olive)] text-[13px]">&#10003;</span>
                    <p className="text-[14px] text-[var(--svaas-brown)]">{title}</p>
                  </div>
                ))}
              </div>
            )}
            <WeekJournalSummary />
          </div>
        )}

        {/* STEP 2: What Got Stuck */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">What got stuck</h2>
              <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Items that need your attention to move forward.</p>
            </div>
            {data.stuckItems.length === 0 && (
              <p className="text-[14px] text-[var(--svaas-olive)]">Nothing stuck this week.</p>
            )}
            <div className="divide-y divide-[var(--svaas-sand)]/20">
              {data.stuckItems.map((item: any) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-0.5 self-stretch bg-[var(--svaas-clay)] shrink-0 rounded-full mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{item.title}</p>
                      <p className="text-[12px] text-[var(--svaas-brown-light)] mt-0.5">{item.stream} · {item.reason}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => commitTask(item.id)}
                    className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg font-medium shrink-0"
                  >
                    Commit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Vendor Check */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Vendor and external check</h2>
              <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Who owes you something?</p>
            </div>
            {data.vendorWaits.length === 0 && (
              <p className="text-[14px] text-[var(--svaas-olive)]">No active vendor waits this week.</p>
            )}
            <div className="divide-y divide-[var(--svaas-sand)]/20">
              {data.vendorWaits.map((w: any) => (
                <div key={w.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{w.personOrVendor}</p>
                    <p className="text-[13px] text-[var(--svaas-brown)] mt-0.5">{w.description}</p>
                    {w.lastContacted && <p className="text-[11px] text-[var(--svaas-brown-light)] mt-0.5">Last contacted: {w.lastContacted}</p>}
                  </div>
                  <button
                    onClick={() => markWaitingOnReceived(w.id)}
                    className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg font-medium shrink-0"
                  >
                    Received
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Decisions */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Decisions</h2>
              <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">{data.pendingDecisions.length} decision{data.pendingDecisions.length !== 1 ? 's' : ''} need your attention.</p>
            </div>
            {data.pendingDecisions.length === 0 && (
              <p className="text-[14px] text-[var(--svaas-olive)]">No pending decisions this week.</p>
            )}
            <div className="divide-y divide-[var(--svaas-sand)]/20">
              {data.pendingDecisions.map((d: any) => {
                const daysOverdue = d.deadline && new Date(d.deadline) < new Date() ? Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return (
                  <div key={d.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-[var(--svaas-brown-light)]">{d.defaultOption}</span>
                        {daysOverdue > 0 && <span className="text-[11px] text-[var(--svaas-clay)] font-medium">{daysOverdue}d overdue</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => acceptDecisionDefault(d.id)}
                      className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg font-medium shrink-0"
                    >
                      Accept
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Next Week Focus */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Next week priorities</h2>
              <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Drishti identified these based on critical path analysis.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-0.5 self-stretch bg-[var(--svaas-olive)] shrink-0 rounded-full" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-1">Primary focus</p>
                <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{data.suggestedFocus.primary}</p>
                {data.suggestedFocus.reason && <p className="text-[13px] text-[var(--svaas-brown)] mt-1">{data.suggestedFocus.reason}</p>}
              </div>
            </div>

            {data.suggestedFocus.secondary.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Secondary</p>
                {data.suggestedFocus.secondary.map((item: any, i: number) => (
                  <p key={i} className="text-[14px] text-[var(--svaas-brown)] pl-3 border-l-2 border-[var(--svaas-sand)]/30">{item}</p>
                ))}
              </div>
            )}

            {data.suggestedFocus.primaryId && (
              <div className="pt-3">
                <button
                  onClick={() => { commitTask(data.suggestedFocus.primaryId); }}
                  className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium"
                >
                  Commit
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Momentum */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Momentum</h2>

            <div className="flex gap-8">
              <div>
                <p className="text-[32px] font-semibold text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{getDayNumber()}</p>
                <p className="text-[11px] tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Day</p>
              </div>
              <div>
                <p className="text-[32px] font-semibold text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{data.dreamProtection.thisWeek}<span className="text-[var(--svaas-brown-light)] font-normal">/{data.dreamProtection.target}</span></p>
                <p className="text-[11px] tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Days active</p>
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Attention this week</p>
              {data.attention.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-[13px] text-[var(--svaas-brown)] w-32 truncate">{a.stream}</span>
                  <div className="flex-1 h-0.5 bg-[var(--svaas-sand)]/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.actions > 0 ? 'bg-[var(--svaas-olive)]' : 'bg-transparent'}`}
                      style={{ width: `${Math.min((a.actions / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-[var(--svaas-brown-light)] w-4 text-right">{a.actions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Venture Journal */}
        {currentStep === 7 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Venture Journal</h2>
              <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Your venture memory. Add notes, see the timeline.</p>
            </div>
            <VentureJournal thisWeekOnly={true} maxEntries={30} showNoteInput={true} compact={false} />
          </div>
        )}

        {/* STEP 8: Close Week */}
        {currentStep === 8 && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">Close Week</h2>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-2">Your one commitment for next week</p>
                <p className="text-[13px] text-[var(--svaas-brown-light)] mb-3">One thing. The most important thing. Not three things. One.</p>
                <input
                  value={nextWeekCommitment}
                  onChange={e => setNextWeekCommitment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && nextWeekCommitment.trim()) { setWeeklyCommitment(nextWeekCommitment.trim()); } }}
                  placeholder="e.g., Get LLP registration filed"
                  className="w-full px-4 py-3 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[14px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
                />
                {nextWeekCommitment.trim() && !state.weeklyCommitment?.text && (
                  <button
                    onClick={() => setWeeklyCommitment(nextWeekCommitment.trim())}
                    className="mt-3 px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium"
                  >
                    Commit
                  </button>
                )}
                {state.weeklyCommitment && state.weeklyCommitment.weekNumber === data.weekNumber && (
                  <p className="text-[13px] text-[var(--svaas-olive)] mt-3">&#10003; Set: &ldquo;{state.weeklyCommitment.text}&rdquo;</p>
                )}
              </div>

              <hr className="border-[var(--svaas-sand)]/30" />

              {weekClosed ? (
                <div className="text-center py-4">
                  <p className="text-[16px] text-[var(--svaas-olive)] font-medium">&#10003; Week {data.weekNumber} closed.</p>
                  <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Review saved to venture memory.</p>
                </div>
              ) : (
                <>
                  <p className="text-[14px] text-[var(--svaas-brown)]">
                    Week {data.weekNumber} reviewed. {data.completedThisWeek.length} actions completed.
                  </p>
                  <button
                    onClick={() => { closeWeek(); setWeekClosed(true); }}
                    className="w-full mt-2 px-5 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[14px] rounded-lg font-medium"
                  >
                    Close Week {data.weekNumber}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation - editorial */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--svaas-sand)]/30">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-5 py-2.5 border border-[var(--svaas-sand)]/40 text-[var(--svaas-brown)] text-[13px] rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map(step => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                step.id === currentStep ? 'bg-[var(--svaas-brown-dark)] w-4' :
                step.id < currentStep ? 'bg-[var(--svaas-olive)]' : 'bg-[var(--svaas-sand)]'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
          disabled={currentStep === STEPS.length}
          className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      <AppNav />
    </div>
  );
}
