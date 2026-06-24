'use client';

import { useState } from 'react';

export default function SyncPage() {
  const [status, setStatus] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setStatus('Syncing...');

    try {
      const data = localStorage.getItem('svaas-os-state');
      if (!data) {
        setStatus('No data found in localStorage. Open the app first.');
        setSyncing(false);
        return;
      }

      const response = await fetch('/api/sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      });

      const result = await response.json();

      if (result.success) {
        const counts = result.counts || {};
        setStatus(
          `Synced successfully!\n\nTasks: ${counts.tasks || 0}\nStreams: ${counts.streams || 0}\nDecisions: ${counts.decisions || 0}\nMilestones: ${counts.milestones || 0}\nWaiting On: ${counts.waiting_on || 0}`
        );
      } else {
        setStatus(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    }

    setSyncing(false);
  }

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#2B2414', marginBottom: 8 }}>
        Sync to Supabase
      </h1>
      <p style={{ fontSize: 14, color: '#9C8B7A', marginBottom: 32 }}>
        This will export all your Tattva data (tasks, decisions, streams) from this browser to Supabase so Sankalp can access it.
      </p>

      <button
        onClick={handleSync}
        disabled={syncing}
        style={{
          padding: '14px 28px',
          backgroundColor: syncing ? '#9C8B7A' : '#2B2414',
          color: '#F2EDE6',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 500,
          cursor: syncing ? 'not-allowed' : 'pointer',
        }}
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {status && (
        <pre style={{
          marginTop: 24,
          padding: 16,
          backgroundColor: '#F2EDE6',
          borderRadius: 8,
          fontSize: 13,
          color: '#2B2414',
          whiteSpace: 'pre-wrap',
          border: '1px solid #BCA890',
        }}>
          {status}
        </pre>
      )}
    </div>
  );
}
