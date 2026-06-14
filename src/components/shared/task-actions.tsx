'use client';

import { actionMarkTaskDone, actionBlockTask, actionStartTask } from '@/app/actions';
import { useState } from 'react';

export function MarkDoneButton({ taskId, size = 'sm' }: { taskId: string; size?: 'sm' | 'md' }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await actionMarkTaskDone(taskId);
    setLoading(false);
    if (result.success) setDone(true);
  }

  if (done) return <span className="text-emerald-400 text-xs">✓ Done</span>;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${size === 'md' ? 'px-4 py-2' : 'px-2 py-1'} bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded font-medium transition-colors`}
    >
      {loading ? '...' : '✓ Done'}
    </button>
  );
}

export function BlockTaskButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [reason, setReason] = useState('');

  async function handleSubmit() {
    if (!reason.trim()) return;
    setLoading(true);
    await actionBlockTask(taskId, reason);
    setLoading(false);
    setShowInput(false);
  }

  if (showInput) {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why is it blocked?"
          className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 w-48"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <button onClick={handleSubmit} disabled={loading} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white text-xs rounded">
          {loading ? '...' : 'Save'}
        </button>
        <button onClick={() => setShowInput(false)} className="px-2 py-1 text-zinc-500 text-xs">Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
    >
      Blocked
    </button>
  );
}

export function StartTaskButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await actionStartTask(taskId);
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs rounded transition-colors"
    >
      {loading ? '...' : 'Start'}
    </button>
  );
}
