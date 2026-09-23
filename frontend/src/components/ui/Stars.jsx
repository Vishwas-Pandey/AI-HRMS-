import { Star } from "lucide-react";

export const Stars = ({ value = 0, size = "h-4 w-4" }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
    ))}
  </span>
);

export const StarInput = ({ value, onChange }) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
        onClick={() => onChange(n)}
        className="rounded p-0.5 transition-transform hover:scale-110"
      >
        <Star className={`h-7 w-7 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      </button>
    ))}
  </div>
);
