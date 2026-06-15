/**
 * Parse the SVAAS Execution Engine CSV into a TypeScript tasks data file.
 * Run: node scripts/parse-tasks.js > src/lib/data/tasks-generated.ts
 */

const csv = require('fs').readFileSync('/projects/sandbox/svaas-os/scripts/master-tasks.csv', 'utf8');

// Department → Stream mapping
const DEPT_TO_STREAM = {
  'LEGAL': { id: 'stream-legal', slug: 'legal' },
  'COMPLIANCE': { id: 'stream-product', slug: 'product' },
  'PRODUCT': { id: 'stream-product', slug: 'product' },
  'TESTING': { id: 'stream-product', slug: 'product' },
  'SUPPLY CHAIN': { id: 'stream-product', slug: 'product' },
  'MANUFACTURING': { id: 'stream-product', slug: 'product' },
  'PACKAGING': { id: 'stream-packaging', slug: 'packaging' },
  'BRAND': { id: 'stream-packaging', slug: 'packaging' },
  'MARKETING': { id: 'stream-social', slug: 'social' },
  'CUSTOMER': { id: 'stream-social', slug: 'social' },
  'SALES': { id: 'stream-social', slug: 'social' },
  'OPERATIONS': { id: 'stream-product', slug: 'product' },
  'FINANCE': { id: 'stream-finance', slug: 'finance' },
  'FOUNDER': { id: 'stream-founder', slug: 'founder' },
  'OODLES': { id: 'stream-founder', slug: 'founder' },
  'PEOPLE': { id: 'stream-founder', slug: 'founder' },
  'STRATEGIC': { id: 'stream-founder', slug: 'founder' },
  'INNOVATION': { id: 'stream-founder', slug: 'founder' },
};

// Special overrides for BRAND tasks that should go to digital stream
const DIGITAL_CATEGORIES = ['Website', 'Email'];
// MARKETING tasks that should go to digital stream
const DIGITAL_MARKETING_CATEGORIES = ['SEO'];

function parseDayRange(dayStr) {
  if (!dayStr || dayStr === '-') return { start: null, end: null };
  
  // "Day 1-7" → {start: 1, end: 7}
  const match = dayStr.match(/Day\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (match) return { start: parseInt(match[1]), end: parseInt(match[2]) };
  
  // "Day 90 onwards" → {start: 90, end: null}
  const onwardsMatch = dayStr.match(/Day\s*(\d+)\s*onwards/i);
  if (onwardsMatch) return { start: parseInt(onwardsMatch[1]), end: null };
  
  // "Day 365" → {start: 365, end: 365}
  const singleMatch = dayStr.match(/Day\s*(\d+)/i);
  if (singleMatch) return { start: parseInt(singleMatch[1]), end: parseInt(singleMatch[1]) };
  
  // "Monthly", "Weekly", "Quarterly", "Annually", etc → recurring
  return { start: null, end: null };
}

function parseCost(costStr) {
  if (!costStr || costStr === '-' || costStr === '""') return 0;
  // Remove "Rs.", "Rs", commas, quotes, spaces
  const cleaned = costStr.replace(/Rs\.?/gi, '').replace(/,/g, '').replace(/"/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
}

function getStreamForTask(dept, category) {
  // Special overrides
  if (dept === 'BRAND' && DIGITAL_CATEGORIES.includes(category)) {
    return { id: 'stream-digital', slug: 'digital' };
  }
  if (dept === 'MARKETING' && DIGITAL_MARKETING_CATEGORIES.includes(category)) {
    return { id: 'stream-digital', slug: 'digital' };
  }
  // Marketing Pre-launch, Soft Launch, Public Launch → social
  // Marketing Exhibition, Influencer, Content, Community → social
  // Operations Fulfilment, Post-launch → product (pre-launch ops)
  
  return DEPT_TO_STREAM[dept] || { id: 'stream-founder', slug: 'founder' };
}

// Parse CSV
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

const lines = csv.trim().split('\n');
const tasks = [];
let autoId = 1;

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  if (values.length < 13) continue;
  
  const [taskNum, dept, category, title, description, notes, priority, phase, days, costLow, costLikely, costHigh, owner] = values;
  
  if (!dept || !title) continue;
  
  const dayRange = parseDayRange(days);
  const stream = getStreamForTask(dept.trim(), category.trim());
  const taskNumber = taskNum && taskNum.trim() && !isNaN(parseInt(taskNum)) ? parseInt(taskNum) : null;
  
  tasks.push({
    id: `t-${String(autoId).padStart(3, '0')}`,
    streamId: stream.id,
    streamSlug: stream.slug,
    taskNumber: taskNumber,
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
  });
  
  autoId++;
}

// Generate TypeScript
console.log(`import { Task } from '@/types';

// ============================================================
// SVAAS Execution Engine — Full Dataset (${tasks.length} tasks)
// Imported from Claude's Master Execution Engine spreadsheet
// All tasks start as not_started — no fabricated completion dates
// No manually assigned leverage/impact/downstream values
// ============================================================

export const TASKS: Task[] = ${JSON.stringify(tasks, null, 2)};

// Waiting-on items (empty — will be populated as founder identifies external dependencies)
export const WAITING_ON: any[] = [];
`);
