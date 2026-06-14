'use server';

import {
  markTaskDone,
  blockTask,
  startTask,
  deferTask,
  makeDecision,
  acceptDefault,
  deferDecision,
  markWaitingOnReceived,
  updateWaitingOnContacted,
  completeWeeklyReview,
  updateMilestoneGate,
} from '@/lib/store';
import { runFullRecalculation } from '@/services/recalculation-engine';
import { revalidatePath } from 'next/cache';

function recalculateAndRevalidate(paths: string[]) {
  runFullRecalculation();
  paths.forEach(p => revalidatePath(p));
  revalidatePath('/'); // Always revalidate radar
}

// ============================================================
// TASK ACTIONS
// ============================================================

export async function actionMarkTaskDone(taskId: string) {
  const result = markTaskDone(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  recalculateAndRevalidate(['/command', '/bottlenecks', `/stream/${result.streamSlug}`, '/milestones']);
  return { success: true, task: result };
}

export async function actionBlockTask(taskId: string, reason: string) {
  const result = blockTask(taskId, reason);
  if (!result) return { success: false, error: 'Task not found' };
  recalculateAndRevalidate(['/command', '/bottlenecks', `/stream/${result.streamSlug}`]);
  return { success: true, task: result };
}

export async function actionStartTask(taskId: string) {
  const result = startTask(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  recalculateAndRevalidate([`/stream/${result.streamSlug}`]);
  return { success: true, task: result };
}

export async function actionDeferTask(taskId: string) {
  const result = deferTask(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  recalculateAndRevalidate([`/stream/${result.streamSlug}`]);
  return { success: true, task: result };
}

// ============================================================
// DECISION ACTIONS
// ============================================================

export async function actionMakeDecision(decisionId: string, chosenOption: string, rationale?: string) {
  const result = makeDecision(decisionId, chosenOption, rationale);
  if (!result) return { success: false, error: 'Decision not found' };
  recalculateAndRevalidate(['/command', '/decisions', '/dependencies']);
  return { success: true, decision: result };
}

export async function actionAcceptDefault(decisionId: string) {
  const result = acceptDefault(decisionId);
  if (!result) return { success: false, error: 'Decision not found or no default' };
  recalculateAndRevalidate(['/command', '/decisions', '/dependencies']);
  return { success: true, decision: result };
}

export async function actionDeferDecision(decisionId: string) {
  const result = deferDecision(decisionId);
  if (!result) return { success: false, error: 'Decision not found or max deferrals reached' };
  recalculateAndRevalidate(['/command', '/decisions']);
  return { success: true, decision: result };
}

// ============================================================
// WAITING-ON ACTIONS
// ============================================================

export async function actionMarkReceived(waitingOnId: string) {
  const result = markWaitingOnReceived(waitingOnId);
  if (!result) return { success: false, error: 'Item not found' };
  recalculateAndRevalidate(['/command']);
  return { success: true };
}

export async function actionMarkContacted(waitingOnId: string) {
  const result = updateWaitingOnContacted(waitingOnId);
  if (!result) return { success: false, error: 'Item not found' };
  recalculateAndRevalidate(['/command']);
  return { success: true };
}

// ============================================================
// WEEKLY REVIEW ACTIONS
// ============================================================

export async function actionCompleteReview(weekNumber: number, momentumScore: number) {
  const result = completeWeeklyReview(weekNumber, momentumScore);
  recalculateAndRevalidate(['/review']);
  return { success: true, review: result };
}

// ============================================================
// MILESTONE ACTIONS
// ============================================================

export async function actionUpdateMilestoneGate(milestoneId: string, gateIndex: number, met: boolean) {
  const result = updateMilestoneGate(milestoneId, gateIndex, met);
  if (!result) return { success: false, error: 'Milestone or gate not found' };
  recalculateAndRevalidate(['/milestones']);
  return { success: true, milestone: result };
}
