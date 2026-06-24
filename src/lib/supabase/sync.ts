/**
 * Tattva - Supabase Sync Module
 *
 * Provides:
 * 1. One-time bulk export of localStorage state to Supabase
 * 2. Individual entity upsert for real-time write-through
 *
 * All writes go through the /api/sync endpoint which uses the
 * service role key server-side (bypassing RLS).
 */

import type { Task, Decision, Milestone, WaitingOn, StreamDependency, VentureStream } from '@/types';

// Default venture ID for SVAAS (created during setup)
export const SVAAS_VENTURE_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================
// FIELD MAPPING: camelCase (TypeScript) -> snake_case (Supabase)
// ============================================================

function taskToRow(task: Task) {
  return {
    id: task.id,
    venture_id: SVAAS_VENTURE_ID,
    stream_id: task.streamId || null,
    stream_slug: task.streamSlug || null,
    task_number: task.taskNumber,
    department: task.department,
    category: task.category,
    title: task.title,
    description: task.description,
    notes_dependencies: task.notesDependencies,
    priority: task.priority,
    phase: task.phase,
    day_range_start: task.dayRangeStart,
    day_range_end: task.dayRangeEnd,
    cost_low: task.costLow,
    cost_likely: task.costLikely,
    cost_high: task.costHigh,
    owner: task.owner,
    status: task.status,
    blocked_reason: task.blockedReason,
    completed_at: task.completedAt,
    waiting_on_person: task.waitingOnPerson || null,
    waiting_on_date: task.waitingOnDate || null,
    waiting_on_notes: task.waitingOnNotes || null,
    deferred_reason: task.deferredReason || null,
    deferred_review_date: task.deferredReviewDate || null,
    committed_at: task.committedAt || null,
    source: task.source || 'imported',
    created_at: task.createdAt || new Date().toISOString(),
  };
}

function decisionToRow(decision: Decision) {
  return {
    id: decision.id,
    venture_id: SVAAS_VENTURE_ID,
    title: decision.title,
    context: decision.context,
    options: decision.options,
    default_option: decision.defaultOption,
    default_rationale: decision.defaultRationale,
    deadline: decision.deadline,
    status: decision.status,
    decision_made: decision.decisionMade,
    rationale: decision.rationale,
    decided_at: decision.decidedAt,
    defer_count: decision.deferCount,
    max_deferrals: decision.maxDeferrals,
    blocks_task_ids: decision.blocksTasks || [],
    impact_score: decision.impactScore,
    streams_affected: decision.streamsAffected,
    tasks_affected: decision.tasksAffected,
    estimated_delay_days: decision.estimatedDelayDays,
    cascade_depth: decision.cascadeDepth,
  };
}

function milestoneToRow(milestone: Milestone) {
  return {
    id: milestone.id,
    venture_id: SVAAS_VENTURE_ID,
    title: milestone.title,
    day_target: milestone.dayTarget,
    phase: milestone.phase,
    gate_criteria: milestone.gateCriteria,
    status: milestone.status,
    achieved_at: milestone.achievedAt,
  };
}

function waitingOnToRow(item: WaitingOn) {
  return {
    id: item.id,
    venture_id: SVAAS_VENTURE_ID,
    person_or_vendor: item.personOrVendor,
    description: item.description,
    related_task_id: item.relatedTaskId,
    due_date: item.dueDate,
    last_contacted: item.lastContacted,
    status: item.status,
    stream_slug: item.streamSlug || null,
  };
}

function streamToRow(stream: VentureStream) {
  return {
    id: stream.id,
    venture_id: SVAAS_VENTURE_ID,
    name: stream.name,
    slug: stream.slug,
    display_order: stream.displayOrder,
    status: stream.status,
    current_bottleneck: stream.currentBottleneck,
    waiting_on: stream.waitingOn,
    next_milestone: stream.nextMilestone,
    last_movement_at: stream.lastMovementAt,
    momentum_score: stream.momentumScore,
    departments: stream.departments,
  };
}

function streamDepToRow(dep: StreamDependency) {
  return {
    id: dep.id,
    venture_id: SVAAS_VENTURE_ID,
    upstream_stream_id: dep.upstreamStreamId,
    downstream_stream_id: dep.downstreamStreamId,
    dependency_type: dep.dependencyType,
    reason: dep.reason,
    strength: dep.strength,
  };
}

// ============================================================
// SYNC API CALLS (POST to /api/sync)
// ============================================================

interface SyncPayload {
  type: 'task' | 'decision' | 'milestone' | 'waiting_on' | 'stream' | 'stream_dep';
  data: Record<string, unknown>;
}

interface BulkSyncPayload {
  tasks: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
  waiting_on: Record<string, unknown>[];
  streams: Record<string, unknown>[];
  stream_deps: Record<string, unknown>[];
}

/**
 * Fire-and-forget single entity sync to Supabase via the API route.
 * Non-blocking - errors are logged but do not throw.
 */
export async function syncEntity(type: SyncPayload['type'], data: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.warn(`[Tattva Sync] Failed to sync ${type}:`, err);
    }
  } catch (error) {
    console.warn(`[Tattva Sync] Network error syncing ${type}:`, error);
  }
}

/**
 * Sync a task to Supabase (fire-and-forget).
 */
export function syncTask(task: Task): void {
  syncEntity('task', taskToRow(task));
}

/**
 * Sync a decision to Supabase (fire-and-forget).
 */
export function syncDecision(decision: Decision): void {
  syncEntity('decision', decisionToRow(decision));
}

/**
 * Sync a milestone to Supabase (fire-and-forget).
 */
export function syncMilestone(milestone: Milestone): void {
  syncEntity('milestone', milestoneToRow(milestone));
}

/**
 * Sync a waiting-on item to Supabase (fire-and-forget).
 */
export function syncWaitingOnItem(item: WaitingOn): void {
  syncEntity('waiting_on', waitingOnToRow(item));
}

/**
 * One-time bulk export of all localStorage data to Supabase.
 * Call this from the client to persist the full state.
 */
export async function bulkSyncToSupabase(state: {
  tasks: Task[];
  decisions: Decision[];
  milestones: Milestone[];
  waitingOn: WaitingOn[];
  streams: VentureStream[];
  streamDeps: StreamDependency[];
}): Promise<{ success: boolean; results?: Record<string, number>; error?: string }> {
  try {
    const payload: BulkSyncPayload = {
      tasks: state.tasks.map(taskToRow),
      decisions: state.decisions.map(decisionToRow),
      milestones: state.milestones.map(milestoneToRow),
      waiting_on: state.waitingOn.map(waitingOnToRow),
      streams: state.streams.map(streamToRow),
      stream_deps: state.streamDeps.map(streamDepToRow),
    };

    const response = await fetch('/api/sync/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    const result = await response.json();
    return { success: true, results: result.counts };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Export row mappers for use by API routes
export { taskToRow, decisionToRow, milestoneToRow, waitingOnToRow, streamToRow, streamDepToRow };
