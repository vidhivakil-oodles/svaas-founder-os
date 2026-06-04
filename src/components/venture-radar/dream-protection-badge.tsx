import { DreamProtectionScore } from '@/types';

export function DreamProtectionBadge({ score }: { score: DreamProtectionScore }) {
  const dots = Array.from({ length: 7 }, (_, i) => i < score.thisWeek);

  return (
    <div className="text-right">
      <div className="flex items-center gap-0.5 justify-end">
        {dots.map((active, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              active ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-600 mt-1">
        {score.thisWeek}/{score.target} days active
      </p>
    </div>
  );
}
