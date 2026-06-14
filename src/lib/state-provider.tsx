'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadState, saveState, AppState, ActivityEntry, DailyEntry, ReviewEntry } from './persistence';
import { isSupabaseReady, getSupabaseClient } from './supabase/db';
import type { Task, Decision, Milestone, WaitingOn } from '@/types';

interface StateContextValue {
  state: AppState;
  isLoaded: boolean;
  // Task mutations
  markTaskDone: (taskId: string) => void;
  blockTask: (taskId: string, reason: string) => void;
  startTask: (taskId: string) => void;
  // Decision mutations
  acceptDecisionDefault: (decisionId: string) => void;
  makeDecision: (decisionId: string, option: string) => void;
  deferDecision: (decisionId: string) => void;
  // Waiting-on mutations
  markWaitingOnReceived: (id: string) => void;
  // Milestone mutations
  toggleMilestoneGate: (milestoneId: string, gateIndex: number) => void;
}

const StateContext = createContext<StateContextValue | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState());
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setIsLoaded(true);
  }, []);

  // Save to localStorage on every state change
  useEffect(() => {
    if (isLoaded) {
      saveState(state);
    }
  }, [state, isLoaded]);

  // Helper: log activity
  const logActivity = useCallback((streamId: string | null, activityType: string, entityId: string | null) => {
    const entry: ActivityEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      streamId,
      activityType,
      relatedEntityId: entityId,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      activityLog: [...prev.activityLog, entry],
    }));

    // Track daily engagement
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const existing = prev.dailyEngagement.find(e => e.date === today);
      if (existing) {
        return {
          ...prev,
          dailyEngagement: prev.dailyEngagement.map(e =>
            e.date === today
              ? { ...e, hadActivity: true, actionCount: e.actionCount + 1, streamsTouched: [...new Set([...e.streamsTouched, streamId || ''])] }
              : e
          ),
        };
      }
      return {
        ...prev,
        dailyEngagement: [...prev.dailyEngagement, { date: today, hadActivity: true, actionCount: 1, streamsTouched: streamId ? [streamId] : [] }],
      };
    });
  }, []);

  // Helper: update stream movement
  const updateStreamMovement = useCallback((streamId: string) => {
    setState(prev => ({
      ...prev,
      streams: prev.streams.map(s =>
        s.id === streamId ? { ...s, lastMovementAt: new Date().toISOString() } : s
      ),
    }));
  }, []);

  // Task: Mark Done
  const markTaskDone = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, status: 'done' as const, completedAt: new Date().toISOString(), blockedReason: null } : t
        ),
      };
    });
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_completed', taskId);
      updateStreamMovement(task.streamId);
    }
  }, [state.tasks, logActivity, updateStreamMovement]);

  // Task: Block
  const blockTask = useCallback((taskId: string, reason: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'blocked' as const, blockedReason: reason } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) logActivity(task.streamId, 'task_status_changed', taskId);
  }, [state.tasks, logActivity]);

  // Task: Start
  const startTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'in_progress' as const } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      updateStreamMovement(task.streamId);
    }
  }, [state.tasks, logActivity, updateStreamMovement]);

  // Decision: Accept Default
  const acceptDecisionDefault = useCallback((decisionId: string) => {
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d =>
        d.id === decisionId
          ? { ...d, status: 'decided' as const, decisionMade: d.defaultOption, rationale: `Accepted default: ${d.defaultRationale || ''}`, decidedAt: new Date().toISOString() }
          : d
      ),
    }));
    logActivity(null, 'decision_made', decisionId);
  }, [logActivity]);

  // Decision: Make specific choice
  const makeDecisionFn = useCallback((decisionId: string, option: string) => {
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d =>
        d.id === decisionId
          ? { ...d, status: 'decided' as const, decisionMade: option, decidedAt: new Date().toISOString() }
          : d
      ),
    }));
    logActivity(null, 'decision_made', decisionId);
  }, [logActivity]);

  // Decision: Defer
  const deferDecisionFn = useCallback((decisionId: string) => {
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d => {
        if (d.id !== decisionId || d.deferCount >= d.maxDeferrals) return d;
        const newDeadline = d.deadline ? new Date(new Date(d.deadline).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;
        return { ...d, deferCount: d.deferCount + 1, deadline: newDeadline };
      }),
    }));
    logActivity(null, 'decision_deferred', decisionId);
  }, [logActivity]);

  // Waiting On: Mark Received
  const markWaitingOnReceived = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      waitingOn: prev.waitingOn.map(w =>
        w.id === id ? { ...w, status: 'received' as const } : w
      ),
    }));
    logActivity(null, 'waiting_on_updated', id);
  }, [logActivity]);

  // Milestone: Toggle Gate
  const toggleMilestoneGate = useCallback((milestoneId: string, gateIndex: number) => {
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => {
        if (m.id !== milestoneId) return m;
        const newGates = [...m.gateCriteria];
        newGates[gateIndex] = { ...newGates[gateIndex], met: !newGates[gateIndex].met };
        const allMet = newGates.every(g => g.met);
        return {
          ...m,
          gateCriteria: newGates,
          status: allMet ? 'achieved' as const : m.status,
          achievedAt: allMet ? new Date().toISOString() : m.achievedAt,
        };
      }),
    }));
  }, []);

  return (
    <StateContext.Provider value={{
      state,
      isLoaded,
      markTaskDone,
      blockTask,
      startTask,
      acceptDecisionDefault,
      makeDecision: makeDecisionFn,
      deferDecision: deferDecisionFn,
      markWaitingOnReceived,
      toggleMilestoneGate,
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within StateProvider');
  return ctx;
}
