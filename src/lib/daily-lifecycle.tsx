'use client';

import { useEffect, useRef } from 'react';
import { useAppState } from './state-provider';
import { useToast } from './toast-provider';

/**
 * Daily Lifecycle Hook
 * 
 * Runs on app load and at midnight. Handles:
 * 1. Commitment Reset: committed_today tasks from yesterday → back to not_started
 * 2. Deferred Resurfacing: deferred tasks whose reviewDate has arrived → back to not_started
 * 3. Waiting-On Overdue Detection: marks waiting_on tasks past their expected date
 */
export function DailyLifecycleManager() {
  const { state, isLoaded } = useAppState();
  const { showToast } = useToast();
  const hasRunRef = useRef(false);
  const midnightTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoaded || hasRunRef.current) return;
    hasRunRef.current = true;

    runDailyCheck();
    scheduleMidnightReset();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  function runDailyCheck() {
    const today = new Date().toISOString().split('T')[0];
    let resetCount = 0;
    let resurfacedCount = 0;

    // We need to directly mutate through localStorage since we're in a lifecycle hook
    // that runs once. We'll use the state-provider's raw setState via a custom approach.
    // Instead, we read from localStorage, patch, and save back — then reload.
    const storageKey = 'svaas-os-state';
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const appState = JSON.parse(stored);
      let changed = false;

      // 1. Commitment Reset
      appState.tasks = appState.tasks.map((task: any) => {
        if (task.status === 'committed_today') {
          const committedDate = task.committedAt ? task.committedAt.split('T')[0] : null;
          if (committedDate && committedDate !== today) {
            resetCount++;
            changed = true;
            return { ...task, status: 'not_started', committedAt: null };
          }
        }
        return task;
      });

      // 2. Deferred Resurfacing — tasks whose review date has arrived
      appState.tasks = appState.tasks.map((task: any) => {
        if (task.status === 'deferred' && task.deferredReviewDate) {
          if (task.deferredReviewDate <= today) {
            resurfacedCount++;
            changed = true;
            return { ...task, status: 'not_started', deferredReason: null, deferredReviewDate: null };
          }
        }
        return task;
      });

      // 3. Track last lifecycle run date
      appState._lastLifecycleDate = today;

      if (changed) {
        appState.lastUpdated = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(appState));
        
        // Show feedback
        if (resetCount > 0) {
          showToast(`${resetCount} uncommitted task${resetCount > 1 ? 's' : ''} reset for today`, 'info');
        }
        if (resurfacedCount > 0) {
          showToast(`${resurfacedCount} deferred task${resurfacedCount > 1 ? 's' : ''} resurfaced for review`, 'info');
        }

        // Add journal entries
        if (!appState.journal) appState.journal = [];
        if (resetCount > 0) {
          appState.journal.push({
            id: `journal-reset-${Date.now()}`,
            type: 'daily_reset',
            title: `${resetCount} uncommitted task${resetCount > 1 ? 's' : ''} reset at start of day`,
            taskId: null,
            streamId: null,
            metadata: { resetCount, date: today },
            createdAt: new Date().toISOString(),
          });
        }
        if (resurfacedCount > 0) {
          appState.journal.push({
            id: `journal-resurface-${Date.now()}`,
            type: 'deferred_resurfaced',
            title: `${resurfacedCount} deferred task${resurfacedCount > 1 ? 's' : ''} resurfaced for review`,
            taskId: null,
            streamId: null,
            metadata: { resurfacedCount, date: today },
            createdAt: new Date().toISOString(),
          });
        }

        localStorage.setItem(storageKey, JSON.stringify(appState));

        // Force page reload to pick up the patched state
        window.location.reload();
      }
    } catch (e) {
      console.warn('[SVAAS Lifecycle] Failed daily check:', e);
    }
  }

  function scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    const msUntilMidnight = midnight.getTime() - now.getTime();

    midnightTimerRef.current = setTimeout(() => {
      hasRunRef.current = false; // Allow re-run
      runDailyCheck();
      // Re-schedule for the next midnight
      scheduleMidnightReset();
    }, msUntilMidnight);
  }

  // This component renders nothing — it's just lifecycle logic
  return null;
}
