const OPTIONS = [
  { value: "Present", label: "Present", active: "bg-emerald-600 text-white" },
  { value: "Absent", label: "Absent", active: "bg-red-600 text-white" },
  { value: "Leave", label: "Leave", active: "bg-amber-500 text-white" },
];

// Three-way toggle for a single employee's status on one day.
export const StatusSegmented = ({ value, onChange, disabled, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
    {OPTIONS.map((o) => {
      const selected = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => !selected && onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            selected ? `${o.active} shadow-sm` : "text-slate-600 hover:bg-white hover:text-slate-900"
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);
