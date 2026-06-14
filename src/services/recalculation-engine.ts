/**
 * SVAAS Recalculation Engine
 * 
 * Runs after every mutation to keep derived state consistent.
 * In production: triggered by Supabase database triggers or edge functions.
 * Currently: runs synchronously after store mutations.
 */

import {
  getTasks,
  getStreamsData,
  getDecisionsData,
  getMilestonesData,
  getDailyEngagementData,
} from '@/lib/store';
import { getDayNumber } from '@/lib/venture-config';
import type { Task, NeglectLevel } from '@/types';

// ============================================================
// STREAM HEALTH RECALCULATION
// ============================================================

export type StreamHealthResult = {
  slug: string;
  status: 'green' | 'yellow' | 'red' | 'grey';
  momentumScore: number;
  currentBottleneck: string | null;
  neglectLevel: NeglectLevel;
};

export function recalculateStreamHealth(streamSlug: string): StreamHealthResult {
  const streams = getStreamsData();
  const tasks = getTasks();
  const stream = streams.find(s => s.slug === streamSlug);

  if (!stream) {
    return { slug: streamSlug, status: 'grey', momentumScore: 0, currentBottleneck: null, neglectLevel: 'attended' };
  }

  const streamTasks = tasks.filter(t => t.streamSlug === streamSlug);
  const doneTasks = streamTasks.filter(t => t.status === 'done');
  const blockedTasks = streamTasks.filter(t => t.status === 'blocked');
  const actionableTasks = streamTasks.filter(t => t.status === 'not_started' && !t.blockedReason);

  // Calculate days since movement
  const daysSinceMovement = stream.lastMovementAt
    ? Math.floor((Date.now() - new Date(stream.lastMovementAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Determine status
  let status: 'green' | 'yellow' | 'red' | 'grey' = 'grey';

  if (stream.status === 'grey') {
    status = 'grey';
  } else if (daysSinceMovement <= 7 && blockedTasks.length === 0) {
    status = 'green';
  } else if (daysSinceMovement <= 14 || (blockedTasks.length > 0 && !isFounderControlled(blockedTasks))) {
    status = 'yellow';
  } else if (daysSinceMovement > 14 && isFounderControlled(blockedTasks)) {
    status = 'red';
  } else if (daysSinceMovement > 14) {
    status = 'red';
  } else {
    status = 'yellow';
  }

  // Calculate momentum score
  const momentumScore = calculateStreamMomentum(stream, streamTasks, daysSinceMovement);

  // Determine bottleneck
  const currentBottleneck = determineBottleneck(streamTasks);

  // Determine neglect level
  const hasActionable = actionableTasks.length > 0;
  let neglectLevel: NeglectLevel = 'attended';
  if (hasActionable) {
    if (daysSinceMovement >= 21) neglectLevel = 'neglected';
    else if (daysSinceMovement >= 14) neglectLevel = 'drifting';
    else if (daysSinceMovement >= 7) neglectLevel = 'cooling';
  }

  return { slug: streamSlug, status, momentumScore, currentBottleneck, neglectLevel };
}

export function recalculateAllStreams(): StreamHealthResult[] {
  const streams = getStreamsData();
  return streams.map(s => recalculateStreamHealth(s.slug));
}

function isFounderControlled(blockedTasks: Task[]): boolean {
  return blockedTasks.some(t => t.owner === 'Founder' || t.owner.includes('Founder'));
}

function calculateStreamMomentum(
  stream: { lastMovementAt: string | null; momentumScore: number },
  tasks: Task[],
  daysSinceMovement: number
): number {
  // Recency score (0-100)
  let recencyScore = 0;
  if (daysSinceMovement === 0) recencyScore = 100;
  else if (daysSinceMovement <= 3) recencyScore = 85;
  else if (daysSinceMovement <= 7) recencyScore = 70;
  else if (daysSinceMovement <= 14) recencyScore = 45;
  else if (daysSinceMovement <= 21) recencyScore = 25;
  else if (daysSinceMovement <= 30) recencyScore = 10;
  else recencyScore = 0; // DORMANT

  // Velocity bonus: completions in last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentCompletions = tasks.filter(
    t => t.completedAt && new Date(t.completedAt) > fourteenDaysAgo
  ).length;
  const velocityBonus = Math.min(recentCompletions * 5, 20);

  // Penalty for founder-controllable blockers
  const blockedByFounder = tasks.filter(
    t => t.status === 'blocked' && (t.owner === 'Founder' || t.owner.includes('Founder'))
  ).length;
  const penalty = blockedByFounder > 0 ? -15 : 0;

  return Math.max(0, Math.min(100, recencyScore + velocityBonus + penalty));
}

function determineBottleneck(tasks: Task[]): string | null {
  // Find highest priority blocked or overdue critical task
  const blocked = tasks.filter(t => t.status === 'blocked');
  if (blocked.length > 0) {
    const critical = blocked.find(t => t.priority === 'CRITICAL');
    if (critical) return `${critical.title} (${critical.blockedReason || 'blocked'})`;
    return `${blocked[0].title} (${blocked[0].blockedReason || 'blocked'})`;
  }

  // Check for overdue critical tasks
  const dayNumber = getDayNumber();
  const overdue = tasks.filter(
    t => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd
  );
  if (overdue.length > 0) {
    return `${overdue[0].title} (overdue by ${dayNumber - (overdue[0].dayRangeEnd || 0)} days)`;
  }

  return null;
}

// ============================================================
// DECISION IMPACT RECALCULATION
// ============================================================

export function recalculateDecisionImpact(decisionId: string) {
  const decisions = getDecisionsData();
  const tasks = getTasks();
  const streams = getStreamsData();
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return;

  // Count tasks affected (direct blocks)
  const directlyBlocked = decision.blocksTasks?.length || 0;

  // Count streams affected
  const affectedStreamIds = new Set<string>();
  if (decision.blocksTasks) {
    for (const taskId of decision.blocksTasks) {
      const task = tasks.find(t => t.id === taskId);
      if (task) affectedStreamIds.add(task.streamSlug || '');
    }
  }

  // Calculate delay
  const today = new Date();
  const deadline = decision.deadline ? new Date(decision.deadline) : null;
  const daysOverdue = deadline ? Math.max(0, Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Update impact score
  let score = 0;
  score += Math.min(affectedStreamIds.size * 10, 30); // streams (0-30)
  score += directlyBlocked >= 25 ? 30 : directlyBlocked >= 15 ? 25 : directlyBlocked >= 8 ? 18 : directlyBlocked >= 3 ? 10 : 5; // tasks (0-30)
  score += daysOverdue >= 30 ? 25 : daysOverdue >= 14 ? 20 : daysOverdue >= 7 ? 15 : daysOverdue >= 1 ? 10 : 0; // delay (0-25)
  score += 0; // cascade depth placeholder

  decision.impactScore = Math.min(100, score);
  decision.streamsAffected = affectedStreamIds.size;
  decision.tasksAffected = directlyBlocked;
  decision.estimatedDelayDays = daysOverdue;
}

export function recalculateAllDecisionImpacts() {
  const decisions = getDecisionsData();
  decisions.forEach(d => recalculateDecisionImpact(d.id));
}

// ============================================================
// VENTURE MOMENTUM RECALCULATION
// ============================================================

export function recalculateVentureMomentum(): number {
  const results = recalculateAllStreams();
  const weights: Record<string, number> = {
    legal: 1.5,
    product: 1.5,
    packaging: 1.2,
    digital: 1.0,
    social: 0.8,
    founder: 0.8,
    finance: 1.0,
  };

  const activeResults = results.filter(r => r.status !== 'grey');
  let weightedSum = 0;
  let totalWeight = 0;

  for (const r of activeResults) {
    const w = weights[r.slug] || 1.0;
    weightedSum += r.momentumScore * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ============================================================
// DREAM PROTECTION RECALCULATION
// ============================================================

export function recalculateDreamProtection(): { thisWeek: number; target: number; trend: 'improving' | 'stable' | 'declining' } {
  const engagement = getDailyEngagementData();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

  const thisWeekEntries = engagement.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= weekStart && entryDate <= today && e.hadActivity;
  });

  const thisWeek = thisWeekEntries.length;
  const target = 5; // Default target, editable in settings

  // Simple trend (compare to last 4 weeks)
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(today.getDate() - 28);
  const lastFourWeeksEntries = engagement.filter(e => {
    const d = new Date(e.date);
    return d >= fourWeeksAgo && d < weekStart && e.hadActivity;
  });
  const avgLastFourWeeks = lastFourWeeksEntries.length / 4;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (thisWeek > avgLastFourWeeks + 1) trend = 'improving';
  else if (thisWeek < avgLastFourWeeks - 1) trend = 'declining';

  return { thisWeek, target, trend };
}

// ============================================================
// FULL RECALCULATION (called after any mutation)
// ============================================================

export function runFullRecalculation() {
  recalculateAllStreams();
  recalculateAllDecisionImpacts();
  recalculateVentureMomentum();
  recalculateDreamProtection();
}
