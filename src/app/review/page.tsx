'use client';

import { useState } from 'react';
import Link from 'next/link';

// Simulated data (in production, fetched from services)
const REVIEW_DATA = {
  weekNumber: 7,
  dayRange: 'Day 43-49',
  phase: 'P1',
  completedThisWeek: [
    'Purchased domain name',
    'Searched trademark — brand name',
    'Searched trademark — SVAASKRITI',
  ],
  stuckItems: [
    { title: 'QP Confirmation', reason: 'Haven\'t called yet', daysOverdue: 40, stream: 'Product & Pilot' },
    { title: 'Business Structure decision', reason: 'Undecided', daysOverdue: 40, stream: 'Legal & Structure' },
  ],
  vendorWaits: [
    { vendor: 'CA (Chartered Accountant)', item: 'LLP incorporation documents', lastContacted: '2026-05-20', status: 'active' },
  ],
  pendingDecisions: [
    { title: 'Business Structure', default: 'LLP', daysOverdue: 40, impact: 87 },
    { title: 'Launch MRP', default: '₹599', daysRemaining: 9, impact: 54 },
  ],
  suggestedFocus: {
    primary: 'Call cousin about QP role',
    reason: 'Unlocks 14 downstream tasks. 30-minute conversation.',
    secondary: ['Follow up with CA on LLP status', 'Research regulatory consultants in Chennai'],
  },
  momentum: {
    score: 34,
    trend: 'declining' as const,
    lastWeek: 38,
    streakWeeks: 2,
  },
  attention: [
    { stream: 'Product & Pilot', actions: 4 },
    { stream: 'Packaging & Brand', actions: 2 },
    { stream: 'Legal & Structure', actions: 1 },
    { stream: 'Founder OS', actions: 1 },
    { stream: 'Finance', actions: 0 },
    { stream: 'Digital & Website', actions: 0 },
    { stream: 'Social & Community', actions: 0 },
  ],
  patterns: [
    {
      name: 'Stream Preference',
      observation: 'Product & Pilot gets 3x more attention than Legal. This makes sense — Product is more interesting. But Legal is blocking 3 other streams right now.',
      suggestion: 'Consider: 15 minutes on Legal this week.',
    },
  ],
  dreamProtection: { thisWeek: 3, target: 5 },
};

const STEPS = [
  { id: 1, title: 'What Got Done', time: '2 min' },
  { id: 2, title: 'What\'s Stuck', time: '3 min' },
  { id: 3, title: 'Vendor Check', time: '2 min' },
  { id: 4, title: 'Decisions', time: '3 min' },
  { id: 5, title: 'Next Week Focus', time: '3 min' },
  { id: 6, title: 'Momentum', time: '2 min' },
  { id: 7, title: 'Patterns', time: '1 min' },
];

export default function WeeklyReviewPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const data = REVIEW_DATA;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
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
            <h2 className="text-lg font-semibold text-zinc-100">What Got Done This Week?</h2>
            <div className="space-y-2">
              {data.completedThisWeek.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-zinc-200">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-500 pt-2 border-t border-zinc-800">
              That&apos;s {data.completedThisWeek.length} actions. {data.completedThisWeek.length >= 3 ? 'Good progress.' : 'Let\'s aim higher next week.'}
            </p>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">What&apos;s Stuck?</h2>
            <p className="text-sm text-zinc-500">These items need attention:</p>
            <div className="space-y-4">
              {data.stuckItems.map((item, i) => (
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
              {data.vendorWaits.map((w, i) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-zinc-200">{w.vendor}</p>
                      <p className="text-sm text-zinc-400">{w.item}</p>
                      <p className="text-xs text-zinc-600 mt-1">Last contacted: {w.lastContacted}</p>
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
              {data.pendingDecisions.map((d, i) => (
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
              {data.suggestedFocus.secondary.map((item, i) => (
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border border-zinc-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-zinc-100">{data.momentum.score}</div>
                <div className="text-xs text-zinc-600">Momentum</div>
              </div>
              <div className="border border-zinc-800 rounded-lg p-3">
                <div className={`text-2xl font-bold ${data.momentum.trend === 'declining' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {data.momentum.trend === 'declining' ? '↓' : data.momentum.trend === 'improving' ? '↑' : '→'}
                </div>
                <div className="text-xs text-zinc-600">Trend</div>
              </div>
              <div className="border border-zinc-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-zinc-100">{data.dreamProtection.thisWeek}/{data.dreamProtection.target}</div>
                <div className="text-xs text-zinc-600">Days active</div>
              </div>
            </div>

            {/* Attention Distribution */}
            <div className="space-y-2">
              <h3 className="text-sm text-zinc-400">Where attention went this week:</h3>
              {data.attention.map((a, i) => (
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

            {data.momentum.score < 40 && (
              <p className="text-xs text-red-400/80 border-t border-zinc-800 pt-3">
                Venture momentum is declining. The recovery playbook is available on the Radar.
              </p>
            )}
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Patterns & Insights</h2>

            {data.patterns.length > 0 ? (
              <div className="space-y-4">
                {data.patterns.map((p, i) => (
                  <div key={i} className="border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">📊 {p.name}</h4>
                    <p className="text-sm text-zinc-400">{p.observation}</p>
                    <p className="text-sm text-emerald-400/80 mt-2 italic">{p.suggestion}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400">
                        Helpful
                      </button>
                      <button className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-600">
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Patterns will appear after 4+ weeks of activity data.</p>
            )}

            {/* Close Week */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-sm text-zinc-400">
                Week {data.weekNumber} reviewed. {data.completedThisWeek.length} actions completed. Momentum: {data.momentum.score}/100.
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
          onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
          disabled={currentStep === 7}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-md transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
