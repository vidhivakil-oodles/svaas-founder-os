'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadState, saveState, AppState, ActivityEntry, DailyEntry, ReviewEntry, DATA_VERSION } from './persistence';
import { useToast } from './toast-provider';
import type { Task, Decision, Milestone, WaitingOn } from '@/types';

interface StateContextValue {
  state: AppState;
  isLoaded: boolean;
  // Task mutations
  markTaskDone: (taskId: string) => void;
  blockTask: (taskId: string, reason: string) => void;
  startTask: (taskId: string) => void;
  commitTask: (taskId: string) => void;
  waitingOnTask: (taskId: string, person: string, date: string, notes?: string) => void;
  deferTask: (taskId: string, reason: string, reviewDate: string) => void;
  // Decision mutations
  acceptDecisionDefault: (decisionId: string) => void;
  makeDecision: (decisionId: string, option: string) => void;
  deferDecision: (decisionId: string) => void;
  // Waiting-on mutations
  markWaitingOnReceived: (id: string) => void;
  // Milestone mutations
  toggleMilestoneGate: (milestoneId: string, gateIndex: number) => void;
  // Journal
  addManualNote: (note: string, streamSlug?: string) => void;
  // Cancel
  cancelTask: (taskId: string, reason?: string) => void;
}

const StateContext = createContext<StateContextValue | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState());
  const [isLoaded, setIsLoaded] = useState(false);
  const { showToast } = useToast();

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

  // Helper: add journal entry (will be used by Venture Journal)
  const addJournalEntry = useCallback((type: string, title: string, taskId?: string, streamId?: string, metadata?: Record<string, any>) => {
    const entry = {
      id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      taskId: taskId || null,
      streamId: streamId || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      journal: [...(prev.journal || []), entry],
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
      addJournalEntry('task_completed', task.title, taskId, task.streamId);
      showToast(`Done: ${task.title.slice(0, 50)}`, 'success');
    }
  }, [state.tasks, logActivity, updateStreamMovement, addJournalEntry, showToast]);

  // Task: Block
  const blockTask = useCallback((taskId: string, reason: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'blocked' as const, blockedReason: reason } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      addJournalEntry('task_blocked', `${task.title} — ${reason}`, taskId, task.streamId, { reason });
      showToast(`Blocked: ${task.title.slice(0, 40)}`, 'info');
    }
  }, [state.tasks, logActivity, addJournalEntry, showToast]);

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
      addJournalEntry('task_started', task.title, taskId, task.streamId);
      showToast(`Started: ${task.title.slice(0, 50)}`, 'success');
    }
  }, [state.tasks, logActivity, updateStreamMovement, addJournalEntry, showToast]);

  // Task: Commit Today
  const commitTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'committed_today' as const, committedAt: new Date().toISOString() } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      addJournalEntry('task_committed', task.title, taskId, task.streamId);
      showToast(`Committed today: ${task.title.slice(0, 40)}`, 'success');
    }
  }, [state.tasks, logActivity, addJournalEntry, showToast]);

  // Task: Waiting On
  const waitingOnTask = useCallback((taskId: string, person: string, date: string, notes?: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'waiting_on' as const, waitingOnPerson: person, waitingOnDate: date, waitingOnNotes: notes || null } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      addJournalEntry('task_waiting_on', `${task.title} — waiting on ${person}`, taskId, task.streamId, { person, date, notes });
      showToast(`Waiting on ${person}: ${task.title.slice(0, 35)}`, 'info');
    }
  }, [state.tasks, logActivity, addJournalEntry, showToast]);

  // Task: Defer
  const deferTask = useCallback((taskId: string, reason: string, reviewDate: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'deferred' as const, deferredReason: reason, deferredReviewDate: reviewDate } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      addJournalEntry('task_deferred', `${task.title} — ${reason}`, taskId, task.streamId, { reason, reviewDate });
      showToast(`Deferred: ${task.title.slice(0, 40)}${reviewDate ? ` (review ${reviewDate})` : ''}`, 'info');
    }
  }, [state.tasks, logActivity, addJournalEntry, showToast]);

  // Decision: Accept Default
  const acceptDecisionDefault = useCallback((decisionId: string) => {
    const decision = state.decisions.find(d => d.id === decisionId);
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d =>
        d.id === decisionId
          ? { ...d, status: 'decided' as const, decisionMade: d.defaultOption, rationale: `Accepted default: ${d.defaultRationale || ''}`, decidedAt: new Date().toISOString() }
          : d
      ),
    }));
    if (decision) {
      logActivity(null, 'decision_made', decisionId);
      addJournalEntry('decision_made', `${decision.title} → ${decision.defaultOption}`, undefined, undefined, { option: decision.defaultOption, method: 'accepted_default' });
      showToast(`Decided: ${decision.title.slice(0, 40)}`, 'success');
    }
  }, [state.decisions, logActivity, addJournalEntry, showToast]);

  // Decision: Make specific choice
  const makeDecisionFn = useCallback((decisionId: string, option: string) => {
    const decision = state.decisions.find(d => d.id === decisionId);
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d =>
        d.id === decisionId
          ? { ...d, status: 'decided' as const, decisionMade: option, decidedAt: new Date().toISOString() }
          : d
      ),
    }));
    if (decision) {
      logActivity(null, 'decision_made', decisionId);
      addJournalEntry('decision_made', `${decision.title} → ${option}`, undefined, undefined, { option, method: 'explicit_choice' });
      showToast(`Decided: ${option}`, 'success');
    }
  }, [state.decisions, logActivity, addJournalEntry, showToast]);

  // Decision: Defer
  const deferDecisionFn = useCallback((decisionId: string) => {
    const decision = state.decisions.find(d => d.id === decisionId);
    setState(prev => ({
      ...prev,
      decisions: prev.decisions.map(d => {
        if (d.id !== decisionId || d.deferCount >= d.maxDeferrals) return d;
        const newDeadline = d.deadline ? new Date(new Date(d.deadline).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;
        return { ...d, deferCount: d.deferCount + 1, deadline: newDeadline };
      }),
    }));
    if (decision) {
      if (decision.deferCount >= decision.maxDeferrals) {
        showToast(`Cannot defer: max deferrals reached`, 'error');
      } else {
        logActivity(null, 'decision_deferred', decisionId);
        addJournalEntry('decision_deferred', `${decision.title} — deferred 7 days`, undefined, undefined, { deferCount: decision.deferCount + 1 });
        showToast(`Deferred 7 days: ${decision.title.slice(0, 35)}`, 'info');
      }
    }
  }, [state.decisions, logActivity, addJournalEntry, showToast]);

  // Waiting On: Mark Received
  const markWaitingOnReceived = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      waitingOn: prev.waitingOn.map(w =>
        w.id === id ? { ...w, status: 'received' as const } : w
      ),
    }));
    const item = state.waitingOn.find(w => w.id === id);
    logActivity(null, 'waiting_on_updated', id);
    addJournalEntry('waiting_on_received', item?.description || 'Item received', undefined, undefined, { person: item?.personOrVendor });
    showToast(`Received from ${item?.personOrVendor || 'vendor'}`, 'success');
  }, [state.waitingOn, logActivity, addJournalEntry, showToast]);

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
    const milestone = state.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      const gate = milestone.gateCriteria[gateIndex];
      const wasMetBefore = gate?.met;
      if (wasMetBefore) {
        showToast(`Gate unchecked: ${gate.description.slice(0, 40)}`, 'info');
      } else {
        addJournalEntry('milestone_gate_met', `${milestone.title}: ${gate?.description}`, undefined, undefined, { milestoneId, gateIndex });
        showToast(`Gate met: ${gate?.description.slice(0, 40)}`, 'success');
      }
    }
  }, [state.milestones, addJournalEntry, showToast]);

  // Journal: Add Manual Note
  const addManualNote = useCallback((note: string, streamSlug?: string) => {
    const streamId = streamSlug ? state.streams.find(s => s.slug === streamSlug)?.id || null : null;
    addJournalEntry('manual_note', note, undefined, streamId || undefined);
    showToast('Note saved to journal', 'success');
  }, [state.streams, addJournalEntry, showToast]);

  // Task: Cancel
  const cancelTask = useCallback((taskId: string, reason?: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'cancelled' as const, blockedReason: reason || 'Cancelled' } : t
      ),
    }));
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      logActivity(task.streamId, 'task_status_changed', taskId);
      addJournalEntry('task_cancelled', `${task.title}${reason ? ` — ${reason}` : ''}`, taskId, task.streamId, { reason });
      showToast(`Cancelled: ${task.title.slice(0, 40)}`, 'info');
    }
  }, [state.tasks, logActivity, addJournalEntry, showToast]);

  return (
    <StateContext.Provider value={{
      state,
      isLoaded,
      markTaskDone,
      blockTask,
      startTask,
      commitTask,
      waitingOnTask,
      deferTask,
      acceptDecisionDefault,
      makeDecision: makeDecisionFn,
      deferDecision: deferDecisionFn,
      markWaitingOnReceived,
      toggleMilestoneGate,
      addManualNote,
      cancelTask,
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
