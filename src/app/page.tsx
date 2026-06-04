import { getStreams, getVentureHealth, getMomentumSnapshots, getDreamProtection, getRecoveryPlaybook, getOverdueDecisions, getHighestLeverageAction } from '@/services/venture-engine';
import { VentureRadar } from '@/components/venture-radar/venture-radar';
import { MomentumPanel } from '@/components/venture-radar/momentum-panel';
import { DreamProtectionBadge } from '@/components/venture-radar/dream-protection-badge';
import { QuickActions } from '@/components/venture-radar/quick-actions';
import Link from 'next/link';

export default function HomePage() {
  const health = getVentureHealth();
  const streams = getStreams();
  const snapshots = getMomentumSnapshots();
  const dreamProtection = getDreamProtection();
  const recovery = getRecoveryPlaybook();
  const overdueDecisions = getOverdueDecisions();
  const leverageAction = getHighestLeverageAction();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SVAAS Venture Radar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Day {health.dayNumber} of {health.totalDays} &bull; Target: Public Launch
          </p>
        </div>
        <DreamProtectionBadge score={dreamProtection} />
      </header>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all"
            style={{ width: `${Math.min(health.overallProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-600">
          <span>{health.overallProgress}% elapsed</span>
          <span>Day {health.totalDays}</span>
        </div>
      </div>

      {/* Highest Leverage Action (mini) */}
      {leverageAction && (
        <Link href="/command" className="block">
          <div className="border border-amber-900/50 bg-amber-950/20 rounded-lg p-4 hover:border-amber-700/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500 text-sm font-medium">🎯 Highest Leverage Action</span>
            </div>
            <p className="text-zinc-100 font-medium">{leverageAction.title}</p>
            <p className="text-zinc-500 text-sm mt-1 line-clamp-1">{leverageAction.notesDependencies}</p>
          </div>
        </Link>
      )}

      {/* Stream Cards */}
      <VentureRadar streams={streams} />

      {/* Venture Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Momentum */}
        <MomentumPanel
          score={health.momentumScore}
          trend={health.momentumTrend}
          snapshots={snapshots}
        />

        {/* Quick Insights */}
        <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Venture Summary</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-red-400">{health.streamsRed}</div>
              <div className="text-xs text-zinc-600">Red</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{health.streamsYellow}</div>
              <div className="text-xs text-zinc-600">Yellow</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{health.streamsGreen}</div>
              <div className="text-xs text-zinc-600">Green</div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-500">{health.streamsGrey}</div>
              <div className="text-xs text-zinc-600">Grey</div>
            </div>
          </div>
          {health.patternInsight && (
            <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-3 italic">
              &ldquo;{health.patternInsight}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Recovery Playbook (shows when momentum is low) */}
      {health.momentumScore < 40 && recovery.length > 0 && (
        <QuickActions actions={recovery} />
      )}

      {/* Navigation */}
      <nav className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-zinc-800">
        <Link href="/command" className="text-center py-3 px-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">
          Command Center
        </Link>
        <Link href="/decisions" className="text-center py-3 px-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">
          Decisions ({overdueDecisions.length} overdue)
        </Link>
        <Link href="/dependencies" className="text-center py-3 px-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">
          Dependencies
        </Link>
        <Link href="/review" className="text-center py-3 px-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-zinc-200">
          Weekly Review
        </Link>
      </nav>
    </div>
  );
}
