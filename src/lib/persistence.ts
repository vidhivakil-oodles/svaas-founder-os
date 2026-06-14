/**
 * SVAAS Venture OS — Persistence Layer
 * 
 * Strategy:
 * 1. In-memory state (always available, fast)
 * 2. localStorage backup (client-side persistence across refreshes)
 * 3. Supabase (production persistence when configured)
 * 
 * The app starts from seed data, then hydrates from localStorage if available.
 * When Supabase is configured, it becomes the source of truth.
 */

import { TASKS, WAITING_ON } from '@/lib/data/tasks';
import { VENTURE_STREAMS, STREAM_DEPENDENCIES } from '@/lib/data/streams';
import { DECISIONS } from '@/lib/data/decisions';
import { MILESTONES } from '@/lib/data/milestones';
import type { Task, Decision, Milestone, WaitingOn, StreamDependency } from '@/types';

const STORAGE_KEY = 'svaas-os-state';

export interface AppState {
  tasks: Task[];
  decisions: Decision[];
  streams: typeof VENTURE_STREAMS;
  milestones: Milestone[];
  waitingOn: WaitingOn[];
  streamDeps: StreamDependency[];
  activityLog: ActivityEntry[];
  dailyEngagement: DailyEntry[];
  reviewHistory: ReviewEntry[];
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
    tasks: JSON.parse(JSON.stringify(TASKS)),
    decisions: JSON.parse(JSON.stringify(DECISIONS)),
    streams: JSON.parse(JSON.stringify(VENTURE_STREAMS)),
    milestones: JSON.parse(JSON.stringify(MILESTONES)),
    waitingOn: JSON.parse(JSON.stringify(WAITING_ON)),
    streamDeps: JSON.parse(JSON.stringify(STREAM_DEPENDENCIES)),
    activityLog: [],
    dailyEngagement: [],
    reviewHistory: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    // Server-side: always return default (will hydrate on client)
    return getDefaultState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppState;
      // Validate it has the expected shape
      if (parsed.tasks && parsed.decisions && parsed.streams) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }

  return getDefaultState();
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;

  try {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
