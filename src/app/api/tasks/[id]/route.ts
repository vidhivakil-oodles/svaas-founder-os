import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SVAAS_VENTURE_ID } from '@/lib/supabase/sync';

/**
 * GET /api/tasks/[id]
 *
 * Returns a single task by ID from Supabase.
 * Requires X-API-Key header matching TATTVA_API_KEY env var.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // API key authentication
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.TATTVA_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid X-API-Key header.' },
      { status: 401 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured on server' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('venture_id', SVAAS_VENTURE_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('[API /tasks/[id]] Query error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Map to Sankalp format
    const task = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      department: data.department,
      category: data.category,
      phase: data.phase,
      stream_name: data.stream_slug || null,
      stream_slug: data.stream_slug || null,
      owner: data.owner,
      blocked_reason: data.blocked_reason,
      completed_at: data.completed_at,
      waiting_on_person: data.waiting_on_person,
      waiting_on_date: data.waiting_on_date,
      waiting_on_notes: data.waiting_on_notes,
      deferred_reason: data.deferred_reason,
      deferred_review_date: data.deferred_review_date,
      day_range_start: data.day_range_start,
      day_range_end: data.day_range_end,
      cost_low: data.cost_low,
      cost_likely: data.cost_likely,
      cost_high: data.cost_high,
      notes_dependencies: data.notes_dependencies,
      source: data.source,
      created_at: data.created_at,
    };

    return NextResponse.json({ task });
  } catch (error) {
    console.error('[API /tasks/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
