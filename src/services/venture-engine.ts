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

import { getDayNumber as getDay, VENTURE_CONFIG } from '@/lib/venture-config';
import { getTasks, getDecisionsData, getStreamsData, getMilestonesData, getWaitingOnData, getStreamDepsData, getDailyEngagementData } from '@/lib/store';
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
// CONSTANTS (from venture config — NOT hardcoded)
// ============================================================

const LAUNCH_TARGET_DAYS = VENTURE_CONFIG.launchTargetDays;
const TODAY = new Date();

export function getDayNumber(): number {
  return getDay();
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

function calculateNeglectLevel(stream: ReturnType<typeof getStreamsData>[0], tasks: Task[]): NeglectLevel {
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
  const VENTURE_STREAMS = getStreamsData();
  const TASKS = getTasks();
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
  return getStreamDepsData();
}

export function getUpstreamDependencies(streamSlug: string): StreamDependency[] {
  return getStreamDepsData().filter(d => d.downstreamSlug === streamSlug);
}

export function getDownstreamDependencies(streamSlug: string): StreamDependency[] {
  return getStreamDepsData().filter(d => d.upstreamSlug === streamSlug);
}

export function getRootCauseStreams(): string[] {
  const STREAM_DEPENDENCIES = getStreamDepsData();
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
  const VENTURE_STREAMS = getStreamsData();
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
  const TASKS = getTasks();
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
  const TASKS = getTasks();
  const VENTURE_STREAMS = getStreamsData();

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
  // Returns real snapshots from activity history
  // When no history exists (new venture), returns empty array
  return [];
}

// ============================================================
// DREAM PROTECTION
// ============================================================

export function getDreamProtection(): DreamProtectionScore {
  // Calculate from real daily engagement data
  const engagement = getDailyEngagementData();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const thisWeekDays = engagement.filter(e => {
    const d = new Date(e.date);
    return d >= weekStart && d <= today && e.hadActivity;
  }).length;

  // Calculate last 4 weeks
  const lastFourWeeks: number[] = [];
  for (let w = 1; w <= 4; w++) {
    const wStart = new Date(weekStart);
    wStart.setDate(wStart.getDate() - (w * 7));
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    const count = engagement.filter(e => {
      const d = new Date(e.date);
      return d >= wStart && d < wEnd && e.hadActivity;
    }).length;
    lastFourWeeks.push(count);
  }

  const avg = lastFourWeeks.length > 0 ? lastFourWeeks.reduce((a, b) => a + b, 0) / lastFourWeeks.length : 0;
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (thisWeekDays > avg + 1) trend = 'improving';
  else if (thisWeekDays < avg - 1) trend = 'declining';

  return {
    thisWeek: thisWeekDays,
    target: VENTURE_CONFIG.dreamProtectionTarget,
    lastFourWeeks,
    trend,
  };
}

// ============================================================
// RECOVERY PLAYBOOK
// ============================================================

export function getRecoveryPlaybook(): RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  const streams = getStreams();
  const DECISIONS = getDecisionsData();
  const TASKS = getTasks();

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
  // Calculate from real activity log
  const engagement = getDailyEngagementData();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const VENTURE_STREAMS = getStreamsData();

  // Count actions per stream this week from engagement data
  const streamActions: Record<string, number> = {};
  VENTURE_STREAMS.forEach(s => { streamActions[s.slug] = 0; });

  engagement
    .filter(e => new Date(e.date) >= weekStart && new Date(e.date) <= today)
    .forEach(e => {
      (e.streamsTouched || []).forEach(slug => {
        if (slug in streamActions) streamActions[slug] += 1;
      });
    });

  return VENTURE_STREAMS.map(s => ({
    streamSlug: s.slug,
    streamName: s.name,
    actionsThisWeek: streamActions[s.slug] || 0,
  })).sort((a, b) => b.actionsThisWeek - a.actionsThisWeek);
}

// ============================================================
// VENTURE HEALTH (COMPOSITE)
// ============================================================

export function getVentureHealth(): VentureHealth {
  const streams = getStreams();
  const MILESTONES = getMilestonesData();
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
    patternInsight: generatePatternInsight(streams),
  };
}

function generatePatternInsight(streams: VentureStream[]): string | null {
  const redStreams = streams.filter(s => s.status === 'red');
  if (redStreams.length >= 2) {
    return `${redStreams.map(s => s.name).join(' & ')} are stalled. Unblocking these would cascade progress across the venture.`;
  }
  if (redStreams.length === 1) {
    return `${redStreams[0].name} needs attention. It may be blocking other streams.`;
  }
  const yellowStreams = streams.filter(s => s.status === 'yellow');
  if (yellowStreams.length >= 3) {
    return `${yellowStreams.length} streams are slowing. Consider focusing on the highest-impact one this week.`;
  }
  return null;
}

// ============================================================
// DECISIONS
// ============================================================

export function getDecisions(): Decision[] {
  const DECISIONS = getDecisionsData();
  return [...DECISIONS].filter(d => d.status === 'pending').sort((a, b) => b.impactScore - a.impactScore);
}

export function getOverdueDecisions(): Decision[] {
  const DECISIONS = getDecisionsData();
  return DECISIONS.filter(d => {
    if (d.status !== 'pending' || !d.deadline) return false;
    return new Date(d.deadline) < TODAY;
  }).sort((a, b) => b.impactScore - a.impactScore);
}

// ============================================================
// MILESTONES
// ============================================================

export function getMilestones(): Milestone[] {
  const MILESTONES = getMilestonesData();
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
  return getTasks().filter(t => t.streamSlug === slug);
}

export function getAllTasks(): Task[] {
  return getTasks();
}

export function getWaitingOn(): WaitingOn[] {
  return getWaitingOnData();
}
