import { NextRequest, NextResponse } from 'next/server';
import {
  importTasks,
  importDecisions,
  importMilestones,
  importStreams,
  importStreamDependencies,
  importWaitingOn,
} from '@/lib/store';

/**
 * POST /api/import
 * 
 * Accepts JSON body with shape:
 * {
 *   type: 'tasks' | 'decisions' | 'milestones' | 'streams' | 'dependencies' | 'waiting_on',
 *   data: [...array of objects...]
 * }
 * 
 * Also accepts CSV via query param ?format=csv&type=tasks
 * with raw CSV body (parsed server-side)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const dataType = url.searchParams.get('type');

    if (format === 'csv' && dataType) {
      // CSV import
      const csvText = await request.text();
      const records = parseCSV(csvText);

      const count = routeImport(dataType, records);
      return NextResponse.json({ success: true, imported: count, type: dataType, format: 'csv' });
    }

    // JSON import
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Body must contain { type, data: [...] }' },
        { status: 400 }
      );
    }

    const count = routeImport(type, data);
    return NextResponse.json({ success: true, imported: count, type, format: 'json' });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

function routeImport(type: string, data: any[]): number {
  switch (type) {
    case 'tasks': return importTasks(data);
    case 'decisions': return importDecisions(data);
    case 'milestones': return importMilestones(data);
    case 'streams': return importStreams(data);
    case 'dependencies': return importStreamDependencies(data);
    case 'waiting_on': return importWaitingOn(data);
    default: throw new Error(`Unknown import type: ${type}`);
  }
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: any = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}
