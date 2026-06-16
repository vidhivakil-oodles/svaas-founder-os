/**
 * SVAAS Venture OS — Persistence Layer
 * 
 * DATA VERSIONING:
 * When source data changes (new task import, schema change), increment DATA_VERSION.
 * On load: if stored version != current version → clear and reload from source.
 */

import { TASKS, WAITING_ON } from '@/lib/data/tasks';
import { VENTURE_STREAMS, STREAM_DEPENDENCIES } from '@/lib/data/streams';
import { DECISIONS } from '@/lib/data/decisions';
import { MILESTONES } from '@/lib/data/milestones';
import type { Task, Decision, Milestone, WaitingOn, StreamDependency } from '@/types';

// ============================================================
// DATA VERSION — INCREMENT WHEN SOURCE DATA CHANGES
// v1 = original 22 seed tasks
// v2 = full 358 task import from Google Sheets (June 15, 2026)
// ============================================================
export const DATA_VERSION = 3;

const STORAGE_KEY = 'svaas-os-state';

export interface JournalEntry {
  id: string;
  type: string; // task_completed, task_started, task_blocked, task_committed, task_waiting_on, task_deferred, decision_made, decision_deferred, waiting_on_received, milestone_gate_met, manual_note
  title: string;
  taskId: string | null;
  streamId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AppState {
  dataVersion: number;
  dataSource: 'seed' | 'imported' | 'supabase';
  lastImportDate: string | null;
  tasks: Task[];
  decisions: Decision[];
  streams: typeof VENTURE_STREAMS;
  milestones: Milestone[];
  waitingOn: WaitingOn[];
  streamDeps: StreamDependency[];
  activityLog: ActivityEntry[];
  dailyEngagement: DailyEntry[];
  reviewHistory: ReviewEntry[];
  journal: JournalEntry[];
  lastUpdated: string;
}

export interface ActivityEntry {
  id: string;
  streamId: string | null;
  activityType: string;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface DailyEntry {
  date: string;
  hadActivity: boolean;
  actionCount: number;
  streamsTouched: string[];
}

export interface ReviewEntry {
  weekNumber: number;
  completedAt: string;
  tasksCompletedCount: number;
  momentumScoreAtClose: number;
}

function getDefaultState(): AppState {
  return {
    dataVersion: DATA_VERSION,
    dataSource: 'seed',
    lastImportDate: new Date().toISOString(),
    tasks: JSON.parse(JSON.stringify(TASKS)),
    decisions: JSON.parse(JSON.stringify(DECISIONS)),
    streams: JSON.parse(JSON.stringify(VENTURE_STREAMS)),
    milestones: JSON.parse(JSON.stringify(MILESTONES)),
    waitingOn: JSON.parse(JSON.stringify(WAITING_ON)),
    streamDeps: JSON.parse(JSON.stringify(STREAM_DEPENDENCIES)),
    activityLog: [],
    dailyEngagement: [],
    reviewHistory: [],
    journal: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppState;

      // VERSION CHECK: stale data → clear and reload from source
      if (!parsed.dataVersion || parsed.dataVersion !== DATA_VERSION) {
        console.warn(`[SVAAS OS] Data version mismatch: stored=${parsed.dataVersion}, current=${DATA_VERSION}. Clearing stale data.`);
        localStorage.removeItem(STORAGE_KEY);
        const fresh = getDefaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
      }

      // Validate shape
      if (parsed.tasks && parsed.decisions && parsed.streams) {
        // Backfill journal if missing (added in this version)
        if (!parsed.journal) parsed.journal = [];
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[SVAAS OS] Failed to load state from localStorage:', e);
  }

  const fresh = getDefaultState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    state.dataVersion = DATA_VERSION;
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[SVAAS OS] Failed to save state:', e);
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? new Blob([stored]).size : 0;
}
