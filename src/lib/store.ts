/**
 * SVAAS Venture OS — Local Persistence Store
 * 
 * This is the data layer that sits between the UI and the database.
 * Currently uses in-memory state with JSON file persistence.
 * Designed to be swapped for Supabase with minimal changes.
 * 
 * All mutations go through this store.
 * All reads come from the venture-engine service (which reads from this store).
 */

import { TASKS, WAITING_ON } from '@/lib/data/tasks';
import { VENTURE_STREAMS, STREAM_DEPENDENCIES } from '@/lib/data/streams';
import { DECISIONS } from '@/lib/data/decisions';
import { MILESTONES } from '@/lib/data/milestones';
import type { Task, Decision, Milestone, WaitingOn, StreamDependency } from '@/types';

// ============================================================
// IN-MEMORY STATE (mutable copies of seed data)
// In production: replaced by Supabase queries
// ============================================================

// Deep clone seed data so mutations don't affect imports
let tasksState: Task[] = JSON.parse(JSON.stringify(TASKS));
let decisionsState: Decision[] = JSON.parse(JSON.stringify(DECISIONS));
let streamsState: typeof VENTURE_STREAMS = JSON.parse(JSON.stringify(VENTURE_STREAMS));
let milestonesState: Milestone[] = JSON.parse(JSON.stringify(MILESTONES));
let waitingOnState: WaitingOn[] = JSON.parse(JSON.stringify(WAITING_ON));
let streamDepsState: StreamDependency[] = JSON.parse(JSON.stringify(STREAM_DEPENDENCIES));

// Activity log (founder attention layer)
interface ActivityEntry {
  id: string;
  streamId: string | null;
  activityType: string;
  relatedEntityId: string | null;
  createdAt: string;
}
let activityLog: ActivityEntry[] = [];

// Daily engagement
interface DailyEntry {
  date: string;
  hadActivity: boolean;
  actionCount: number;
  streamsTouched: string[];
}
let dailyEngagement: DailyEntry[] = [];

// Weekly review history
interface ReviewEntry {
  weekNumber: number;
  completedAt: string;
  tasksCompletedCount: number;
  momentumScoreAtClose: number;
}
let reviewHistory: ReviewEntry[] = [];

// ============================================================
// GETTERS
// ============================================================

export function getTasks(): Task[] { return tasksState; }
export function getDecisionsData(): Decision[] { return decisionsState; }
export function getStreamsData(): typeof VENTURE_STREAMS { return streamsState; }
export function getMilestonesData(): Milestone[] { return milestonesState; }
export function getWaitingOnData(): WaitingOn[] { return waitingOnState; }
export function getStreamDepsData(): StreamDependency[] { return streamDepsState; }
export function getActivityLog(): ActivityEntry[] { return activityLog; }
export function getDailyEngagementData(): DailyEntry[] { return dailyEngagement; }
export function getReviewHistory(): ReviewEntry[] { return reviewHistory; }

// ============================================================
// TASK MUTATIONS
// ============================================================

export function updateTaskStatus(taskId: string, status: Task['status'], blockedReason?: string): Task | null {
  const task = tasksState.find(t => t.id === taskId);
  if (!task) return null;

  const previousStatus = task.status;
  task.status = status;
  task.blockedReason = blockedReason || null;

  if (status === 'done') {
    task.completedAt = new Date().toISOString();
  }

  // Log activity
  if (previousStatus !== status) {
    logActivity(task.streamId, 'task_status_changed', taskId);

    // Update stream last_movement_at
    const stream = streamsState.find(s => s.id === task.streamId);
    if (stream) {
      stream.lastMovementAt = new Date().toISOString();
    }

    // Track daily engagement
    trackDailyEngagement(task.streamSlug || '');
  }

  return task;
}

export function markTaskDone(taskId: string): Task | null {
  const result = updateTaskStatus(taskId, 'done');
  if (result) {
    logActivity(result.streamId, 'task_completed', taskId);
  }
  return result;
}

export function blockTask(taskId: string, reason: string): Task | null {
  return updateTaskStatus(taskId, 'blocked', reason);
}

export function startTask(taskId: string): Task | null {
  return updateTaskStatus(taskId, 'in_progress');
}

export function deferTask(taskId: string): Task | null {
  return updateTaskStatus(taskId, 'deferred');
}

// ============================================================
// DECISION MUTATIONS
// ============================================================

export function makeDecision(decisionId: string, chosenOption: string, rationale?: string): Decision | null {
  const decision = decisionsState.find(d => d.id === decisionId);
  if (!decision) return null;

  decision.status = 'decided';
  decision.decisionMade = chosenOption;
  decision.rationale = rationale || null;
  decision.decidedAt = new Date().toISOString();

  logActivity(null, 'decision_made', decisionId);
  trackDailyEngagement('decisions');

  return decision;
}

export function acceptDefault(decisionId: string): Decision | null {
  const decision = decisionsState.find(d => d.id === decisionId);
  if (!decision || !decision.defaultOption) return null;

  decision.status = 'decided';
  decision.decisionMade = decision.defaultOption;
  decision.rationale = 'Accepted default: ' + (decision.defaultRationale || '');
  decision.decidedAt = new Date().toISOString();

  logActivity(null, 'decision_made', decisionId);
  trackDailyEngagement('decisions');

  return decision;
}

