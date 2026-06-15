'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state-provider';
import Link from 'next/link';

export default function AdminPage() {
  const { state } = useAppState();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importedTasks, setImportedTasks] = useState<any[] | null>(null);

  async function runImportPipeline() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/import-pipeline');
      const data = await res.json();
      if (data.success) {
        setImportResult(`✓ Fetched ${data.taskCount} tasks from Google Sheets at ${data.fetchedAt}`);
        setImportedTasks(data.tasks);
      } else {
        setImportResult(`✗ ${data.error}`);
      }
    } catch (err) {
      setImportResult(`✗ Error: ${String(err)}`);
    }
    setImporting(false);
  }

  function loadIntoApp() {
    if (!importedTasks) return;
    // Replace tasks in localStorage state
    const newState = {
      ...state,
      tasks: importedTasks,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('svaas-os-state', JSON.stringify(newState));
    setImportResult(`✓ Loaded ${importedTasks.length} tasks into app. Refresh page to see updated data.`);
    setImportedTasks(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Admin — Import Pipeline</h1>
        <p className="text-sm text-zinc-500">Google Sheet → CSV → Transform → App</p>
      </header>

      {/* Pipeline Status */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">Current Data</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="border border-zinc-800 rounded p-2">
            <div className="text-lg font-bold text-zinc-100">{state.tasks.length}</div>
            <div className="text-xs text-zinc-500">Tasks loaded</div>
          </div>
          <div className="border border-zinc-800 rounded p-2">
            <div className="text-lg font-bold text-zinc-100">{state.decisions.length}</div>
            <div className="text-xs text-zinc-500">Decisions</div>
          </div>
          <div className="border border-zinc-800 rounded p-2">
            <div className="text-lg font-bold text-zinc-100">{state.milestones.length}</div>
            <div className="text-xs text-zinc-500">Milestones</div>
          </div>
        </div>
      </div>

      {/* Import Pipeline */}
      <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-emerald-400">Import from Google Sheets</h3>
        <p className="text-xs text-zinc-500">
          Pipeline: SVAAS Execution Engine → Fetch CSV → Parse 247 tasks → Transform → Load
        </p>
        <div className="space-y-2">
          <button
            onClick={runImportPipeline}
            disabled={importing}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
          >
            {importing ? 'Fetching from Google Sheets...' : 'Step 1: Fetch & Transform (247 tasks)'}
          </button>

          {importedTasks && (
            <button
              onClick={loadIntoApp}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium transition-colors"
            >
              Step 2: Load {importedTasks.length} tasks into app
            </button>
          )}
        </div>

        {importResult && (
          <div className={`p-3 rounded text-sm ${importResult.startsWith('✓') ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-950/30 text-red-400 border border-red-900/50'}`}>
            {importResult}
          </div>
        )}
      </div>

      {/* Import Preview */}
      {importedTasks && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Preview (first 10 tasks)</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {importedTasks.slice(0, 10).map((t: any, i: number) => (
              <div key={i} className="border border-zinc-800 rounded p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-200 font-medium">{t.taskNumber ? `#${t.taskNumber}` : '—'} {t.title}</span>
                  <span className="text-zinc-500">{t.priority}</span>
                </div>
                <div className="text-zinc-500 mt-0.5">
                  {t.department} / {t.category} / {t.phase} / {t.owner} / Day {t.dayRangeStart || '?'}-{t.dayRangeEnd || '?'}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">...and {importedTasks.length - 10} more</p>
        </div>
      )}

      {/* Venture Settings */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">Venture Settings</h3>
        <p className="text-xs text-zinc-500">Currently in venture-config.ts. Will be admin-editable via Supabase.</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Name</span>
            <span className="text-zinc-200">{state.streams.length > 0 ? 'SVAAS' : 'Not configured'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Start Date</span>
            <span className="text-zinc-200">June 1, 2026</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Target Days</span>
            <span className="text-zinc-200">180</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Dream Protection Target</span>
            <span className="text-zinc-200">5 days/week</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Phase</span>
            <span className="text-zinc-200">P0</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/trust" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Trust Report</Link>
        <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Venture Radar</Link>
      </nav>
    </div>
  );
}
