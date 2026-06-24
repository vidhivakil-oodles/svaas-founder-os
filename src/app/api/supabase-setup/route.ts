import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SVAAS_VENTURE_ID } from '@/lib/supabase/sync';

/**
 * POST /api/supabase-setup
 *
 * One-time setup route that:
 * 1. Creates the default SVAAS venture record
 * 2. Verifies connectivity to Supabase
 *
 * NOTE: The full schema (tables, indexes, RLS policies) must be applied
 * via the Supabase Dashboard SQL Editor using supabase/schema.sql.
 * This route handles only what can be done via the PostgREST API.
 *
 * Requires X-API-Key header.
 */
export async function POST(request: NextRequest) {
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
      { error: 'Supabase not configured. Check SUPABASE_SERVICE_ROLE_KEY env var.' },
      { status: 503 }
    );
  }

  const results: Record<string, string> = {};

  try {
    // Step 1: Create default SVAAS venture
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
      results.venture = `ERROR: ${ventureError.message}`;
      // If tables do not exist yet, provide guidance
      if (ventureError.message.includes('does not exist') || ventureError.code === '42P01') {
        return NextResponse.json({
          error: 'Tables do not exist yet. Please apply the schema first.',
          instructions: [
            '1. Open Supabase Dashboard > SQL Editor',
            '2. Paste the contents of supabase/schema.sql',
            '3. Add these additional ALTER statements for extended task statuses:',
            "   ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;",
            "   ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('not_started', 'committed_today', 'in_progress', 'waiting_on', 'blocked', 'deferred', 'done', 'cancelled'));",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stream_slug TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_on_person TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_on_date TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_on_notes TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deferred_reason TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deferred_review_date TEXT;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;",
            "   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'imported';",
            "   ALTER TABLE ventures DROP CONSTRAINT IF EXISTS ventures_owner_id_slug_key;",
            "   ALTER TABLE ventures ALTER COLUMN owner_id DROP NOT NULL;",
            '4. Run this setup route again after applying the schema.',
          ],
        }, { status: 424 });
      }
    } else {
      results.venture = 'OK - SVAAS venture created/verified';
    }

    // Step 2: Verify tables exist by attempting a count
    const tables = ['tasks', 'decisions', 'milestones', 'waiting_on', 'venture_streams'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        results[table] = `ERROR: ${error.message}`;
      } else {
        results[table] = `OK (${count} rows)`;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Setup complete. Supabase connectivity verified.',
      results,
      next_steps: [
        'If tables show 0 rows, call POST /api/sync/bulk to import data from localStorage.',
        'The state-provider will automatically sync changes going forward.',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
