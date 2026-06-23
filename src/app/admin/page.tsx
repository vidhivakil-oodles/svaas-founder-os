'use client';

import { useState, useEffect } from 'react';
import { useAppState } from '@/lib/state-provider';
import { clearState, DATA_VERSION, getStorageSize } from '@/lib/persistence';
import { getDayNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';

export default function AdminPage() {
  const { state } = useAppState();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importedTasks, setImportedTasks] = useState<any[] | null>(null);
  const [storageSize, setStorageSize] = useState(0);

  useEffect(() => {
    setStorageSize(getStorageSize());
  }, [state]);

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
    const newState = {
      ...state,
      tasks: importedTasks,
      dataVersion: DATA_VERSION,
      dataSource: 'imported' as const,
      lastImportDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('svaas-os-state', JSON.stringify(newState));
    setImportResult(`✓ Loaded ${importedTasks.length} tasks. Refresh page to see updated data.`);
    setImportedTasks(null);
  }

  function resetData() {
    if (confirm('This will clear ALL app data and reload from source files (358 tasks). Continue?')) {
      clearState();
      window.location.reload();
    }
  }

  // Verify no task has activity before June 1, 2026
  const ventureStart = new Date(VENTURE_CONFIG.launchStartDate);
  const tasksWithPreStartActivity = state.tasks.filter(t => 
    t.completedAt && new Date(t.completedAt) < ventureStart
  );
  const streamsWithPreStartActivity = state.streams.filter(s =>
    s.lastMovementAt && new Date(s.lastMovementAt) < ventureStart
  );

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Admin</h1>
      </header>

      {/* Data Status Display */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">Data Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-zinc-800 rounded p-2 text-center">
            <div className="text-lg font-bold text-zinc-100">v{state.dataVersion || '?'}</div>
            <div className="text-xs text-zinc-500">Data Version</div>
          </div>
          <div className="border border-zinc-800 rounded p-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{state.tasks.length}</div>
            <div className="text-xs text-zinc-500">Tasks</div>
          </div>
          <div className="border border-zinc-800 rounded p-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{state.lastImportDate ? new Date(state.lastImportDate).toLocaleDateString() : '—'}</div>
            <div className="text-xs text-zinc-500">Last Import</div>
          </div>
          <div className="border border-zinc-800 rounded p-2 text-center">
            <div className="text-lg font-bold text-zinc-100 capitalize">{state.dataSource || 'seed'}</div>
            <div className="text-xs text-zinc-500">Source</div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-zinc-400">Debug Panel</h3>
        <div className="grid grid-cols-1 gap-1 text-sm font-mono">
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Total Tasks</span>
            <span className={`${state.tasks.length === 358 ? 'text-emerald-400' : 'text-red-400'}`}>{state.tasks.length} {state.tasks.length === 358 ? '✓' : '⚠ expected 358'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Total Decisions</span>
            <span className="text-zinc-200">{state.decisions.length}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Total Milestones</span>
            <span className="text-zinc-200">{state.milestones.length}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">localStorage Size</span>
            <span className="text-zinc-200">{(storageSize / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Venture Start Date</span>
            <span className="text-zinc-200">{VENTURE_CONFIG.launchStartDate}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Current Day Number</span>
            <span className="text-zinc-200">Day {getDayNumber()} (June 1 = Day 0, exclusive counting)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">DATA_VERSION (code)</span>
            <span className="text-zinc-200">{DATA_VERSION}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">dataVersion (stored)</span>
            <span className={`${state.dataVersion === DATA_VERSION ? 'text-emerald-400' : 'text-red-400'}`}>{state.dataVersion || 'MISSING'} {state.dataVersion === DATA_VERSION ? '✓ match' : '⚠ MISMATCH'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Tasks with pre-start activity</span>
            <span className={`${tasksWithPreStartActivity.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tasksWithPreStartActivity.length} {tasksWithPreStartActivity.length === 0 ? '✓ none' : '⚠ INVALID'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Streams with pre-start dates</span>
            <span className={`${streamsWithPreStartActivity.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{streamsWithPreStartActivity.length} {streamsWithPreStartActivity.length === 0 ? '✓ none' : '⚠ STALE'}</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-red-400">Reset Tattva Data</h3>
        <p className="text-xs text-zinc-500">Clears localStorage and reloads all data from source files (358 tasks, corrected dates). Use this if you see stale/impossible dates.</p>
        <button
          onClick={resetData}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-md font-medium transition-colors"
        >
          Reset All Data (Clear Cache)
        </button>
      </div>

      {/* Import Pipeline */}
      <div className="border border-emerald-900/30 bg-emerald-950/10 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-emerald-400">Import from Google Sheets</h3>
        <p className="text-xs text-zinc-500">Fetches latest data directly from the SVAAS Execution Engine spreadsheet.</p>
        <div className="space-y-2">
          <button
            onClick={runImportPipeline}
            disabled={importing}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
          >
            {importing ? 'Fetching...' : 'Fetch & Transform from Google Sheets'}
          </button>
          {importedTasks && (
            <button
              onClick={loadIntoApp}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium transition-colors"
            >
              Load {importedTasks.length} tasks into app
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
          <h3 className="text-sm font-medium text-zinc-400">Preview (first 5)</h3>
          <div className="space-y-1 text-xs font-mono">
            {importedTasks.slice(0, 5).map((t: any, i: number) => (
              <div key={i} className="text-zinc-400">#{t.taskNumber || '—'} [{t.department}] {t.title.slice(0, 60)}</div>
            ))}
            <div className="text-zinc-600">...{importedTasks.length - 5} more</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex gap-2 pt-4 border-t border-zinc-800">
        <Link href="/trust" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Trust Report</Link>
        <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 text-sm text-zinc-400 hover:text-zinc-200">Venture Radar</Link>
      </nav>
    </div>
  );
}
