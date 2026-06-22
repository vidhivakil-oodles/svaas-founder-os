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
  { id: 2, title: 'What\'s Stuck', time: '3 min' },
  { id: 3, title: 'Vendor Check', time: '2 min' },
  { id: 4, title: 'Decisions', time: '3 min' },
  { id: 5, title: 'Next Week Focus', time: '3 min' },
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

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-2xl font-medium text-[var(--svaas-brown-dark)] mt-3">Weekly Review</h1>
        <p className="text-sm text-[var(--svaas-brown-light)] mt-1">
          Week {data.weekNumber} &middot; {data.dayRange} &middot; ~18 minutes
        </p>
      </header>

      {/* Step Indicator */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {STEPS.map(step => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step.id < currentStep ? 'bg-[var(--svaas-olive)]' :
                step.id === currentStep ? 'bg-[var(--svaas-amber)]' : 'bg-[var(--svaas-sand)]'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--svaas-brown-light)]">
          <span>Step {currentStep}/{STEPS.length}: {STEPS[currentStep - 1].title}</span>
          <span>{STEPS[currentStep - 1].time}</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-6 min-h-[320px]">
        {/* STEP 1: What Happened */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">What Happened This Week?</h2>
            <WeekJournalSummary />
          </div>
        )}

        {/* STEP 2: What's Stuck */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">What&apos;s Stuck?</h2>
            <p className="text-sm text-[var(--svaas-brown-light)]">These items need attention. Take action now:</p>
            {data.stuckItems.length === 0 && (
              <p className="text-sm text-[var(--svaas-brown-light)]">Nothing stuck this week.</p>
            )}
            <div className="space-y-4">
              {data.stuckItems.map((item: any) => (
                <div key={item.id} className="border border-[var(--svaas-clay)]/20 bg-[var(--svaas-clay-light)] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[var(--svaas-brown-dark)] text-sm">{item.title}</p>
                      <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{item.stream} &middot; {item.reason}</p>
                    </div>
                    {item.daysOverdue > 0 && <span className="text-xs text-[var(--svaas-clay)]">{item.daysOverdue}d</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => markTaskDone(item.id)}
                      className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
                    >
                      Done now
                    </button>
                    <button
                      onClick={() => commitTask(item.id)}
                      className="px-4 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-sm rounded-xl hover:bg-[var(--svaas-cream)] transition-colors"
                    >
                      Will do this week
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Vendor Check */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Vendor & External Check</h2>
            <p className="text-sm text-[var(--svaas-brown-light)]">Who owes you something?</p>
            {data.vendorWaits.length === 0 && (
              <p className="text-sm text-[var(--svaas-brown-light)]">No active vendor waits this week.</p>
            )}
            <div className="space-y-3">
              {data.vendorWaits.map((w: any) => (
                <div key={w.id} className="border border-[var(--svaas-sand)] rounded-xl p-4">
                  <div>
                    <p className="font-medium text-[var(--svaas-brown-dark)] text-sm">{w.personOrVendor}</p>
                    <p className="text-sm text-[var(--svaas-brown)] mt-0.5">{w.description}</p>
                    {w.lastContacted && <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Last contacted: {w.lastContacted}</p>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => markWaitingOnReceived(w.id)}
                      className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
                    >
                      Received
                    </button>
                    <button
                      className="px-4 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-sm rounded-xl hover:bg-white transition-colors"
                      onClick={() => {}}
                    >
                      Still waiting
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Decisions */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Decisions</h2>
            <p className="text-sm text-[var(--svaas-brown-light)]">{data.pendingDecisions.length} decision{data.pendingDecisions.length !== 1 ? 's' : ''} need your attention:</p>
            {data.pendingDecisions.length === 0 && (
              <p className="text-sm text-[var(--svaas-brown-light)]">No pending decisions this week.</p>
            )}
            <div className="space-y-4">
              {data.pendingDecisions.map((d: any) => {
                const daysOverdue = d.deadline && new Date(d.deadline) < new Date() ? Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return (
                  <div key={d.id} className={`border ${daysOverdue ? 'border-[var(--svaas-clay)]/20 bg-[var(--svaas-clay-light)]' : 'border-[var(--svaas-sand)]'} rounded-xl p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-[var(--svaas-brown-dark)] text-sm">{d.title}</p>
                      {daysOverdue > 0 && <span className="text-xs text-[var(--svaas-clay)]">{daysOverdue}d overdue</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptDecisionDefault(d.id)}
                        className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
                      >
                        Accept: {d.defaultOption}
                      </button>
                      {d.deferCount < d.maxDeferrals && (
                        <button
                          onClick={() => deferDecision(d.id)}
                          className="px-4 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown-light)] text-sm rounded-xl hover:bg-white transition-colors"
                        >
                          Defer 7d
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Next Week Focus */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Next Week&apos;s Focus</h2>
            <p className="text-sm text-[var(--svaas-brown-light)]">Based on critical path, the system suggests:</p>

            <div className="border border-[var(--svaas-amber)]/20 bg-[var(--svaas-amber-light)] rounded-xl p-4">
              <p className="text-[10px] text-[var(--svaas-amber)] uppercase tracking-widest font-semibold mb-1">Primary Focus</p>
              <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{data.suggestedFocus.primary}</p>
              {data.suggestedFocus.reason && <p className="text-xs text-[var(--svaas-brown)] mt-1">{data.suggestedFocus.reason}</p>}
            </div>

            {data.suggestedFocus.secondary.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--svaas-brown-light)]">Secondary (if time allows):</p>
                {data.suggestedFocus.secondary.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[var(--svaas-brown)]">
                    <span className="text-[var(--svaas-brown-light)]">&bull;</span>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {data.suggestedFocus.primaryId && (
              <div className="pt-2">
                <button
                  onClick={() => { commitTask(data.suggestedFocus.primaryId); }}
                  className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
                >
                  Commit to this
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Momentum */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Momentum & Attention</h2>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border border-[var(--svaas-sand)] rounded-xl p-4">
                <div className="text-2xl font-medium text-[var(--svaas-brown-dark)]">{getDayNumber()}</div>
                <div className="text-xs text-[var(--svaas-brown-light)]">Day</div>
              </div>
              <div className="border border-[var(--svaas-sand)] rounded-xl p-4">
                <div className="text-2xl font-medium text-[var(--svaas-brown-dark)]">{data.dreamProtection.thisWeek}/{data.dreamProtection.target}</div>
                <div className="text-xs text-[var(--svaas-brown-light)]">Days active</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs text-[var(--svaas-brown-light)]">Where attention went this week:</h3>
              {data.attention.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--svaas-brown)] w-36 truncate">{a.stream}</span>
                  <div className="flex-1 h-1.5 bg-[var(--svaas-sand)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.actions > 0 ? 'bg-[var(--svaas-olive)]' : 'bg-[var(--svaas-sand)]'}`}
                      style={{ width: `${Math.min((a.actions / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--svaas-brown-light)] w-4 text-right">{a.actions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Venture Journal */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Venture Journal</h2>
            <p className="text-sm text-[var(--svaas-brown-light)]">Your venture memory. Add notes, see the full timeline.</p>
            <VentureJournal thisWeekOnly={true} maxEntries={30} showNoteInput={true} compact={false} />
          </div>
        )}

        {/* STEP 8: Close Week */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--svaas-brown-dark)]">Close Week</h2>

            <div className="space-y-4">
              <div className="border border-[var(--svaas-amber)]/20 bg-[var(--svaas-amber-light)] rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-[var(--svaas-amber)]">What is your single commitment for next week?</p>
                <p className="text-xs text-[var(--svaas-brown-light)]">One thing. The most important thing. Not three things. One.</p>
                <input
                  value={nextWeekCommitment}
                  onChange={e => setNextWeekCommitment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && nextWeekCommitment.trim()) { setWeeklyCommitment(nextWeekCommitment.trim()); } }}
                  placeholder="e.g., Get LLP registration filed"
                  className="w-full px-3 py-2.5 bg-white border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown-light)]"
                />
                {nextWeekCommitment.trim() && !state.weeklyCommitment?.text && (
                  <button
                    onClick={() => setWeeklyCommitment(nextWeekCommitment.trim())}
                    className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors"
                  >
                    Lock It In
                  </button>
                )}
                {state.weeklyCommitment && state.weeklyCommitment.weekNumber === data.weekNumber && (
                  <p className="text-xs text-[var(--svaas-olive)] mt-2">&#10003; Set: &ldquo;{state.weeklyCommitment.text}&rdquo;</p>
                )}
              </div>

              <div className="border-t border-[var(--svaas-sand)] pt-4">
                {weekClosed ? (
                  <div className="text-center py-4">
                    <p className="text-[var(--svaas-olive)] font-medium">&#10003; Week {data.weekNumber} closed.</p>
                    <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Review saved to venture memory.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[var(--svaas-brown)]">
                      Week {data.weekNumber} reviewed. {data.completedThisWeek.length} actions completed.
                    </p>
                    <button
                      onClick={() => { closeWeek(); setWeekClosed(true); }}
                      className="w-full mt-3 px-4 py-3 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] rounded-xl font-medium transition-colors"
                    >
                      Close Week {data.weekNumber}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-sm rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--svaas-cream)] transition-colors"
        >
          &larr; Previous
        </button>
        <span className="text-xs text-[var(--svaas-brown-light)]">
          {STEPS.map(s => s.time.replace(' min', '')).reduce((sum, t) => sum + parseInt(t), 0)} min total
        </span>
        <button
          onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
          disabled={currentStep === STEPS.length}
          className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next &rarr;
        </button>
      </div>

      <AppNav />
    </div>
  );
}
