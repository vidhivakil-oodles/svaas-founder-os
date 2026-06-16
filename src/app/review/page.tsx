'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';
import { VentureJournal, WeekJournalSummary } from '@/components/shared/venture-journal';

// Dynamically calculate review data from real state
function calculateReviewData(state: any) {
  const weekNumber = getWeekNumber();
  const dayNumber = getDayNumber();
  const dayStart = (weekNumber - 1) * 7 + 1;
  const dayEnd = weekNumber * 7;

  // Tasks completed (those with completedAt in this venture)
  const completedThisWeek = state.tasks
    .filter((t: any) => t.status === 'done' && t.completedAt)
    .map((t: any) => t.title)
    .slice(0, 5);

  // Stuck items
  const stuckItems = state.tasks
    .filter((t: any) => t.status === 'blocked' || (t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd))
    .slice(0, 5)
    .map((t: any) => ({
      title: t.title,
      reason: t.blockedReason || 'Overdue',
      daysOverdue: t.dayRangeEnd ? Math.max(0, dayNumber - t.dayRangeEnd) : 0,
      stream: state.streams.find((s: any) => s.id === t.streamId)?.name || 'Unknown',
    }));

  // Vendor waits
  const vendorWaits = state.waitingOn.filter((w: any) => w.status === 'active');

  // Pending decisions (sorted by impact)
  const pendingDecisions = state.decisions
    .filter((d: any) => d.status === 'pending')
    .sort((a: any, b: any) => b.impactScore - a.impactScore)
    .slice(0, 3)
    .map((d: any) => ({
      title: d.title,
      default: d.defaultOption,
      daysOverdue: d.deadline && new Date(d.deadline) < new Date() ? Math.floor((Date.now() - new Date(d.deadline).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      daysRemaining: d.deadline && new Date(d.deadline) > new Date() ? Math.floor((new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      impact: d.impactScore,
    }));

  // Suggested focus (highest priority not-started critical task)
  const actionable = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason && t.priority === 'CRITICAL')
    .slice(0, 3);

  // Attention (from engagement)
  const attention = state.streams.map((s: any) => ({
    stream: s.name,
    actions: state.dailyEngagement
      .filter((e: any) => (e.streamsTouched || []).includes(s.slug))
      .length,
  })).sort((a: any, b: any) => b.actions - a.actions);

  // Dream protection
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
  const { state } = useAppState();
  const data = calculateReviewData(state);

  return (
    <div className="space-y-6">
      <header>
        <BackToHome />
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Weekly Review</h1>
        <p className="text-sm text-zinc-500">
          Week {data.weekNumber} &bull; {data.dayRange} &bull; ~15 minutes
        </p>
      </header>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map(step => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step.id < currentStep ? 'bg-emerald-600' :
              step.id === currentStep ? 'bg-amber-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Step {currentStep}/7: {STEPS[currentStep - 1].title}</span>
        <span>{STEPS[currentStep - 1].time}</span>
      </div>

      {/* Step Content */}
      <div className="border border-zinc-800 rounded-lg p-6 min-h-[320px]">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">What Happened This Week?</h2>
            <WeekJournalSummary />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">What&apos;s Stuck?</h2>
            <p className="text-sm text-zinc-500">These items need attention:</p>
            <div className="space-y-4">
              {data.stuckItems.map((item: any, i: number) => (
                <div key={i} className="border border-red-900/30 bg-red-950/10 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-zinc-200">{item.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.stream}</p>
                    </div>
                    <span className="text-xs text-red-400">{item.daysOverdue}d overdue</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-300">
                      Haven&apos;t started yet
                    </button>
                    <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-300">
                      Waiting for response
                    </button>
                    <button className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-xs rounded text-zinc-100">
                      Will do this week
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Vendor & External Check</h2>
            <p className="text-sm text-zinc-500">Who owes you something?</p>
            <div className="space-y-3">
              {data.vendorWaits.map((w: any, i: number) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-zinc-200">{w.personOrVendor}</p>
                      <p className="text-sm text-zinc-400">{w.description}</p>
                      {w.lastContacted && <p className="text-xs text-zinc-600 mt-1">Last contacted: {w.lastContacted}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-xs rounded text-zinc-100">
                      Received
                    </button>
                    <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-300">
                      Still waiting
                    </button>
                    <button className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-xs rounded text-zinc-100">
                      Follow up now
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {data.vendorWaits.length === 0 && (
              <p className="text-zinc-500 text-sm">No active vendor waits this week.</p>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Decisions</h2>
            <p className="text-sm text-zinc-500">{data.pendingDecisions.length} decisions need your attention:</p>
            <div className="space-y-4">
              {data.pendingDecisions.map((d: any, i: number) => (
                <div key={i} className={`border ${d.daysOverdue ? 'border-red-900/40 bg-red-950/10' : 'border-zinc-800'} rounded-lg p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-zinc-200">{d.title}</p>
                    <span className="text-xs text-zinc-600">Impact: {d.impact}</span>
                  </div>
                  {d.daysOverdue && (
                    <p className="text-xs text-red-400 mb-3">{d.daysOverdue} days overdue</p>
                  )}
                  {d.daysRemaining && (
                    <p className="text-xs text-amber-400 mb-3">{d.daysRemaining} days remaining</p>
                  )}
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md font-medium">
                      Accept Default: {d.default}
                    </button>
                    <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md">
                      Decide differently
                    </button>
                    <button className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-sm rounded-md">
                      1 more week
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Next Week&apos;s Focus</h2>
            <p className="text-sm text-zinc-500">Based on critical path, the system suggests:</p>

            <div className="border-2 border-amber-800/50 bg-amber-950/20 rounded-lg p-4">
              <p className="text-xs text-amber-400 font-medium mb-1">#1 ACTION NEXT WEEK</p>
              <p className="text-zinc-100 font-semibold">{data.suggestedFocus.primary}</p>
              <p className="text-sm text-zinc-400 mt-1">{data.suggestedFocus.reason}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-600">Secondary (if time allows):</p>
              {data.suggestedFocus.secondary.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-600">•</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-3">
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md font-medium">
                Accept Focus
              </button>
              <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md">
                Change Focus
              </button>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Momentum & Attention</h2>

            {/* Momentum */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border border-zinc-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-zinc-100">{getDayNumber()}</div>
                <div className="text-xs text-zinc-600">Day</div>
              </div>
              <div className="border border-zinc-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-zinc-100">{data.dreamProtection.thisWeek}/{data.dreamProtection.target}</div>
                <div className="text-xs text-zinc-600">Days active</div>
              </div>
            </div>

            {/* Attention Distribution */}
            <div className="space-y-2">
              <h3 className="text-sm text-zinc-400">Where attention went this week:</h3>
              {data.attention.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-36 truncate">{a.stream}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.actions > 0 ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                      style={{ width: `${Math.min((a.actions / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600 w-4 text-right">{a.actions}</span>
                </div>
              ))}
            </div>

            {data.dreamProtection.thisWeek === 0 && (
              <p className="text-xs text-red-400/80 border-t border-zinc-800 pt-3">
                Venture momentum is declining. The recovery playbook is available on the Radar.
              </p>
            )}
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Venture Journal</h2>
            <p className="text-sm text-zinc-500">Your venture memory. Add notes, see the full timeline.</p>
            <VentureJournal thisWeekOnly={true} maxEntries={30} showNoteInput={true} compact={false} />
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Close Week</h2>

            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Week {data.weekNumber} reviewed. Your venture memory is intact.
              </p>
              <button className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors">
                ✓ Close Week {data.weekNumber}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-md transition-colors"
        >
          ← Previous
        </button>
        <span className="text-xs text-zinc-600">
          {STEPS.map(s => s.time.replace(' min', '')).reduce((sum, t) => sum + parseInt(t), 0)} min total
        </span>
        <button
          onClick={() => setCurrentStep(Math.min(8, currentStep + 1))}
          disabled={currentStep === 8}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-md transition-colors"
        >
          Next →
        </button>
      </div>

      <AppNav />
    </div>
  );
}
