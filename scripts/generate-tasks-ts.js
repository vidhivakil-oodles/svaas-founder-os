const fs = require('fs');
const csv = fs.readFileSync('./scripts/source-data.csv', 'utf8');

const DEPT_TO_STREAM = {
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

function parseCSVLine(line) {
  const values = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else current += c;
  }
  values.push(current.trim());
  return values.map(v => v.replace(/^"|"$/g, ''));
}

function parseDayRange(d) {
  if (!d || d === '-') return { start: null, end: null };
  const m = d.match(/Day\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };
  const m2 = d.match(/Day\s*(\d+)\s*onwards/i);
  if (m2) return { start: parseInt(m2[1]), end: null };
  const m3 = d.match(/Day\s*(\d+)/i);
  if (m3) return { start: parseInt(m3[1]), end: parseInt(m3[1]) };
  return { start: null, end: null };
}

function parseCost(c) {
  if (!c || c === '-') return 0;
  const n = parseInt(c.replace(/Rs\.?/gi, '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '); }

const lines = csv.trim().split('\n');
let output = `import { Task } from '@/types';\n\n`;
output += `// ============================================================\n`;
output += `// SVAAS Execution Engine — Full Dataset (358 tasks)\n`;
output += `// Source: Google Sheets MASTER TASKS tab\n`;
output += `// Generated: ${new Date().toISOString()}\n`;
output += `// Pipeline: Google Sheet → CSV → Transform → TypeScript\n`;
output += `// NO fabricated values. NO manual scores.\n`;
output += `// ============================================================\n\n`;
output += `export const TASKS: Task[] = [\n`;

let id = 1;
for (let i = 1; i < lines.length; i++) {
  const v = parseCSVLine(lines[i]);
  if (v.length < 13 || !v[1] || !v[3]) continue;
  const dept = v[1].trim();
  const cat = v[2].trim();
  let stream = DEPT_TO_STREAM[dept] || { id: 'stream-founder', slug: 'founder' };
  if (dept === 'BRAND' && ['Website','Email'].includes(cat)) stream = { id: 'stream-digital', slug: 'digital' };
  if (dept === 'MARKETING' && cat === 'SEO') stream = { id: 'stream-digital', slug: 'digital' };
  const dr = parseDayRange(v[8]);
  const tn = v[0].trim() && !isNaN(parseInt(v[0])) ? parseInt(v[0]) : null;
  
  output += `  { id: 't-${String(id).padStart(3,'0')}', streamId: '${stream.id}', streamSlug: '${stream.slug}', taskNumber: ${tn}, department: '${esc(dept)}', category: '${esc(cat)}', title: '${esc(v[3].trim())}', description: ${v[4].trim() ? `'${esc(v[4].trim())}'` : 'null'}, notesDependencies: ${v[5].trim() ? `'${esc(v[5].trim())}'` : 'null'}, priority: '${v[6].trim()||'MEDIUM'}', phase: '${v[7].trim()||'P0'}', dayRangeStart: ${dr.start}, dayRangeEnd: ${dr.end}, costLow: ${parseCost(v[9])}, costLikely: ${parseCost(v[10])}, costHigh: ${parseCost(v[11])}, owner: '${esc(v[12].trim()||'Founder')}', status: 'not_started', blockedReason: null, completedAt: null },\n`;
  id++;
}

output += `];\n\n`;
output += `export const WAITING_ON: any[] = [];\n`;

fs.writeFileSync('./src/lib/data/tasks.ts', output);
console.log('Generated src/lib/data/tasks.ts with', id-1, 'tasks');
