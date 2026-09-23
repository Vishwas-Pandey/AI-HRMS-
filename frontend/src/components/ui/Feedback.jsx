import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button";

export const Spinner = ({ className = "" }) => <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />;

export const PageLoader = ({ label = "Loading…" }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
    <Spinner className="h-6 w-6" />
    {label}
  </div>
);

export const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 px-4 py-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Icon className="h-6 w-6" />
    </span>
    <p className="text-sm font-semibold text-slate-900">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertCircle className="h-6 w-6" />
    </span>
    <p className="text-sm font-semibold text-slate-900">Couldn't load this</p>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const Alert = ({ tone = "red", children }) => {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800",
  };
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
};
