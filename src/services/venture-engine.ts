/**
 * SVAAS Venture Engine
 * Core intelligence layer that computes all derived state:
 * - Stream health & status
 * - Leverage scoring
 * - Momentum index
 * - Bottleneck detection
 * - Decision impact
 * - Neglect detection
 * - Recovery playbook
 */

import { VENTURE_STREAMS, STREAM_DEPENDENCIES } from '@/lib/data/streams';
import { DECISIONS } from '@/lib/data/decisions';
import { MILESTONES } from '@/lib/data/milestones';
import { TASKS, WAITING_ON } from '@/lib/data/tasks';
import type {
  VentureStream,
  StreamDependency,
  Task,
  Decision,
  Milestone,
  WaitingOn,
  VentureHealth,
  MomentumSnapshot,
  RecoveryAction,
  DreamProtectionScore,
  AttentionDistribution,
  NeglectLevel,
} from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

const LAUNCH_START_DATE = new Date('2026-04-18'); // Day 1
const LAUNCH_TARGET_DAYS = 180;
const TODAY = new Date();

export function getDayNumber(): number {
  const diffMs = TODAY.getTime() - LAUNCH_START_DATE.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ============================================================
// STREAM HEALTH ENGINE
// ============================================================

function calculateDaysSinceMovement(lastMovementAt: string | null): number {
  if (!lastMovementAt) return 999;
  const last = new Date(lastMovementAt);
  const diffMs = TODAY.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculateNeglectLevel(stream: typeof VENTURE_STREAMS[0], tasks: Task[]): NeglectLevel {
  const streamTasks = tasks.filter(t => t.streamId === stream.id);
  const hasActionable = streamTasks.some(t => t.status === 'not_started' && !t.blockedReason);
  const daysSince = calculateDaysSinceMovement(stream.lastMovementAt);

  if (!hasActionable) return 'attended';
  if (daysSince >= 21) return 'neglected';
  if (daysSince >= 14) return 'drifting';
  if (daysSince >= 7) return 'cooling';
  return 'attended';
}

export function getStreams(): VentureStream[] {
  return VENTURE_STREAMS.map(s => {
    const streamTasks = TASKS.filter(t => t.streamId === s.id);
    const daysSince = calculateDaysSinceMovement(s.lastMovementAt);

    return {
      ...s,
      taskCount: streamTasks.length,
      tasksDone: streamTasks.filter(t => t.status === 'done').length,
      tasksBlocked: streamTasks.filter(t => t.status === 'blocked').length,
      daysSinceMovement: daysSince,
      neglectLevel: calculateNeglectLevel(s, TASKS),
      hasActionableWork: streamTasks.some(t => t.status === 'not_started' && !t.blockedReason),
    };
  });
}

export function getStreamBySlug(slug: string): VentureStream | undefined {
  return getStreams().find(s => s.slug === slug);
}

export function getStreamDependencies(): StreamDependency[] {
  return STREAM_DEPENDENCIES;
}

export function getUpstreamDependencies(streamSlug: string): StreamDependency[] {
  return STREAM_DEPENDENCIES.filter(d => d.downstreamSlug === streamSlug);
}

export function getDownstreamDependencies(streamSlug: string): StreamDependency[] {
  return STREAM_DEPENDENCIES.filter(d => d.upstreamSlug === streamSlug);
}

export function getRootCauseStreams(): string[] {
  // Streams that block 2+ other streams
  const downstreamCounts: Record<string, number> = {};
  STREAM_DEPENDENCIES.forEach(d => {
    downstreamCounts[d.upstreamSlug] = (downstreamCounts[d.upstreamSlug] || 0) + 1;
  });
  return Object.entries(downstreamCounts)
    .filter(([, count]) => count >= 2)
    .map(([slug]) => slug);
}

// ============================================================
// LEVERAGE CALCULATOR
// ============================================================

export function calculateLeverageScore(task: Task): number {
  let score = 0;
  const stream = VENTURE_STREAMS.find(s => s.id === task.streamId);

  // 1. Critical path (30%)
  if (task.isOnCriticalPath) score += 30;

  // 2. Downstream impact (25%)
  const downstream = task.downstreamCount || 0;
  if (downstream >= 10) score += 25;
  else if (downstream >= 5) score += 18;
  else if (downstream >= 2) score += 10;

  // 3. Cross-stream impact (15%)
  const rootCauseStreams = getRootCauseStreams();
  const streamSlug = task.streamSlug || '';
  if (rootCauseStreams.includes(streamSlug)) {
    const downstreamStreams = getDownstreamDependencies(streamSlug).length;
    if (downstreamStreams >= 3) score += 15;
    else if (downstreamStreams >= 2) score += 12;
    else if (downstreamStreams >= 1) score += 7;
  }

  // 4. Momentum recovery (10%)
  if (stream) {
    if (stream.momentumScore === 0) score += 10;
    else if (stream.momentumScore <= 25) score += 6;
    else if (stream.momentumScore <= 45) score += 3;
  }

  // 5. Overdue severity (12%)
  const dayNumber = getDayNumber();
  const daysOverdue = task.dayRangeEnd ? dayNumber - task.dayRangeEnd : 0;
  if (daysOverdue > 30) score += 12;
  else if (daysOverdue > 14) score += 9;
  else if (daysOverdue > 7) score += 6;
  else if (daysOverdue > 0) score += 3;

  // 6. Priority level (8%)
  if (task.priority === 'CRITICAL') score += 8;
  else if (task.priority === 'HIGH') score += 5;
  else if (task.priority === 'MEDIUM') score += 3;

  // Bonuses
  if (task.owner === 'Founder') score += 5;
  if (rootCauseStreams.includes(streamSlug)) score += 5;

  return score;
}

export function getHighestLeverageAction(): Task | null {
  const actionable = TASKS.filter(
    t => t.status === 'not_started' && !t.blockedReason
  );
  if (actionable.length === 0) return null;

  let best: Task | null = null;
  let bestScore = -1;

  for (const task of actionable) {
    const score = calculateLeverageScore(task);
    if (score > bestScore) {
      bestScore = score;
      best = { ...task, leverageScore: score };
    }
  }

  return best;
}

// ============================================================
// BOTTLENECK ENGINE
// ============================================================

export interface Bottleneck {
  task: Task;
  stream: string;
  streamSlug: string;
  reason: string;
  downstreamImpact: number;
  daysStuck: number;
  type: 'task_blocked' | 'decision_pending' | 'external_wait' | 'aging';
}

export function getBottlenecks(): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // Find blocked tasks with high downstream impact
  const blocked = TASKS.filter(t => t.status === 'blocked' || 
    (t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && getDayNumber() > t.dayRangeEnd));

  for (const task of blocked) {
    const stream = VENTURE_STREAMS.find(s => s.id === task.streamId);
    const dayNumber = getDayNumber();
    const daysStuck = task.dayRangeEnd ? Math.max(0, dayNumber - task.dayRangeEnd) : 0;

    bottlenecks.push({
      task,
      stream: stream?.name || 'Unknown',
      streamSlug: stream?.slug || '',
      reason: task.blockedReason || `Overdue by ${daysStuck} days`,
      downstreamImpact: task.downstreamCount || 0,
      daysStuck,
      type: task.status === 'blocked' ? 'task_blocked' : 'aging',
    });
  }

  // Sort by impact (downstream + days stuck)
  return bottlenecks.sort((a, b) => {
    const scoreA = a.downstreamImpact * 2 + a.daysStuck;
    const scoreB = b.downstreamImpact * 2 + b.daysStuck;
    return scoreB - scoreA;
  });
}

// ============================================================
// MOMENTUM ENGINE
// ============================================================

export function calculateMomentumScore(): number {
  const streams = getStreams().filter(s => s.status !== 'grey');
  const weights: Record<string, number> = {
    legal: 1.5,
    product: 1.5,
    packaging: 1.2,
    digital: 1.0,
    social: 0.8,
    founder: 0.8,
    finance: 1.0,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of streams) {
    const weight = weights[s.slug] || 1.0;
    weightedSum += s.momentumScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

export function getMomentumTrend(): 'improving' | 'stable' | 'declining' | 'critical' {
  const score = calculateMomentumScore();
  if (score >= 70) return 'improving';
  if (score >= 50) return 'stable';
  if (score >= 25) return 'declining';
  return 'critical';
}

export function getMomentumSnapshots(): MomentumSnapshot[] {
  // Simulated historical data
  return [
    { weekNumber: 4, overallScore: 42, streamScores: { legal: 10, product: 10, packaging: 60, digital: 50, founder: 80, finance: 30 }, trend: 'stable', dormantStreams: [] },
    { weekNumber: 5, overallScore: 40, streamScores: { legal: 5, product: 5, packaging: 55, digital: 45, founder: 80, finance: 25 }, trend: 'declining', dormantStreams: ['legal'] },
    { weekNumber: 6, overallScore: 38, streamScores: { legal: 0, product: 0, packaging: 50, digital: 35, founder: 78, finance: 22 }, trend: 'declining', dormantStreams: ['legal', 'product'] },
    { weekNumber: 7, overallScore: 34, streamScores: { legal: 0, product: 0, packaging: 45, digital: 30, founder: 75, finance: 20 }, trend: 'declining', dormantStreams: ['legal', 'product'] },
  ];
}

// ============================================================
// DREAM PROTECTION
// ============================================================

export function getDreamProtection(): DreamProtectionScore {
  // Simulated — in production this comes from daily_engagement table
  return {
    thisWeek: 3,
    target: 5,
    lastFourWeeks: [5, 4, 2, 3],
    trend: 'declining',
  };
}

// ============================================================
// RECOVERY PLAYBOOK
// ============================================================

export function getRecoveryPlaybook(): RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  const streams = getStreams();

  // Find dormant/neglected streams and suggest lowest-effort recovery
  const dormantStreams = streams.filter(s => s.momentumScore === 0 && s.status !== 'grey');

  for (const stream of dormantStreams) {
    // Check for overdue decisions in this stream
    const streamDecisions = DECISIONS.filter(d =>
      d.status === 'pending' && d.streamsAffected > 0
    );

    // Find decisions that affect this stream
    const relevantDecision = streamDecisions.find(d => {
      if (stream.slug === 'legal' && d.title === 'Business Structure') return true;
      if (stream.slug === 'product' && d.title === 'Launch SKU Count') return true;
      return false;
    });

    if (relevantDecision) {
      actions.push({
        stream: stream.name,
        streamSlug: stream.slug,
        action: `Accept default for: ${relevantDecision.title} → ${relevantDecision.defaultOption}`,
        effort: '2 minutes',
        effortMinutes: 2,
        impact: `Unblocks ${relevantDecision.tasksAffected} tasks across ${relevantDecision.streamsAffected} streams`,
        type: 'decision',
        relatedEntityId: relevantDecision.id,
      });
    } else {
      // Find next actionable task
      const nextTask = TASKS.find(t => t.streamId === stream.id && t.status === 'not_started' && !t.blockedReason);
      if (nextTask) {
        actions.push({
          stream: stream.name,
          streamSlug: stream.slug,
          action: nextTask.title,
          effort: '30 minutes',
          effortMinutes: 30,
          impact: `Moves ${stream.name} from dormant to active`,
          type: 'quick_action',
          relatedEntityId: nextTask.id,
        });
      }
    }
  }

  // Add the QP call specifically (highest leverage)
  const qpTask = TASKS.find(t => t.id === 't-10');
  if (qpTask && qpTask.status !== 'done') {
    actions.push({
      stream: 'Product & Pilot',
      streamSlug: 'product',
      action: 'Call cousin about QP role',
      effort: '5 minutes',
      effortMinutes: 5,
      impact: 'Unblocks 14 tasks, entire compliance chain',
      type: 'quick_action',
      relatedEntityId: 't-10',
    });
  }

  return actions.sort((a, b) => a.effortMinutes - b.effortMinutes);
}

// ============================================================
// ATTENTION DISTRIBUTION
// ============================================================

export function getAttentionDistribution(): AttentionDistribution[] {
  // Simulated — in production from founder_activity_log
  return [
    { streamSlug: 'product', streamName: 'Product & Pilot', actionsThisWeek: 4 },
    { streamSlug: 'packaging', streamName: 'Packaging & Brand', actionsThisWeek: 2 },
    { streamSlug: 'legal', streamName: 'Legal & Structure', actionsThisWeek: 1 },
    { streamSlug: 'founder', streamName: 'Founder OS', actionsThisWeek: 1 },
    { streamSlug: 'finance', streamName: 'Finance', actionsThisWeek: 0 },
    { streamSlug: 'digital', streamName: 'Digital & Website', actionsThisWeek: 0 },
    { streamSlug: 'social', streamName: 'Social & Community', actionsThisWeek: 0 },
  ];
}

// ============================================================
// VENTURE HEALTH (COMPOSITE)
// ============================================================

export function getVentureHealth(): VentureHealth {
  const streams = getStreams();
  const currentMilestone = MILESTONES.find(m => m.status === 'at_risk' || m.status === 'current') || MILESTONES[0];

  return {
    dayNumber: getDayNumber(),
    totalDays: LAUNCH_TARGET_DAYS,
    overallProgress: Math.round((getDayNumber() / LAUNCH_TARGET_DAYS) * 100),
    currentPhase: 'P1',
    currentMilestone,
    streamsRed: streams.filter(s => s.status === 'red').length,
    streamsYellow: streams.filter(s => s.status === 'yellow').length,
    streamsGreen: streams.filter(s => s.status === 'green').length,
    streamsGrey: streams.filter(s => s.status === 'grey').length,
    momentumScore: calculateMomentumScore(),
    momentumTrend: getMomentumTrend(),
    dreamProtection: getDreamProtection(),
    patternInsight: 'Legal & Product are both stalled because of the same root cause: no entity decision + no QP call. Two actions would turn both streams from red to yellow.',
  };
}

// ============================================================
// DECISIONS
// ============================================================

export function getDecisions(): Decision[] {
  return [...DECISIONS].sort((a, b) => b.impactScore - a.impactScore);
}

export function getOverdueDecisions(): Decision[] {
  return DECISIONS.filter(d => {
    if (d.status !== 'pending' || !d.deadline) return false;
    return new Date(d.deadline) < TODAY;
  }).sort((a, b) => b.impactScore - a.impactScore);
}

// ============================================================
// MILESTONES
// ============================================================

export function getMilestones(): Milestone[] {
  const dayNumber = getDayNumber();
  return MILESTONES.map(m => ({
    ...m,
    criterionMetCount: m.gateCriteria.filter(g => g.met).length,
    criterionTotalCount: m.gateCriteria.length,
    daysRemaining: Math.max(0, m.dayTarget - dayNumber),
  }));
}

// ============================================================
// TASKS
// ============================================================

export function getTasksForStream(slug: string): Task[] {
  return TASKS.filter(t => t.streamSlug === slug);
}

export function getAllTasks(): Task[] {
  return TASKS;
}

export function getWaitingOn(): WaitingOn[] {
  return WAITING_ON;
}
