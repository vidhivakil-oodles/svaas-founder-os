import { getMilestones, getDayNumber } from '@/services/venture-engine';
import Link from 'next/link';

export default function MilestonesPage() {
  const milestones = getMilestones();
  const dayNumber = getDayNumber();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Milestones</h1>
        <p className="text-sm text-zinc-500">Day {dayNumber} — Gate criteria progress for each milestone.</p>
      </header>

      <div className="space-y-4">
        {milestones.map(ms => {
          const metCount = ms.gateCriteria.filter(g => g.met).length;
          const total = ms.gateCriteria.length;
          const progress = total > 0 ? Math.round((metCount / total) * 100) : 0;
          const isPast = dayNumber > ms.dayTarget;
          const isCurrent = dayNumber <= ms.dayTarget && (milestones.indexOf(ms) === 0 || dayNumber > milestones[milestones.indexOf(ms) - 1].dayTarget);

          return (
            <div key={ms.id} className={`border ${
              ms.status === 'at_risk' ? 'border-red-900/50 bg-red-950/10' :
              ms.status === 'achieved' ? 'border-emerald-900/50 bg-emerald-950/10' :
              isCurrent ? 'border-amber-900/50 bg-amber-950/10' :
              'border-zinc-800'
            } rounded-lg p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      ms.status === 'achieved' ? 'text-emerald-400' :
                      ms.status === 'at_risk' ? 'text-red-400' :
                      isCurrent ? 'text-amber-400' : 'text-zinc-400'
                    }`}>
                      {ms.status === 'achieved' ? '✓' : isCurrent ? '→' : '○'}
                    </span>
                    <h3 className="font-semibold text-zinc-100">{ms.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Day {ms.dayTarget} &bull; Phase {ms.phase}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${
                    ms.status === 'at_risk' ? 'text-red-400' :
                    progress >= 75 ? 'text-emerald-400' :
                    progress >= 50 ? 'text-amber-400' : 'text-zinc-400'
                  }`}>
                    {metCount}/{total}
                  </span>
                  {isPast && ms.status !== 'achieved' && (
                    <p className="text-xs text-red-400">OVERDUE</p>
                  )}
                  {!isPast && ms.daysRemaining !== undefined && (
                    <p className="text-xs text-zinc-600">{ms.daysRemaining}d remaining</p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${
                    ms.status === 'achieved' ? 'bg-emerald-500' :
                    ms.status === 'at_risk' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Gate Criteria */}
              <div className="space-y-1.5">
                {ms.gateCriteria.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={g.met ? 'text-emerald-400' : 'text-zinc-600'}>
                      {g.met ? '✓' : '○'}
                    </span>
                    <span className={g.met ? 'text-zinc-400 line-through' : 'text-zinc-300'}>
                      {g.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
