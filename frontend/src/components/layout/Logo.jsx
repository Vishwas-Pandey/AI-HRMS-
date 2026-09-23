export const Logo = ({ className = "", light = false }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">H</span>
    <span className={`text-base font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
      AI-HRMS
    </span>
  </span>
);
