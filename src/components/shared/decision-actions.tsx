'use client';

import { actionAcceptDefault, actionMakeDecision, actionDeferDecision } from '@/app/actions';
import { useState } from 'react';
import type { Decision } from '@/types';

export function DecisionActions({ decision }: { decision: Decision }) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolvedWith, setResolvedWith] = useState('');

  async function handleAcceptDefault() {
    setLoading(true);
    const result = await actionAcceptDefault(decision.id);
    setLoading(false);
    if (result.success) {
      setResolved(true);
      setResolvedWith(decision.defaultOption || '');
    }
  }

  async function handleChoose(option: string) {
    setLoading(true);
    const result = await actionMakeDecision(decision.id, option);
    setLoading(false);
    if (result.success) {
      setResolved(true);
      setResolvedWith(option);
    }
  }

  async function handleDefer() {
    setLoading(true);
    await actionDeferDecision(decision.id);
    setLoading(false);
  }

  if (resolved) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-emerald-400 text-sm font-medium">✓ Decided: {resolvedWith}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleAcceptDefault}
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-md font-medium transition-colors"
      >
        {loading ? '...' : `Accept Default: ${decision.defaultOption}`}
      </button>
      {decision.options
        .filter(o => o.label !== decision.defaultOption)
        .map(opt => (
          <button
            key={opt.label}
            onClick={() => handleChoose(opt.label)}
            disabled={loading}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-md transition-colors"
          >
            {opt.label}
          </button>
        ))}
      {decision.deferCount < decision.maxDeferrals && (
        <button
          onClick={handleDefer}
          disabled={loading}
          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-500 text-sm rounded-md transition-colors"
        >
          Defer 7 days
        </button>
      )}
    </div>
  );
}
