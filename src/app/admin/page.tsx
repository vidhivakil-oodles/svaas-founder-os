'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [importType, setImportType] = useState('tasks');
  const [jsonInput, setJsonInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJsonImport() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, data: JSON.parse(jsonInput) }),
      });
      const data = await response.json();
      setResult(data.success ? `✓ Imported ${data.imported} ${data.type} records` : `✗ ${data.error}`);
    } catch (err) {
      setResult(`✗ Error: ${String(err)}`);
    }
    setLoading(false);
  }

  async function handleCsvImport(file: File) {
    setLoading(true);
    setResult(null);
    try {
      const csvText = await file.text();
      const response = await fetch(`/api/import?format=csv&type=${importType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText,
      });
      const data = await response.json();
      setResult(data.success ? `✓ Imported ${data.imported} ${data.type} records from CSV` : `✗ ${data.error}`);
    } catch (err) {
      setResult(`✗ Error: ${String(err)}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Admin — Data Import</h1>
        <p className="text-sm text-zinc-500">Import or update venture data without code changes.</p>
      </header>

      {/* Import Type Selection */}
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Data Type</label>
        <select
          value={importType}
          onChange={e => setImportType(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm"
        >
          <option value="tasks">Tasks (Execution Engine)</option>
          <option value="decisions">Decisions</option>
          <option value="milestones">Milestones</option>
          <option value="streams">Venture Streams</option>
          <option value="dependencies">Stream Dependencies</option>
          <option value="waiting_on">Waiting On</option>
        </select>
      </div>

      {/* CSV Upload */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">CSV Import</h3>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleCsvImport(file);
          }}
          className="text-sm text-zinc-400"
        />
        <p className="text-xs text-zinc-600">Upload a CSV file. First row must be headers.</p>
      </div>

      {/* JSON Import */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">JSON Import</h3>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          rows={10}
          placeholder='[{"id": "t-1", "title": "Task name", "status": "not_started", ...}]'
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm font-mono resize-y"
        />
        <button
          onClick={handleJsonImport}
          disabled={loading || !jsonInput.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-md font-medium"
        >
          {loading ? 'Importing...' : `Import ${importType}`}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-md text-sm ${result.startsWith('✓') ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-950/30 text-red-400 border border-red-900/50'}`}>
          {result}
        </div>
      )}

      {/* Schema Reference */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">Data Schema Reference</h3>
        <div className="text-xs text-zinc-500 space-y-2 font-mono">
          <details>
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Tasks</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
{`{
  id, streamId, streamSlug, taskNumber, department,
  category, title, description, notesDependencies,
  priority (CRITICAL|HIGH|MEDIUM|LOW),
  phase (P0-P8|ONGOING), dayRangeStart, dayRangeEnd,
  costLow, costLikely, costHigh, owner,
  status (not_started|in_progress|done|blocked|deferred),
  blockedReason, completedAt
}`}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Decisions</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
{`{
  id, title, context, options: [{label, description}],
  defaultOption, defaultRationale, deadline,
  status (pending|decided|defaulted|deferred),
  decisionMade, rationale, decidedAt, deferCount,
  maxDeferrals, blocksTasks: [taskId...],
  impactScore, streamsAffected, tasksAffected,
  estimatedDelayDays, cascadeDepth
}`}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Milestones</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
{`{
  id, title, dayTarget, phase,
  gateCriteria: [{description, met: boolean}],
  status (upcoming|current|at_risk|achieved|missed),
  achievedAt
}`}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Venture Streams</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
{`{
  id, name, slug, displayOrder,
  status (green|yellow|red|grey),
  currentBottleneck, waitingOn, nextMilestone,
  lastMovementAt, momentumScore, departments: [...]
}`}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Stream Dependencies</summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-x-auto">
{`{
  id, upstreamStreamId, downstreamStreamId,
  upstreamSlug, downstreamSlug,
  upstreamName, downstreamName,
  dependencyType (hard_block|soft_block|enables),
  reason, strength
}`}
            </pre>
          </details>
        </div>
      </div>

      {/* Editable Values Notice */}
      <div className="border border-amber-900/30 bg-amber-950/10 rounded-lg p-4">
        <h3 className="text-sm font-medium text-amber-400 mb-2">Editable Without Code Changes</h3>
        <ul className="text-xs text-zinc-400 space-y-1">
          <li>• MRP → Update in relevant Decision record</li>
          <li>• Ingredient Count → Update task descriptions</li>
          <li>• QP Status → Mark task done or update status</li>
          <li>• Entity Name → Update in Decision record</li>
          <li>• Launch Date → Update venture settings</li>
          <li>• Stream definitions → Re-import streams</li>
          <li>• Milestones & gate criteria → Re-import milestones</li>
          <li>• Dependencies → Re-import stream dependencies</li>
          <li>• All task data → Bulk import via CSV/JSON</li>
        </ul>
      </div>
    </div>
  );
}
