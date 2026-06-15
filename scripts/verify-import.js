const fs = require('fs');
const csv = fs.readFileSync('./scripts/source-data.csv', 'utf8');

const DEPT_TO_STREAM = {
  'LEGAL': 'legal', 'COMPLIANCE': 'product', 'PRODUCT': 'product',
  'TESTING': 'product', 'SUPPLY CHAIN': 'product', 'MANUFACTURING': 'product',
  'OPERATIONS': 'product', 'PACKAGING': 'packaging', 'BRAND': 'packaging',
  'MARKETING': 'social', 'CUSTOMER': 'social', 'SALES': 'social',
  'FINANCE': 'finance', 'FOUNDER': 'founder', 'OODLES': 'founder',
  'PEOPLE': 'founder', 'STRATEGIC': 'founder', 'INNOVATION': 'founder',
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
  if (!d || d === '-') return [null, null];
  const m = d.match(/Day\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const m2 = d.match(/Day\s*(\d+)\s*onwards/i);
  if (m2) return [parseInt(m2[1]), null];
  const m3 = d.match(/Day\s*(\d+)/i);
  if (m3) return [parseInt(m3[1]), parseInt(m3[1])];
  return [null, null];
}

function parseCost(c) {
  if (!c || c === '-') return 0;
  const n = parseInt(c.replace(/Rs\.?/gi, '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

const lines = csv.trim().split('\n');
const tasks = [];
let id = 1;
const depts = {}; const phases = {}; const streams = {}; const priorities = {};
const errors = [];

for (let i = 1; i < lines.length; i++) {
  const v = parseCSVLine(lines[i]);
  if (v.length < 13) { if (v.join('').trim()) errors.push(`Row ${i}: insufficient columns (${v.length})`); continue; }
  const dept = v[1].trim();
  const cat = v[2].trim();
  const title = v[3].trim();
  if (!dept || !title) { errors.push(`Row ${i}: missing dept or title`); continue; }
  const priority = v[6].trim() || 'MEDIUM';
  const phase = v[7].trim() || 'P0';
  const owner = v[12].trim() || 'Founder';
  
  let stream = DEPT_TO_STREAM[dept] || 'founder';
  if (dept === 'BRAND' && ['Website','Email'].includes(cat)) stream = 'digital';
  if (dept === 'MARKETING' && cat === 'SEO') stream = 'digital';
  
  const [dayStart, dayEnd] = parseDayRange(v[8]);
  
  tasks.push({ id: 't-' + String(id).padStart(3,'0'), dept, cat, title, priority, phase, owner, stream, dayStart, dayEnd });
  depts[dept] = (depts[dept]||0) + 1;
  phases[phase] = (phases[phase]||0) + 1;
  streams[stream] = (streams[stream]||0) + 1;
  priorities[priority] = (priorities[priority]||0) + 1;
  id++;
}

console.log('=== DATA INTEGRITY REPORT ===');
console.log('');
console.log('SOURCE: Google Sheets MASTER TASKS');
console.log('ROWS IN CSV:', lines.length - 1);
console.log('TASKS IMPORTED:', tasks.length);
console.log('ROWS SKIPPED:', (lines.length - 1) - tasks.length);
console.log('PARSING ERRORS:', errors.length);
if (errors.length > 0) errors.forEach(e => console.log('  ' + e));
console.log('');
console.log('BY DEPARTMENT:');
Object.entries(depts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(20)+v));
console.log('  TOTAL'.padEnd(20) + Object.values(depts).reduce((a,b)=>a+b,0));
console.log('');
console.log('BY PHASE:');
Object.entries(phases).sort((a,b)=> {
  const order = ['P0','P1','P2','P3','P4','P5','P6','P7','P8','ONGOING'];
  return order.indexOf(a[0]) - order.indexOf(b[0]);
}).forEach(([k,v])=>console.log('  '+k.padEnd(12)+v));
console.log('');
console.log('BY STREAM (app mapping):');
Object.entries(streams).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(12)+v));
console.log('');
console.log('BY PRIORITY:');
Object.entries(priorities).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(12)+v));
console.log('');
const recurring = tasks.filter(t => t.dayStart === null);
console.log('RECURRING/ONGOING (no day range):', recurring.length);
console.log('WITH DAY RANGE:', tasks.length - recurring.length);
