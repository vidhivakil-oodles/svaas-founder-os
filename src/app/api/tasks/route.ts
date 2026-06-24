import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SVAAS_VENTURE_ID } from '@/lib/supabase/sync';

/**
 * GET /api/tasks
 *
 * Returns all tasks from Supabase for the Sankalp bridge.
 * Requires X-API-Key header matching TATTVA_API_KEY env var.
 *
 * Optional query params:
 * - status: filter by task status
 * - priority: filter by priority (CRITICAL, HIGH, MEDIUM, LOW)
 * - department: filter by department
 * - stream: filter by stream slug
 *
 * Response fields per task:
 * id, title, description, status, priority, department, category, phase, stream_name, stream_slug,
 * owner, blocked_reason, completed_at, waiting_on_person, waiting_on_date, deferred_reason,
 * deferred_review_date, day_range_start, day_range_end, created_at
 */
export async function GET(request: NextRequest) {
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
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const priorityFilter = url.searchParams.get('priority');
    const departmentFilter = url.searchParams.get('department');
    const streamFilter = url.searchParams.get('stream');

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('venture_id', SVAAS_VENTURE_ID);

    if (statusFilter) query = query.eq('status', statusFilter);
    if (priorityFilter) query = query.eq('priority', priorityFilter);
    if (departmentFilter) query = query.eq('department', departmentFilter);
    if (streamFilter) query = query.eq('stream_slug', streamFilter);

    const { data, error } = await query.order('task_number', { ascending: true });

    if (error) {
      console.error('[API /tasks] Query error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Map to the format expected by Sankalp
    const tasks = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      department: row.department,
      category: row.category,
      phase: row.phase,
      stream_name: row.stream_slug || null,
      stream_slug: row.stream_slug || null,
      owner: row.owner,
      blocked_reason: row.blocked_reason,
      completed_at: row.completed_at,
      waiting_on_person: row.waiting_on_person,
      waiting_on_date: row.waiting_on_date,
      waiting_on_notes: row.waiting_on_notes,
      deferred_reason: row.deferred_reason,
      deferred_review_date: row.deferred_review_date,
      day_range_start: row.day_range_start,
      day_range_end: row.day_range_end,
      cost_low: row.cost_low,
      cost_likely: row.cost_likely,
      cost_high: row.cost_high,
      notes_dependencies: row.notes_dependencies,
      source: row.source,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('[API /tasks] Unexpected error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
