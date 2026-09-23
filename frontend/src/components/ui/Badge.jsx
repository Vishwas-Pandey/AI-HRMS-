const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const Badge = ({ tone = "slate", children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
    {children}
  </span>
);

const ROLE_TONES = { admin: "purple", hr: "brand", manager: "amber", employee: "slate" };
const ROLE_TEXT = { admin: "Admin", hr: "HR", manager: "Manager", employee: "Employee" };
export const RoleBadge = ({ role }) => <Badge tone={ROLE_TONES[role] || "slate"}>{ROLE_TEXT[role] || role}</Badge>;

const STATUS_TONES = { Present: "green", Absent: "red", Leave: "amber", Paid: "green", Pending: "amber" };
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONES[status] || "slate"}>{status}</Badge>;