export function deferDecision(decisionId: string): Decision | null {
  const decision = decisionsState.find(d => d.id === decisionId);
  if (!decision) return null;

  if (decision.deferCount >= decision.maxDeferrals) return null;

  decision.deferCount += 1;

  // Push deadline by 7 days
  if (decision.deadline) {
    const newDeadline = new Date(decision.deadline);
    newDeadline.setDate(newDeadline.getDate() + 7);
    decision.deadline = newDeadline.toISOString().split('T')[0];
  }

  logActivity(null, 'decision_deferred', decisionId);

  return decision;
}

// ============================================================
// WAITING-ON MUTATIONS
// ============================================================

export function markWaitingOnReceived(waitingOnId: string): WaitingOn | null {
  const item = waitingOnState.find(w => w.id === waitingOnId);
  if (!item) return null;

  item.status = 'received';
  logActivity(null, 'waiting_on_updated', waitingOnId);
  trackDailyEngagement(item.streamSlug || '');

  return item;
}

export function updateWaitingOnContacted(waitingOnId: string): WaitingOn | null {
  const item = waitingOnState.find(w => w.id === waitingOnId);
  if (!item) return null;

  item.lastContacted = new Date().toISOString().split('T')[0];
  logActivity(null, 'waiting_on_updated', waitingOnId);

  return item;
}

export function addWaitingOn(data: Omit<WaitingOn, 'id'>): WaitingOn {
  const newItem: WaitingOn = {
    ...data,
    id: 'wo-' + Date.now(),
  };
  waitingOnState.push(newItem);
  return newItem;
}

// ============================================================
// WEEKLY REVIEW
// ============================================================

export function completeWeeklyReview(weekNumber: number, momentumScore: number): ReviewEntry {
  const entry: ReviewEntry = {
    weekNumber,
    completedAt: new Date().toISOString(),
    tasksCompletedCount: tasksState.filter(t => t.status === 'done').length,
    momentumScoreAtClose: momentumScore,
  };
  reviewHistory.push(entry);

  logActivity(null, 'review_completed', null);
  trackDailyEngagement('founder');

  return entry;
}

// ============================================================
// MILESTONE MUTATIONS
// ============================================================

export function updateMilestoneGate(milestoneId: string, gateIndex: number, met: boolean): Milestone | null {
  const milestone = milestonesState.find(m => m.id === milestoneId);
  if (!milestone || !milestone.gateCriteria[gateIndex]) return null;

  milestone.gateCriteria[gateIndex].met = met;

  // Check if all gates are met
  if (milestone.gateCriteria.every(g => g.met)) {
    milestone.status = 'achieved';
    milestone.achievedAt = new Date().toISOString();
  }

  return milestone;
}

// ============================================================
// ACTIVITY LOGGING (passive)
// ============================================================

function logActivity(streamId: string | null, activityType: string, relatedEntityId: string | null): void {
  activityLog.push({
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    streamId,
    activityType,
    relatedEntityId,
    createdAt: new Date().toISOString(),
  });
}

function trackDailyEngagement(streamSlug: string): void {
  const today = new Date().toISOString().split('T')[0];
  let entry = dailyEngagement.find(e => e.date === today);

  if (!entry) {
    entry = { date: today, hadActivity: true, actionCount: 0, streamsTouched: [] };
    dailyEngagement.push(entry);
  }

  entry.hadActivity = true;
  entry.actionCount += 1;
  if (streamSlug && !entry.streamsTouched.includes(streamSlug)) {
    entry.streamsTouched.push(streamSlug);
  }
}

// ============================================================
// DATA IMPORT (CSV/JSON support)
// ============================================================

export function importTasks(tasks: Task[]): number {
  tasksState = tasks;
  return tasks.length;
}

export function importDecisions(decisions: Decision[]): number {
  decisionsState = decisions;
  return decisions.length;
}

export function importMilestones(milestones: Milestone[]): number {
  milestonesState = milestones;
  return milestones.length;
}

export function importStreams(streams: typeof VENTURE_STREAMS): number {
  streamsState = streams;
  return streams.length;
}

export function importStreamDependencies(deps: StreamDependency[]): number {
  streamDepsState = deps;
  return deps.length;
}

export function importWaitingOn(items: WaitingOn[]): number {
  waitingOnState = items;
  return items.length;
}

// ============================================================
// RESET (for testing)
// ============================================================

export function resetToSeedData(): void {
  tasksState = JSON.parse(JSON.stringify(TASKS));
  decisionsState = JSON.parse(JSON.stringify(DECISIONS));
  streamsState = JSON.parse(JSON.stringify(VENTURE_STREAMS));
  milestonesState = JSON.parse(JSON.stringify(MILESTONES));
  waitingOnState = JSON.parse(JSON.stringify(WAITING_ON));
  streamDepsState = JSON.parse(JSON.stringify(STREAM_DEPENDENCIES));
  activityLog = [];
  dailyEngagement = [];
  reviewHistory = [];
}
