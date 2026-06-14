/**
 * SVAAS Venture OS — Supabase Database Layer
 * 
 * This module provides all CRUD operations against Supabase.
 * When Supabase is not configured, the app falls back to localStorage
 * (handled by the StateProvider which checks isSupabaseReady).
 * 
 * All functions are async and return typed data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Task, Decision, Milestone, WaitingOn, StreamDependency } from '@/types';

// ============================================================
// CLIENT INITIALIZATION
// ============================================================

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || key.includes('placeholder') || key.length < 30) {
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

export function isSupabaseReady(): boolean {
  return getClient() !== null;
}

export function getSupabaseClient(): SupabaseClient | null {
  return getClient();
}

// ============================================================
// AUTH
// ============================================================

export async function signInWithMagicLink(email: string): Promise<{ error: any }> {
  const client = getClient();
  if (!client) return { error: 'Supabase not configured' };

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  return { error };
}

export async function signOut(): Promise<void> {
  const client = getClient();
  if (client) await client.auth.signOut();
}

export async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function getUser() {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}

// ============================================================
// VENTURES
// ============================================================

export async function getVenture(ventureSlug: string) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('ventures')
    .select('*')
    .eq('slug', ventureSlug)
    .single();

  if (error) { console.error('getVenture error:', error); return null; }
  return data;
}

export async function createVenture(venture: {
  name: string; slug: string; description?: string;
  launch_start_date?: string; launch_target_days?: number;
}) {
  const client = getClient();
  if (!client) return null;

  const user = await getUser();
  if (!user) return null;

  const { data, error } = await client
    .from('ventures')
    .insert({ ...venture, owner_id: user.id })
    .select()
    .single();

  if (error) { console.error('createVenture error:', error); return null; }
  return data;
}

// ============================================================
// STREAMS
// ============================================================

export async function getStreams(ventureId: string) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('venture_streams')
    .select('*')
    .eq('venture_id', ventureId)
    .order('display_order');

  if (error) { console.error('getStreams error:', error); return []; }
  return data || [];
}

export async function updateStreamStatus(streamId: string, updates: {
  status?: string; current_bottleneck?: string; waiting_on?: string;
  next_milestone?: string; last_movement_at?: string; momentum_score?: number;
}) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('venture_streams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', streamId)
    .select()
    .single();

  if (error) { console.error('updateStream error:', error); return null; }
  return data;
}

export async function getStreamDependencies(ventureId: string) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('stream_dependencies')
    .select(`
      *,
      upstream:venture_streams!upstream_stream_id(name, slug, status),
      downstream:venture_streams!downstream_stream_id(name, slug, status)
    `)
    .eq('venture_id', ventureId);

  if (error) { console.error('getStreamDeps error:', error); return []; }
  return data || [];
}

// ============================================================
// TASKS
// ============================================================

export async function getTasks(ventureId: string, filters?: {
  streamId?: string; status?: string; priority?: string; phase?: string;
}) {
  const client = getClient();
  if (!client) return [];

  let query = client.from('tasks').select('*').eq('venture_id', ventureId);

  if (filters?.streamId) query = query.eq('stream_id', filters.streamId);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.phase) query = query.eq('phase', filters.phase);

  const { data, error } = await query.order('task_number');

  if (error) { console.error('getTasks error:', error); return []; }
  return data || [];
}

export async function updateTaskStatus(taskId: string, status: string, blockedReason?: string | null) {
  const client = getClient();
  if (!client) return null;

  const updates: any = {
    status,
    blocked_reason: blockedReason || null,
    updated_at: new Date().toISOString(),
  };

  if (status === 'done') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) { console.error('updateTask error:', error); return null; }
  return data;
}

export async function bulkImportTasks(ventureId: string, tasks: any[]) {
  const client = getClient();
  if (!client) return { count: 0, error: 'Supabase not configured' };

  // Add venture_id to all records
  const records = tasks.map(t => ({ ...t, venture_id: ventureId }));

  const { data, error } = await client
    .from('tasks')
    .upsert(records, { onConflict: 'id' })
    .select();

  if (error) return { count: 0, error: error.message };
  return { count: data?.length || 0, error: null };
}

// ============================================================
// DECISIONS
// ============================================================

export async function getDecisions(ventureId: string) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('decisions')
    .select('*')
    .eq('venture_id', ventureId)
    .order('impact_score', { ascending: false });

  if (error) { console.error('getDecisions error:', error); return []; }
  return data || [];
}

export async function updateDecision(decisionId: string, updates: {
  status?: string; decision_made?: string; rationale?: string;
  decided_at?: string; defer_count?: number; deadline?: string;
}) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('decisions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', decisionId)
    .select()
    .single();

  if (error) { console.error('updateDecision error:', error); return null; }
  return data;
}

export async function bulkImportDecisions(ventureId: string, decisions: any[]) {
  const client = getClient();
  if (!client) return { count: 0, error: 'Supabase not configured' };

  const records = decisions.map(d => ({ ...d, venture_id: ventureId }));

  const { data, error } = await client
    .from('decisions')
    .upsert(records, { onConflict: 'id' })
    .select();

  if (error) return { count: 0, error: error.message };
  return { count: data?.length || 0, error: null };
}

// ============================================================
// MILESTONES
// ============================================================

export async function getMilestones(ventureId: string) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('milestones')
    .select('*')
    .eq('venture_id', ventureId)
    .order('day_target');

  if (error) { console.error('getMilestones error:', error); return []; }
  return data || [];
}

export async function updateMilestoneGate(milestoneId: string, gateCriteria: any[]) {
  const client = getClient();
  if (!client) return null;

  const allMet = gateCriteria.every((g: any) => g.met);

  const { data, error } = await client
    .from('milestones')
    .update({
      gate_criteria: gateCriteria,
      status: allMet ? 'achieved' : undefined,
      achieved_at: allMet ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) { console.error('updateMilestone error:', error); return null; }
  return data;
}

export async function bulkImportMilestones(ventureId: string, milestones: any[]) {
  const client = getClient();
  if (!client) return { count: 0, error: 'Supabase not configured' };

  const records = milestones.map(m => ({ ...m, venture_id: ventureId }));

  const { data, error } = await client
    .from('milestones')
    .upsert(records, { onConflict: 'id' })
    .select();

  if (error) return { count: 0, error: error.message };
  return { count: data?.length || 0, error: null };
}

// ============================================================
// WAITING ON
// ============================================================

export async function getWaitingOn(ventureId: string) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('waiting_on')
    .select('*')
    .eq('venture_id', ventureId)
    .eq('status', 'active')
    .order('due_date');

  if (error) { console.error('getWaitingOn error:', error); return []; }
  return data || [];
}

export async function updateWaitingOn(id: string, updates: { status?: string; last_contacted?: string }) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('waiting_on')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('updateWaitingOn error:', error); return null; }
  return data;
}

// ============================================================
// ACTIVITY LOG (Founder Attention Layer)
// ============================================================

export async function logActivity(ventureId: string, userId: string, entry: {
  stream_id?: string | null; activity_type: string; related_entity_id?: string | null; metadata?: any;
}) {
  const client = getClient();
  if (!client) return;

  await client.from('founder_activity_log').insert({
    venture_id: ventureId,
    user_id: userId,
    ...entry,
  });
}

export async function recordDailyEngagement(ventureId: string, userId: string, streamsTouched: string[]) {
  const client = getClient();
  if (!client) return;

  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await client
    .from('daily_engagement')
    .select('*')
    .eq('venture_id', ventureId)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await client.from('daily_engagement').update({
      had_activity: true,
      action_count: (existing.action_count || 0) + 1,
      streams_touched: [...new Set([...(existing.streams_touched || []), ...streamsTouched])],
    }).eq('id', existing.id);
  } else {
    await client.from('daily_engagement').insert({
      venture_id: ventureId,
      user_id: userId,
      date: today,
      had_activity: true,
      action_count: 1,
      streams_touched: streamsTouched,
    });
  }
}

// ============================================================
// WEEKLY REVIEWS
// ============================================================

export async function saveWeeklyReview(ventureId: string, review: {
  week_number: number; day_range?: string; tasks_completed_count: number;
  next_week_focus?: string; momentum_score_at_close?: number; dream_protection_at_close?: number;
}) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('weekly_reviews')
    .upsert({ ...review, venture_id: ventureId }, { onConflict: 'venture_id,week_number' })
    .select()
    .single();

  if (error) { console.error('saveReview error:', error); return null; }
  return data;
}

// ============================================================
// MOMENTUM SNAPSHOTS
// ============================================================

export async function saveMomentumSnapshot(ventureId: string, snapshot: {
  week_number: number; overall_score: number; stream_scores: any;
  trend: string; dormant_streams: string[];
}) {
  const client = getClient();
  if (!client) return;

  await client.from('momentum_snapshots').upsert(
    { ...snapshot, venture_id: ventureId },
    { onConflict: 'venture_id,week_number' }
  );
}

// ============================================================
// BULK IMPORT (unified)
// ============================================================

export async function bulkImport(ventureId: string, type: string, data: any[]) {
  const client = getClient();
  if (!client) return { count: 0, error: 'Supabase not configured' };

  const records = data.map(r => ({ ...r, venture_id: ventureId }));

  const tableMap: Record<string, string> = {
    tasks: 'tasks',
    decisions: 'decisions',
    milestones: 'milestones',
    streams: 'venture_streams',
    dependencies: 'stream_dependencies',
    waiting_on: 'waiting_on',
  };

  const table = tableMap[type];
  if (!table) return { count: 0, error: `Unknown type: ${type}` };

  const { data: result, error } = await client
    .from(table)
    .upsert(records, { onConflict: 'id' })
    .select();

  if (error) return { count: 0, error: error.message };
  return { count: result?.length || 0, error: null };
}
