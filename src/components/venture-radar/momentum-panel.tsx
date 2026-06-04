import { MomentumSnapshot } from '@/types';

interface Props {
  score: number;
  trend: 'improving' | 'stable' | 'declining' | 'critical';
  snapshots: MomentumSnapshot[];
}

const TREND_STYLES = {
  improving: { color: 'text-emerald-400', icon: '↑', label: 'Improving' },
  stable: { color: 'text-amber-400', icon: '→', label: 'Stable' },
  declining: { color: 'text-red-400', icon: '↓', label: 'Declining' },
  critical: { color: 'text-red-500', icon: '⚠️', label: 'Critical' },
};

export function MomentumPanel({ score, trend, snapshots }: Props) {
  const style = TREND_STYLES[trend];

  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Momentum Index</h3>
        <span className={`text-xs font-medium ${style.color}`}>
          {style.icon} {style.label}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-zinc-100">{score}</span>
        <span className="text-sm text-zinc-600 mb-1">/100</span>
      </div>

      {/* Mini trend chart */}
      <div className="space-y-1">
        {snapshots.slice(-4).map((snap) => (
          <div key={snap.weekNumber} className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 w-10">W{snap.weekNumber}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  snap.overallScore >= 60 ? 'bg-emerald-600' :
                  snap.overallScore >= 40 ? 'bg-amber-600' : 'bg-red-600'
                }`}
                style={{ width: `${snap.overallScore}%` }}
              />
            </div>
            <span className="text-xs text-zinc-600 w-6 text-right">{snap.overallScore}</span>
          </div>
        ))}
      </div>

      {score < 40 && (
        <p className="text-xs text-red-400/80 border-t border-zinc-800 pt-2">
          Venture momentum is low. Recovery actions available below.
        </p>
      )}
    </div>
  );
}
