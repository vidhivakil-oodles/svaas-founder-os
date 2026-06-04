import { RecoveryAction } from '@/types';

export function QuickActions({ actions }: { actions: RecoveryAction[] }) {
  const totalMinutes = actions.reduce((sum, a) => sum + a.effortMinutes, 0);

  return (
    <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-emerald-400">⚡ Momentum Recovery Playbook</h3>
        <span className="text-xs text-zinc-500">Total: {totalMinutes} min</span>
      </div>
      <p className="text-xs text-zinc-500">Start here. Start small. Start now.</p>

      <div className="space-y-2">
        {actions.slice(0, 4).map((action, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-t border-zinc-800/50 first:border-0 first:pt-0">
            <span className="text-xs text-emerald-500 font-mono whitespace-nowrap mt-0.5">
              {action.effort}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200">{action.action}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{action.impact}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500 italic border-t border-zinc-800 pt-3">
        &ldquo;{totalMinutes} minutes would move SVAAS from stalled to alive. That&apos;s less time than making dinner.&rdquo;
      </p>
    </div>
  );
}
