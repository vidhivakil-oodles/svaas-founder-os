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
import { revalidatePath } from 'next/cache';

// ============================================================
// TASK ACTIONS
// ============================================================

export async function actionMarkTaskDone(taskId: string) {
  const result = markTaskDone(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  revalidatePath('/');
  revalidatePath('/command');
  revalidatePath('/bottlenecks');
  revalidatePath(`/stream/${result.streamSlug}`);
  return { success: true, task: result };
}

export async function actionBlockTask(taskId: string, reason: string) {
  const result = blockTask(taskId, reason);
  if (!result) return { success: false, error: 'Task not found' };
  revalidatePath('/');
  revalidatePath('/command');
  revalidatePath('/bottlenecks');
  revalidatePath(`/stream/${result.streamSlug}`);
  return { success: true, task: result };
}

export async function actionStartTask(taskId: string) {
  const result = startTask(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  revalidatePath('/');
  revalidatePath(`/stream/${result.streamSlug}`);
  return { success: true, task: result };
}

export async function actionDeferTask(taskId: string) {
  const result = deferTask(taskId);
  if (!result) return { success: false, error: 'Task not found' };
  revalidatePath('/');
  revalidatePath(`/stream/${result.streamSlug}`);
  return { success: true, task: result };
}

// ============================================================
// DECISION ACTIONS
// ============================================================

export async function actionMakeDecision(decisionId: string, chosenOption: string, rationale?: string) {
  const result = makeDecision(decisionId, chosenOption, rationale);
  if (!result) return { success: false, error: 'Decision not found' };
  revalidatePath('/');
  revalidatePath('/command');
  revalidatePath('/decisions');
  return { success: true, decision: result };
}

export async function actionAcceptDefault(decisionId: string) {
  const result = acceptDefault(decisionId);
  if (!result) return { success: false, error: 'Decision not found or no default' };
  revalidatePath('/');
  revalidatePath('/command');
  revalidatePath('/decisions');
  return { success: true, decision: result };
}

export async function actionDeferDecision(decisionId: string) {
  const result = deferDecision(decisionId);
  if (!result) return { success: false, error: 'Decision not found or max deferrals reached' };
  revalidatePath('/');
  revalidatePath('/command');
  revalidatePath('/decisions');
  return { success: true, decision: result };
}

// ============================================================
// WAITING-ON ACTIONS
// ============================================================

export async function actionMarkReceived(waitingOnId: string) {
  const result = markWaitingOnReceived(waitingOnId);
  if (!result) return { success: false, error: 'Item not found' };
  revalidatePath('/');
  revalidatePath('/command');
  return { success: true };
}

export async function actionMarkContacted(waitingOnId: string) {
  const result = updateWaitingOnContacted(waitingOnId);
  if (!result) return { success: false, error: 'Item not found' };
  revalidatePath('/');
  revalidatePath('/command');
  return { success: true };
}

// ============================================================
// WEEKLY REVIEW ACTIONS
// ============================================================

export async function actionCompleteReview(weekNumber: number, momentumScore: number) {
  const result = completeWeeklyReview(weekNumber, momentumScore);
  revalidatePath('/');
  revalidatePath('/review');
  return { success: true, review: result };
}

// ============================================================
// MILESTONE ACTIONS
// ============================================================

export async function actionUpdateMilestoneGate(milestoneId: string, gateIndex: number, met: boolean) {
  const result = updateMilestoneGate(milestoneId, gateIndex, met);
  if (!result) return { success: false, error: 'Milestone or gate not found' };
  revalidatePath('/');
  revalidatePath('/milestones');
  return { success: true, milestone: result };
}
