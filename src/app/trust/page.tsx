'use client';

import { useAppState } from '@/lib/state-provider';
import { VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';

type Confidence = 'verified' | 'calculated' | 'assumed' | 'unknown';

interface MetricEntry {
  name: string;
  screen: string;
  currentValue: string;
  source: string;
  formula: string;
  confidence: Confidence;
}

const CONFIDENCE_STYLES: Record<Confidence, { bg: string; text: string; label: string }> = {
  verified: { bg: 'bg-emerald-950/30', text: 'text-emerald-400', label: 'VERIFIED' },
  calculated: { bg: 'bg-blue-950/30', text: 'text-blue-400', label: 'CALCULATED' },
  assumed: { bg: 'bg-amber-950/30', text: 'text-amber-400', label: 'ASSUMED' },
  unknown: { bg: 'bg-zinc-900', text: 'text-zinc-500', label: 'UNKNOWN' },
};

export default function TrustReportPage() {
  const { state } = useAppState();

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter(t => t.status === 'done').length;
  const blockedTasks = state.tasks.filter(t => t.status === 'blocked').length;
  const pendingDecisions = state.decisions.filter(d => d.status === 'pending').length;

  const metrics: MetricEntry[] = [
    // Timeline
    {
      name: 'Venture Start Date',
      screen: 'Radar',
      currentValue: VENTURE_CONFIG.launchStartDate,
      source: 'venture-config.ts',
      formula: 'Static config value',
      confidence: 'assumed',
    },
    {
      name: 'Day Counter',
      screen: 'Radar',
      currentValue: `Day ${Math.floor((Date.now() - new Date(VENTURE_CONFIG.launchStartDate).getTime()) / (1000*60*60*24))}`,
      source: 'Calculated from start date',
      formula: '(today - startDate) / msPerDay',
      confidence: 'calculated',
    },
    {
      name: 'Launch Target (180 days)',
      screen: 'Radar',
      currentValue: `${VENTURE_CONFIG.launchTargetDays} days`,
      source: 'venture-config.ts (from Execution Engine)',
      formula: 'Static config value',
      confidence: 'assumed',
    },
    {
      name: 'Progress %',
      screen: 'Radar',
      currentValue: `${Math.round((Math.floor((Date.now() - new Date(VENTURE_CONFIG.launchStartDate).getTime()) / (1000*60*60*24)) / VENTURE_CONFIG.launchTargetDays) * 100)}%`,
      source: 'Calculated',
      formula: 'dayNumber / targetDays × 100 (time-based, not work-based)',
      confidence: 'calculated',
    },
    // Tasks
    {
      name: 'Total Tasks',
      screen: 'All',
      currentValue: String(totalTasks),
      source: 'Imported from Google Sheets Execution Engine',
      formula: 'Count of all task records',
      confidence: totalTasks > 200 ? 'verified' : 'assumed',
    },
    {
      name: 'Tasks Done',
      screen: 'Radar / Stream',
      currentValue: String(doneTasks),
      source: 'User actions (Mark Done button)',
      formula: 'Count where status = done',
      confidence: doneTasks > 0 ? 'verified' : 'calculated',
    },
    {
      name: 'Tasks Blocked',
      screen: 'Bottlenecks',
      currentValue: String(blockedTasks),
      source: 'User actions (Block button + reason)',
      formula: 'Count where status = blocked',
      confidence: blockedTasks > 0 ? 'verified' : 'calculated',
    },
    // Stream Health
    {
      name: 'Stream Status (Red/Yellow/Green)',
      screen: 'Radar',
      currentValue: `${state.streams.filter(s => s.status === 'red').length} red, ${state.streams.filter(s => s.status === 'yellow').length} yellow`,
      source: 'Seed data (static assignment)',
      formula: 'Should auto-calculate from: daysSinceMovement + blockedTasks + founderControlled',
      confidence: 'assumed',
    },
    {
      name: 'Stream Bottleneck Text',
      screen: 'Radar / Stream',
      currentValue: 'Various strings',
      source: 'Seed data (manually written)',
      formula: 'Should auto-derive from highest-priority blocked/overdue task in stream',
      confidence: 'assumed',
    },
    {
      name: 'Days Since Movement',
      screen: 'Radar',
      currentValue: state.streams.every(s => !s.lastMovementAt) ? 'All null (no activity)' : 'Mixed',
      source: 'lastMovementAt timestamp on stream',
      formula: '(today - lastMovementAt) / msPerDay. Null = no activity recorded.',
      confidence: 'calculated',
    },
    // Momentum
    {
      name: 'Momentum Score',
      screen: 'Radar',
      currentValue: '0 (no activity history)',
      source: 'Calculated from stream movement dates',
      formula: 'weightedAvg(streamMomentumScores). Each stream: recencyScore + velocityBonus - founderBlockPenalty',
      confidence: state.streams.some(s => s.lastMovementAt) ? 'calculated' : 'unknown',
    },
    {
      name: 'Momentum Weights (legal=1.5, product=1.5...)',
      screen: 'Engine',
      currentValue: 'legal:1.5, product:1.5, packaging:1.2, digital:1.0, social:0.8, founder:0.8, finance:1.0',
      source: 'Hardcoded in recalculation-engine.ts',
      formula: 'Arbitrary weights chosen by designer',
      confidence: 'assumed',
    },
    // Dream Protection
    {
      name: 'Dream Protection Score',
      screen: 'Radar',
      currentValue: `${state.dailyEngagement.filter(e => e.hadActivity).length}/5`,
      source: 'Calculated from daily_engagement records',
      formula: 'Count of days this week with hadActivity = true',
      confidence: 'calculated',
    },
    {
      name: 'Dream Protection Target',
      screen: 'Radar',
      currentValue: `${VENTURE_CONFIG.dreamProtectionTarget} days/week`,
      source: 'venture-config.ts',
      formula: 'Static config (should be founder-set)',
      confidence: 'assumed',
    },
    // Decisions
    {
      name: 'Decision Impact Scores',
      screen: 'Decisions',
      currentValue: state.decisions.map(d => `${d.title}: ${d.impactScore}`).join(', '),
      source: 'Seed data (manually assigned by Kiro)',
      formula: 'Should calculate from: blocksTasks.length + streamsAffected + daysOverdue. Currently blocksTasks arrays are EMPTY.',
      confidence: 'unknown',
    },
    {
      name: 'Decision Deadlines',
      screen: 'Decisions',
      currentValue: state.decisions.filter(d => d.deadline).map(d => `${d.title}: ${d.deadline}`).join(', '),
      source: 'Seed data (Kiro suggested dates)',
      formula: 'None — manually assigned suggestions. Founder has not confirmed.',
      confidence: 'assumed',
    },
    {
      name: 'Pending Decisions',
      screen: 'Decisions / Command',
      currentValue: String(pendingDecisions),
      source: 'Count of decisions with status=pending',
      formula: 'Count where status = pending',
      confidence: 'calculated',
    },
    // Dependencies
    {
      name: 'Stream Dependencies (9 edges)',
      screen: 'Dependencies',
      currentValue: `${state.streamDeps.length} dependency relationships`,
      source: 'Designed by Kiro from Execution Engine analysis',
      formula: 'Manual mapping based on task dependency text',
      confidence: 'assumed',
    },
    // Leverage
    {
      name: 'Highest Leverage Action',
      screen: 'Command Center',
      currentValue: state.tasks.filter(t => t.status === 'not_started' && t.priority === 'CRITICAL')[0]?.title || 'None',
      source: 'Leverage algorithm',
      formula: '30% criticalPath + 25% downstream + 15% crossStream + 10% momentum + 12% overdue + 8% priority + bonuses. WARNING: downstreamCount not populated for most tasks.',
      confidence: 'calculated',
    },
    // Milestones
    {
      name: 'Milestone Day Targets',
      screen: 'Milestones',
      currentValue: state.milestones.map(m => `${m.title}: Day ${m.dayTarget}`).join(', '),
      source: 'From Execution Engine (Claude)',
      formula: 'Static targets — planning assumptions, not commitments',
      confidence: 'assumed',
    },
    {
      name: 'Milestone Gate Criteria',
      screen: 'Milestones',
      currentValue: `${state.milestones.reduce((sum, m) => sum + m.gateCriteria.filter((g: any) => g.met).length, 0)} of ${state.milestones.reduce((sum, m) => sum + m.gateCriteria.length, 0)} met`,
      source: 'User toggles (verified when founder marks done)',
      formula: 'Boolean per criterion — met by user action',
      confidence: 'verified',
    },
  ];

  const verified = metrics.filter(m => m.confidence === 'verified').length;
  const calculated = metrics.filter(m => m.confidence === 'calculated').length;
  const assumed = metrics.filter(m => m.confidence === 'assumed').length;
  const unknown = metrics.filter(m => m.confidence === 'unknown').length;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Trust Report</h1>
        <p className="text-sm text-zinc-500">Every metric. Its source. Its formula. Its confidence level.</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-emerald-900/50 bg-emerald-950/20 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{verified}</div>
          <div className="text-xs text-zinc-500">Verified</div>
        </div>
        <div className="border border-blue-900/50 bg-blue-950/20 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-400">{calculated}</div>
          <div className="text-xs text-zinc-500">Calculated</div>
        </div>
        <div className="border border-amber-900/50 bg-amber-950/20 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{assumed}</div>
          <div className="text-xs text-zinc-500">Assumed</div>
        </div>
        <div className="border border-zinc-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-zinc-500">{unknown}</div>
          <div className="text-xs text-zinc-500">Unknown</div>
        </div>
      </div>

      {/* All Metrics */}
      <div className="space-y-3">
        {metrics.map((m, i) => {
          const style = CONFIDENCE_STYLES[m.confidence];
          return (
            <div key={i} className={`border border-zinc-800 rounded-lg p-4 ${style.bg}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-zinc-200 text-sm">{m.name}</h3>
                  <p className="text-xs text-zinc-600">Screen: {m.screen}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${style.text} border border-current/30`}>
                  {style.label}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div><span className="text-zinc-500">Value:</span> <span className="text-zinc-300">{m.currentValue}</span></div>
                <div><span className="text-zinc-500">Source:</span> <span className="text-zinc-400">{m.source}</span></div>
                <div><span className="text-zinc-500">Formula:</span> <span className="text-zinc-400 italic">{m.formula}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fabricated Values Removed */}
      <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-400 mb-2">Fabricated Values Removed</h3>
        <ul className="text-xs text-zinc-400 space-y-1">
          <li>• Task leverageScore — removed from seed data (calculated at runtime)</li>
          <li>• Task downstreamCount — removed (requires dependency graph, not yet built)</li>
          <li>• Task isOnCriticalPath — removed (requires dependency graph)</li>
          <li>• Decision deferCount: 2 — should be 0 (no deferrals have occurred)</li>
          <li>• Momentum history snapshots — removed (no real history exists)</li>
          <li>• Attention distribution — removed mock (calculates from real activity)</li>
          <li>• Dream Protection mock values — removed (calculates from real engagement)</li>
        </ul>
      </div>
    </div>
  );
}
