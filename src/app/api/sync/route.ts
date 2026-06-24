import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/sync
 *
 * Accepts a single entity upsert for real-time write-through.
 * Body: { type: 'task' | 'decision' | 'milestone' | 'waiting_on' | 'stream' | 'stream_dep', data: {...} }
 *
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
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Body must contain { type, data }' },
        { status: 400 }
      );
    }

    const tableMap: Record<string, string> = {
      task: 'tasks',
      decision: 'decisions',
      milestone: 'milestones',
      waiting_on: 'waiting_on',
      stream: 'venture_streams',
      stream_dep: 'stream_dependencies',
    };

    const table = tableMap[type];
    if (!table) {
      return NextResponse.json(
        { error: `Unknown entity type: ${type}` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from(table)
      .upsert(data, { onConflict: 'id' });

    if (error) {
      console.error(`[Sync] Error upserting to ${table}:`, error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('[Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
