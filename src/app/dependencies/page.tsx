import { getStreamDependencies, getStreams, getRootCauseStreams } from '@/services/venture-engine';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  red: 'text-red-400',
  yellow: 'text-amber-400',
  green: 'text-emerald-400',
  grey: 'text-zinc-500',
};

const DEP_STYLES = {
  hard_block: { color: 'text-red-400', line: 'border-red-800', label: 'Hard Block' },
  soft_block: { color: 'text-amber-400', line: 'border-amber-800', label: 'Soft Block' },
  enables: { color: 'text-zinc-500', line: 'border-zinc-700', label: 'Enables' },
};

export default function DependenciesPage() {
  const deps = getStreamDependencies();
  const streams = getStreams();
  const rootCauses = getRootCauseStreams();

  // Group by upstream
  const grouped: Record<string, typeof deps> = {};
  deps.forEach(d => {
    if (!grouped[d.upstreamSlug]) grouped[d.upstreamSlug] = [];
    grouped[d.upstreamSlug].push(d);
  });

  // Most affected (downstream blocked by most upstreams)
  const downstreamCounts: Record<string, number> = {};
  deps.forEach(d => {
    downstreamCounts[d.downstreamSlug] = (downstreamCounts[d.downstreamSlug] || 0) + 1;
  });
  const mostAffected = Object.entries(downstreamCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Venture Radar</Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">Cross-Stream Dependencies</h1>
        <p className="text-sm text-zinc-500">Which streams are blocking which? The cascade view.</p>
      </header>

      {/* Cascade Map */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([upSlug, dependencies]) => {
          const upStream = streams.find(s => s.slug === upSlug);
          if (!upStream) return null;
          const isRootCause = rootCauses.includes(upSlug);

          return (
            <div key={upSlug} className={`border ${isRootCause ? 'border-red-900/50' : 'border-zinc-800'} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${upStream.status === 'red' ? 'bg-red-500' : upStream.status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <h3 className={`font-medium ${STATUS_COLORS[upStream.status]}`}>
                  {upStream.name}
                </h3>
                {isRootCause && (
                  <span className="text-xs px-2 py-0.5 bg-red-950 text-red-400 rounded-full">ROOT CAUSE</span>
                )}
                <span className="text-xs text-zinc-600 ml-auto">blocks {dependencies.length} stream{dependencies.length > 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-zinc-800">
                {dependencies.map(dep => {
                  const style = DEP_STYLES[dep.dependencyType];
                  const downStream = streams.find(s => s.slug === dep.downstreamSlug);

                  return (
                    <div key={dep.id} className="flex items-start gap-3 py-1.5">
                      <span className={`text-xs font-mono ${style.color}`}>→</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${STATUS_COLORS[downStream?.status || 'grey']}`}>
                            {dep.downstreamName}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            dep.dependencyType === 'hard_block' ? 'bg-red-950 text-red-400' :
                            dep.dependencyType === 'soft_block' ? 'bg-amber-950 text-amber-400' :
                            'bg-zinc-900 text-zinc-500'
                          }`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{dep.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analysis Box */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">Stream Cascade Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="text-xs text-zinc-600 uppercase mb-2">Root Cause Streams</h4>
            {rootCauses.map(slug => {
              const stream = streams.find(s => s.slug === slug);
              const downCount = grouped[slug]?.length || 0;
              return (
                <div key={slug} className="flex items-center gap-2 py-1">
                  <span className="text-red-400">•</span>
                  <span className="text-zinc-300">{stream?.name}</span>
                  <span className="text-zinc-600 text-xs">→ blocks {downCount} streams</span>
                </div>
              );
            })}
          </div>

          <div>
            <h4 className="text-xs text-zinc-600 uppercase mb-2">Most Affected Streams</h4>
            {mostAffected.slice(0, 3).map(([slug, count]) => {
              const stream = streams.find(s => s.slug === slug);
              return (
                <div key={slug} className="flex items-center gap-2 py-1">
                  <span className="text-amber-400">•</span>
                  <span className="text-zinc-300">{stream?.name}</span>
                  <span className="text-zinc-600 text-xs">← blocked by {count} streams</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-400 italic">
            &ldquo;Unblocking Legal & Product simultaneously would cascade progress into 5 of 7 streams. These two streams control the health of the entire venture.&rdquo;
          </p>
        </div>
      </div>

      {/* Independent streams */}
      <div className="border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Independent Streams</h3>
        <p className="text-xs text-zinc-500">These can progress regardless of other streams:</p>
        <div className="flex gap-3 mt-2">
          {streams.filter(s => !Object.values(grouped).flat().some(d => d.downstreamSlug === s.slug) || s.slug === 'founder').map(s => (
            <span key={s.slug} className="text-sm text-emerald-400">
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
