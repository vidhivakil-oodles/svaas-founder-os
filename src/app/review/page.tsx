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

const SECTIONS = [
  { id: 'progress', title: 'What Happened' },
  { id: 'stuck', title: 'What Got Stuck' },
  { id: 'vendors', title: 'Vendor Check' },
  { id: 'decisions', title: 'Decisions' },
  { id: 'next', title: 'Next Week' },
  { id: 'momentum', title: 'Momentum' },
  { id: 'journal', title: 'Venture Journal' },
  { id: 'close', title: 'Close Week' },
];

export default function WeeklyReviewPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [nextWeekCommitment, setNextWeekCommitment] = useState('');
  const [weekClosed, setWeekClosed] = useState(false);
  const { state, setWeeklyCommitment, commitTask, blockTask, waitingOnTask, markTaskDone, acceptDecisionDefault, deferDecision, markWaitingOnReceived, closeWeek } = useAppState();
  const data = calculateReviewData(state);

  function goNext() {
    if (currentSection < SECTIONS.length - 1) setCurrentSection(currentSection + 1);
  }
  function goPrev() {
    if (currentSection > 0) setCurrentSection(currentSection - 1);
  }

  return (
    <div className="space-y-0 max-w-2xl mx-auto">
      {/* Letter Masthead */}
      <header className="pt-4 pb-10 border-b border-[var(--svaas-sand)]/30">
        <BackToHome />
        <div className="mt-6">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">A letter from Drishti</p>
          <h1 className="text-[40px] font-semibold text-[var(--svaas-brown-dark)] mt-3 leading-[1.1] font-[family-name:var(--font-serif)]">Week {data.weekNumber}</h1>
          <p className="text-[14px] text-[var(--svaas-brown-light)] mt-2">{data.dayRange} · {data.phase}</p>
        </div>
      </header>

      {/* Section Navigation - subtle, editorial */}
      <nav className="py-4 border-b border-[var(--svaas-sand)]/20 overflow-x-auto">
        <div className="flex gap-4">
          {SECTIONS.map((section, i) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(i)}
              className={`text-[13px] whitespace-nowrap transition-colors ${
                i === currentSection
                  ? 'text-[var(--svaas-brown-dark)] font-medium'
                  : i < currentSection
                  ? 'text-[var(--svaas-olive)]'
                  : 'text-[var(--svaas-brown-light)]'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </nav>

      {/* Content - Narrative letter sections */}
      <div className="py-10 min-h-[340px]">

        {/* SECTION: What Happened */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">What happened this week</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              {data.completedThisWeek.length > 0
                ? `You completed ${data.completedThisWeek.length} action${data.completedThisWeek.length !== 1 ? 's' : ''} this week. Here is what moved forward.`
                : 'No actions completed yet this week. The venture is waiting for momentum.'}
            </p>
            {data.completedThisWeek.length > 0 && (
              <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/20">
                {data.completedThisWeek.map((title: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <span className="text-[var(--svaas-olive)] text-[14px]">&#10003;</span>
                    <p className="text-[16px] text-[var(--svaas-brown)]">{title}</p>
                  </div>
                ))}
              </div>
            )}
            <WeekJournalSummary />
          </div>
        )}

        {/* SECTION: What Got Stuck */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">What got stuck</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              {data.stuckItems.length > 0
                ? `${data.stuckItems.length} item${data.stuckItems.length !== 1 ? 's' : ''} stalled this week. These need your attention to move forward.`
                : 'Nothing stuck this week. All streams are flowing.'}
            </p>
            {data.stuckItems.length > 0 && (
              <div className="divide-y divide-[var(--svaas-sand)]/20">
                {data.stuckItems.map((item: any) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-0.5 self-stretch bg-[var(--svaas-clay)] shrink-0 rounded-full mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{item.title}</p>
                        <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">{item.stream} · {item.reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => commitTask(item.id)}
                      className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0"
                    >
                      Commit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Vendor Check */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">Who owes you something</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              {data.vendorWaits.length > 0
                ? `You are waiting on ${data.vendorWaits.length} external party${data.vendorWaits.length !== 1 ? 'ies' : ''}. Follow up if overdue.`
                : 'No active vendor waits this week. External dependencies are clear.'}
            </p>
            {data.vendorWaits.length > 0 && (
              <div className="divide-y divide-[var(--svaas-sand)]/20">
                {data.vendorWaits.map((w: any) => (
                  <div key={w.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{w.personOrVendor}</p>
                      <p className="text-[14px] text-[var(--svaas-brown)] mt-1">{w.description}</p>
                      {w.lastContacted && <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">Last contacted: {w.lastContacted}</p>}
                    </div>
                    <button
                      onClick={() => markWaitingOnReceived(w.id)}
                      className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0"
                    >
                      Received
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Decisions */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">Decisions awaiting you</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              {data.pendingDecisions.length > 0
                ? `${data.pendingDecisions.length} decision${data.pendingDecisions.length !== 1 ? 's' : ''} remain open. Each one is delaying downstream work.`
                : 'No pending decisions this week. Your direction is clear.'}
            </p>
            {data.pendingDecisions.length > 0 && (
              <div className="divide-y divide-[var(--svaas-sand)]/20">
                {data.pendingDecisions.map((d: any) => {
                  const daysOverdue = d.deadline && new Date(d.deadline) < new Date() ? Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={d.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[13px] text-[var(--svaas-olive)]">Drishti recommends: {d.defaultOption}</span>
                          {daysOverdue > 0 && <span className="text-[13px] text-[var(--svaas-clay)] font-medium">{daysOverdue}d overdue</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => acceptDecisionDefault(d.id)}
                        className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0"
                      >
                        Accept
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Next Week */}
        {currentSection === 4 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">My recommendation for next week</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              Based on critical path analysis, here is where your energy will have the most impact.
            </p>

            <div className="flex items-start gap-3 pt-2">
              <div className="w-0.5 self-stretch bg-[var(--svaas-olive)] shrink-0 rounded-full" />
              <div className="flex-1">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-2">Primary focus</p>
                <p className="text-[18px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{data.suggestedFocus.primary}</p>
                {data.suggestedFocus.reason && <p className="text-[14px] text-[var(--svaas-brown)] mt-2">{data.suggestedFocus.reason}</p>}
              </div>
            </div>

            {data.suggestedFocus.secondary.length > 0 && (
              <div className="space-y-2 pt-4">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Also consider</p>
                {data.suggestedFocus.secondary.map((item: any, i: number) => (
                  <p key={i} className="text-[16px] text-[var(--svaas-brown)] pl-4 border-l-2 border-[var(--svaas-sand)]/30">{item}</p>
                ))}
              </div>
            )}

            {data.suggestedFocus.primaryId && (
              <div className="pt-4">
                <button
                  onClick={() => { commitTask(data.suggestedFocus.primaryId); }}
                  className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[14px] rounded-lg font-medium"
                >
                  Commit to this
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION: Momentum */}
        {currentSection === 5 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">Your momentum</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">
              Consistency matters more than intensity. Here is how your week looked.
            </p>

            <div className="flex gap-10 pt-2">
              <div>
                <p className="text-[32px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{getDayNumber()}</p>
                <p className="text-[12px] tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Day</p>
              </div>
              <div>
                <p className="text-[32px] font-medium text-[var(--svaas-brown-dark)] font-[family-name:var(--font-serif)]">{data.dreamProtection.thisWeek}<span className="text-[var(--svaas-brown-light)] font-normal">/{data.dreamProtection.target}</span></p>
                <p className="text-[12px] tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Days active</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-4">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Attention distribution</p>
              {data.attention.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-[14px] text-[var(--svaas-brown)] w-32 truncate">{a.stream}</span>
                  <div className="flex-1 h-0.5 bg-[var(--svaas-sand)]/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.actions > 0 ? 'bg-[var(--svaas-olive)]' : 'bg-transparent'}`}
                      style={{ width: `${Math.min((a.actions / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[13px] text-[var(--svaas-brown-light)] w-4 text-right">{a.actions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: Venture Journal */}
        {currentSection === 6 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">Venture journal</h2>
            <p className="text-[16px] text-[var(--svaas-brown)] leading-relaxed">Your venture memory. Notes from the week.</p>
            <VentureJournal thisWeekOnly={true} maxEntries={30} showNoteInput={true} compact={false} />
          </div>
        )}

        {/* SECTION: Close Week */}
        {currentSection === 7 && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-[family-name:var(--font-serif)] text-[var(--svaas-brown-dark)]">Close this week</h2>

            <div className="space-y-5">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-3">Your one commitment for next week</p>
                <p className="text-[14px] text-[var(--svaas-brown-light)] mb-4">One thing. The most important thing. Not three things. One.</p>
                <input
                  value={nextWeekCommitment}
                  onChange={e => setNextWeekCommitment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && nextWeekCommitment.trim()) { setWeeklyCommitment(nextWeekCommitment.trim()); } }}
                  placeholder="e.g., Get LLP registration filed"
                  className="w-full px-4 py-3 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[16px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
                />
                {nextWeekCommitment.trim() && !state.weeklyCommitment?.text && (
                  <button
                    onClick={() => setWeeklyCommitment(nextWeekCommitment.trim())}
                    className="mt-4 px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[14px] rounded-lg font-medium"
                  >
                    Commit
                  </button>
                )}
                {state.weeklyCommitment && state.weeklyCommitment.weekNumber === data.weekNumber && (
                  <p className="text-[14px] text-[var(--svaas-olive)] mt-4">&#10003; Set: &ldquo;{state.weeklyCommitment.text}&rdquo;</p>
                )}
              </div>

              <hr className="border-[var(--svaas-sand)]/30" />

              {weekClosed ? (
                <div className="text-center py-6">
                  <p className="text-[18px] text-[var(--svaas-olive)] font-medium font-[family-name:var(--font-serif)]">&#10003; Week {data.weekNumber} closed.</p>
                  <p className="text-[14px] text-[var(--svaas-brown-light)] mt-2">Review saved to venture memory.</p>
                </div>
              ) : (
                <>
                  <p className="text-[16px] text-[var(--svaas-brown)]">
                    Week {data.weekNumber} reviewed. {data.completedThisWeek.length} actions completed.
                  </p>
                  <button
                    onClick={() => { closeWeek(); setWeekClosed(true); }}
                    className="w-full mt-3 px-5 py-3 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[16px] rounded-lg font-medium"
                  >
                    Close Week {data.weekNumber}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue Reading navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-[var(--svaas-sand)]/30">
        <button
          onClick={goPrev}
          disabled={currentSection === 0}
          className="px-5 py-2.5 border border-[var(--svaas-sand)]/40 text-[var(--svaas-brown)] text-[14px] rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <p className="text-[13px] text-[var(--svaas-brown-light)]">{currentSection + 1} of {SECTIONS.length}</p>
        <button
          onClick={goNext}
          disabled={currentSection === SECTIONS.length - 1}
          className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[14px] rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue reading
        </button>
      </div>

      <AppNav />
    </div>
  );
}
