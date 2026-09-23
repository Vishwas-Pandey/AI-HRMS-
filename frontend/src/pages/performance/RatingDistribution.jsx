import { Star } from "lucide-react";
import { Card } from "../../components/ui";

// Horizontal bar list: how many reviews landed on each star value.
export const RatingDistribution = ({ reviews, loading }) => {
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">Rating distribution</p>
      <ul className="mt-3 space-y-1.5" aria-label="Number of reviews per rating">
        {counts.map(({ n, count }) => (
          <li key={n} className="flex items-center gap-2 text-xs">
            <span className="flex w-7 shrink-0 items-center gap-0.5 font-medium text-slate-600">
              {n}
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-brand-500 transition-all"
                style={{ width: loading ? "0%" : `${(count / max) * 100}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-slate-500">{loading ? "–" : count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};
