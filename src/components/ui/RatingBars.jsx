import { clsx } from 'clsx';

export default function RatingBars({ distribution = [] }) {
  if (!distribution.length) return null;
  return (
    <div className="space-y-2" aria-label="Rating distribution">
      {distribution.map((row) => (
        <div key={row.stars} className="flex items-center gap-3 text-xs">
          <span className="w-8 shrink-0 font-semibold text-zinc-400">{row.stars}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className={clsx('h-full rounded-full bg-gradient-to-r from-brand to-glow-2')}
              style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">{row.count}</span>
        </div>
      ))}
    </div>
  );
}