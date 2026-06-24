import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SVAAS_VENTURE_ID } from '@/lib/supabase/sync';

/**
 * POST /api/sync/bulk
 *
 * One-time bulk export of all localStorage data to Supabase.
 * Body: { tasks: [...], decisions: [...], milestones: [...], waiting_on: [...], streams: [...], stream_deps: [...] }
 *
 * Creates the default SVAAS venture if it does not exist, then upserts all entities.
 * Uses the service role key to bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { tasks, decisions, milestones, waiting_on, streams, stream_deps } = body;

    const counts: Record<string, number> = {};

    // Ensure the default SVAAS venture exists
    const { error: ventureError } = await supabase
      .from('ventures')
      .upsert({
        id: SVAAS_VENTURE_ID,
        name: 'SVAAS',
        slug: 'svaas',
        description: 'SVAAS Venture - Founder OS',
        launch_start_date: '2026-06-01',
        launch_target_days: 180,
        current_phase: 'P0',
        status: 'active',
      }, { onConflict: 'id' });

    if (ventureError) {
      console.error('[Bulk Sync] Venture upsert error:', ventureError.message);
      return NextResponse.json(
        { error: `Failed to create venture: ${ventureError.message}` },
        { status: 500 }
      );
    }

    // Upsert streams first (tasks reference stream_id)
    if (streams && streams.length > 0) {
      const { error, count } = await supabase
        .from('venture_streams')
        .upsert(streams, { onConflict: 'id', count: 'exact' });
      if (error) {
        console.error('[Bulk Sync] Streams error:', error.message);
      }
      counts.streams = count || streams.length;
    }

    // Upsert stream dependencies
    if (stream_deps && stream_deps.length > 0) {
      const { error, count } = await supabase
        .from('stream_dependencies')
        .upsert(stream_deps, { onConflict: 'id', count: 'exact' });
      if (error) {
        console.error('[Bulk Sync] Stream deps error:', error.message);
      }
      counts.stream_deps = count || stream_deps.length;
    }

    // Upsert tasks (in batches of 100 to avoid payload limits)
    if (tasks && tasks.length > 0) {
      let taskCount = 0;
      for (let i = 0; i < tasks.length; i += 100) {
        const batch = tasks.slice(i, i + 100);
        const { error, count } = await supabase
          .from('tasks')
          .upsert(batch, { onConflict: 'id', count: 'exact' });
        if (error) {
          console.error(`[Bulk Sync] Tasks batch ${i} error:`, error.message);
        }
        taskCount += count || batch.length;
      }
      counts.tasks = taskCount;
    }

    // Upsert decisions
    if (decisions && decisions.length > 0) {
      const { error, count } = await supabase
        .from('decisions')
        .upsert(decisions, { onConflict: 'id', count: 'exact' });
      if (error) {
        console.error('[Bulk Sync] Decisions error:', error.message);
      }
      counts.decisions = count || decisions.length;
    }

    // Upsert milestones
    if (milestones && milestones.length > 0) {
      const { error, count } = await supabase
        .from('milestones')
        .upsert(milestones, { onConflict: 'id', count: 'exact' });
      if (error) {
        console.error('[Bulk Sync] Milestones error:', error.message);
      }
      counts.milestones = count || milestones.length;
    }

    // Upsert waiting_on
    if (waiting_on && waiting_on.length > 0) {
      const { error, count } = await supabase
        .from('waiting_on')
        .upsert(waiting_on, { onConflict: 'id', count: 'exact' });
      if (error) {
        console.error('[Bulk Sync] Waiting on error:', error.message);
      }
      counts.waiting_on = count || waiting_on.length;
    }

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    console.error('[Bulk Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
