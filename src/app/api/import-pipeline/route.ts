import { NextRequest, NextResponse } from 'next/server';

/**
 * SVAAS Import Pipeline
 * Google Sheet → CSV Fetch → Transform → JSON → App
 * 
 * POST /api/import-pipeline
 * Body: { sheetUrl?: string } (optional — uses default SVAAS execution engine)
 * 
 * OR GET /api/import-pipeline (fetches and transforms directly)
 */

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Q1x_5pLKjAvcY_86WvHgwSiqrhnKNPjR/gviz/tq?tqx=out:csv&sheet=MASTER%20TASKS';

// Department → Stream mapping
const DEPT_TO_STREAM: Record<string, { id: string; slug: string }> = {
  'LEGAL': { id: 'stream-legal', slug: 'legal' },
  'COMPLIANCE': { id: 'stream-product', slug: 'product' },
  'PRODUCT': { id: 'stream-product', slug: 'product' },
  'TESTING': { id: 'stream-product', slug: 'product' },
  'SUPPLY CHAIN': { id: 'stream-product', slug: 'product' },
  'MANUFACTURING': { id: 'stream-product', slug: 'product' },
  'OPERATIONS': { id: 'stream-product', slug: 'product' },
  'PACKAGING': { id: 'stream-packaging', slug: 'packaging' },
  'BRAND': { id: 'stream-packaging', slug: 'packaging' },
  'MARKETING': { id: 'stream-social', slug: 'social' },
  'CUSTOMER': { id: 'stream-social', slug: 'social' },
  'SALES': { id: 'stream-social', slug: 'social' },
  'FINANCE': { id: 'stream-finance', slug: 'finance' },
  'FOUNDER': { id: 'stream-founder', slug: 'founder' },
  'OODLES': { id: 'stream-founder', slug: 'founder' },
  'PEOPLE': { id: 'stream-founder', slug: 'founder' },
  'STRATEGIC': { id: 'stream-founder', slug: 'founder' },
  'INNOVATION': { id: 'stream-founder', slug: 'founder' },
};

// Categories that override BRAND → digital
const DIGITAL_BRAND_CATEGORIES = ['Website', 'Email'];
const DIGITAL_MARKETING_CATEGORIES = ['SEO'];

function getStream(dept: string, category: string) {
  if (dept === 'BRAND' && DIGITAL_BRAND_CATEGORIES.includes(category)) {
    return { id: 'stream-digital', slug: 'digital' };
  }
  if (dept === 'MARKETING' && DIGITAL_MARKETING_CATEGORIES.includes(category)) {
    return { id: 'stream-digital', slug: 'digital' };
  }
  return DEPT_TO_STREAM[dept] || { id: 'stream-founder', slug: 'founder' };
}

function parseDayRange(dayStr: string): { start: number | null; end: number | null } {
  if (!dayStr || dayStr === '-' || dayStr === '""') return { start: null, end: null };
  const rangeMatch = dayStr.match(/Day\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (rangeMatch) return { start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) };
  const onwardsMatch = dayStr.match(/Day\s*(\d+)\s*onwards/i);
  if (onwardsMatch) return { start: parseInt(onwardsMatch[1]), end: null };
  const singleMatch = dayStr.match(/Day\s*(\d+)/i);
  if (singleMatch) return { start: parseInt(singleMatch[1]), end: parseInt(singleMatch[1]) };
  return { start: null, end: null }; // Monthly, Weekly, Quarterly, etc.
}

function parseCost(costStr: string): number {
  if (!costStr || costStr === '-' || costStr === '""' || costStr === '') return 0;
  const cleaned = costStr.replace(/Rs\.?/gi, '').replace(/,/g, '').replace(/"/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values.map(v => v.replace(/^"|"$/g, ''));
}

function transformCSVToTasks(csvText: string) {
  const lines = csvText.trim().split('\n');
  const tasks: any[] = [];
  let autoId = 1;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 13) continue;

    const [taskNum, dept, category, title, description, notes, priority, phase, days, costLow, costLikely, costHigh, owner] = values;
    if (!dept || !title) continue;

    const dayRange = parseDayRange(days);
    const stream = getStream(dept.trim(), category.trim());
    const taskNumber = taskNum && !isNaN(parseInt(taskNum)) ? parseInt(taskNum) : null;

    tasks.push({
      id: `t-${String(autoId).padStart(3, '0')}`,
      streamId: stream.id,
      streamSlug: stream.slug,
      taskNumber,
      department: dept.trim(),
      category: category.trim(),
      title: title.trim(),
      description: description.trim() || null,
      notesDependencies: notes.trim() || null,
      priority: priority.trim() || 'MEDIUM',
      phase: phase.trim() || 'P0',
      dayRangeStart: dayRange.start,
      dayRangeEnd: dayRange.end,
      costLow: parseCost(costLow),
      costLikely: parseCost(costLikely),
      costHigh: parseCost(costHigh),
      owner: owner.trim() || 'Founder',
      status: 'not_started',
      blockedReason: null,
      completedAt: null,
      // NO fabricated values:
      // leverageScore: NOT included (calculated at runtime)
      // downstreamCount: NOT included (requires dependency graph)
      // isOnCriticalPath: NOT included (requires dependency graph)
      // impactScore: NOT included (calculated from blocksTasks)
    });
    autoId++;
  }
  return tasks;
}

export async function GET() {
  try {
    // Fetch CSV from Google Sheets
    const response = await fetch(DEFAULT_SHEET_URL, { next: { revalidate: 0 } });
    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Sheet fetch failed: ${response.status}` }, { status: 500 });
    }
    const csvText = await response.text();
    const tasks = transformCSVToTasks(csvText);

    return NextResponse.json({
      success: true,
      taskCount: tasks.length,
      source: 'Google Sheets (MASTER TASKS)',
      fetchedAt: new Date().toISOString(),
      tasks,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sheetUrl = body.sheetUrl || DEFAULT_SHEET_URL;

    const response = await fetch(sheetUrl, { next: { revalidate: 0 } });
    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Sheet fetch failed: ${response.status}` }, { status: 500 });
    }
    const csvText = await response.text();
    const tasks = transformCSVToTasks(csvText);

    return NextResponse.json({
      success: true,
      taskCount: tasks.length,
      source: sheetUrl,
      fetchedAt: new Date().toISOString(),
      tasks,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
