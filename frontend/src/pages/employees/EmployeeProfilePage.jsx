import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  Hash,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Star,
  Trash2,
  UserX,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../lib/roles";
import { useFetch } from "../../lib/useFetch";
import api, { errorMessage } from "../../lib/api";
import { formatDate, formatMoney, formatPeriod, formatTime, fullName } from "../../lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  RoleBadge,
  Skeleton,
  Stars,
  StatCard,
  StatusBadge,
  TableSkeleton,
  useToast,
} from "../../components/ui";
import EmployeeFormModal from "./EmployeeFormModal";
import CredentialsModal from "./CredentialsModal";
import { useStableCallback } from "./useStableCallback";

const BackLink = () => (
  <Link to="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
    <ArrowLeft className="h-4 w-4" />
    All employees
  </Link>
);

const DetailItem = ({ icon: Icon, label, children }) => (
  <div className="flex min-w-0 items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      {Icon && <Icon className="h-4 w-4" />}
    </span>
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{children}</dd>
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <div>
    <Skeleton className="mb-4 h-4 w-28" />
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </Card>
  </div>
);

const belongsTo = (id) => (row) => String(row.employee?._id || row.employee) === String(id);

// Loads a list endpoint and keeps only this employee's rows.
const useEmployeeRows = (url, id, enabled) => {
  const { data, error, loading, reload } = useFetch(url, { enabled });
  const rows = useMemo(() => (data || []).filter(belongsTo(id)), [data, id]);
  return { rows, error, loading, reload };
};

const TabPanel = ({ title, description, loading, error, onRetry, empty, emptyIcon, children }) => (
  <Card>
    <CardHeader title={title} description={description} />
    {loading ? <TableSkeleton rows={4} cols={4} /> : error ? <ErrorState message={error} onRetry={onRetry} /> : empty ? <EmptyState icon={emptyIcon} {...empty} /> : children}
  </Card>
);

const AttendanceTab = ({ id }) => {
  const { rows, error, loading, reload } = useEmployeeRows("/attendance", id, true);
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  return (
    <div className="space-y-4">
      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Present" value={counts.Present || 0} tone="green" />
          <StatCard label="Leave" value={counts.Leave || 0} tone="amber" />
          <StatCard label="Absent" value={counts.Absent || 0} tone="red" />
        </div>
      )}
      <TabPanel
        title="Attendance history"
        description="Most recent first"
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={CalendarCheck}
        empty={rows.length === 0 && { title: "No attendance yet", description: "Check-ins and marked days will appear here." }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th scope="col" className="table-th">Date</th>
                <th scope="col" className="table-th">Status</th>
                <th scope="col" className="table-th">Check in</th>
                <th scope="col" className="table-th">Check out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="table-td whitespace-nowrap">{formatDate(r.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="table-td"><StatusBadge status={r.status} /></td>
                  <td className="table-td whitespace-nowrap tabular-nums">{formatTime(r.checkIn)}</td>
                  <td className="table-td whitespace-nowrap tabular-nums">{formatTime(r.checkOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabPanel>
    </div>
  );
};

const PayrollTab = ({ id }) => {
  const { rows, error, loading, reload } = useEmployeeRows("/payroll", id, true);
  const sorted = [...rows].sort((a, b) => new Date(b.periodStartDate) - new Date(a.periodStartDate));
  return (
    <TabPanel
      title="Payroll"
      description="Pay runs for this employee"
      loading={loading}
      error={error}
      onRetry={reload}
      emptyIcon={Wallet}
      empty={rows.length === 0 && { title: "No payroll records", description: "Pay runs created for this employee will appear here." }}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr>
              <th scope="col" className="table-th">Period</th>
              <th scope="col" className="table-th text-right">Gross</th>
              <th scope="col" className="table-th text-right">Deductions</th>
              <th scope="col" className="table-th text-right">Net</th>
              <th scope="col" className="table-th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((p) => (
              <tr key={p._id}>
                <td className="table-td whitespace-nowrap">{formatPeriod(p.periodStartDate, p.periodEndDate)}</td>
                <td className="table-td whitespace-nowrap text-right tabular-nums">{formatMoney(p.grossSalary)}</td>
                <td className="table-td whitespace-nowrap text-right tabular-nums">{formatMoney(p.deductions)}</td>
                <td className="table-td whitespace-nowrap text-right font-medium tabular-nums text-slate-900">{formatMoney(p.netSalary)}</td>
                <td className="table-td whitespace-nowrap">
                  <StatusBadge status={p.status} />
                  {p.paidAt && <span className="ml-2 text-xs text-slate-500">{formatDate(p.paidAt)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TabPanel>
  );
};

const ReviewsTab = ({ id }) => {
  const { rows, error, loading, reload } = useEmployeeRows("/performance", id, true);
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  return (
    <TabPanel
      title="Performance reviews"
      description={rows.length ? `Average rating ${avg.toFixed(1)} across ${rows.length} review${rows.length === 1 ? "" : "s"}` : undefined}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyIcon={Star}
      empty={rows.length === 0 && { title: "No reviews yet", description: "Reviews written for this employee will appear here." }}
    >
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r._id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={r.rating} />
              <span className="text-xs text-slate-500">{formatDate(r.reviewDate)}</span>
            </div>
            {r.comments && <p className="mt-2 text-sm text-slate-700">{r.comments}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Reviewed by {r.reviewer?.name || "a former colleague"}
              {r.reviewer?.role && <> · <RoleBadge role={r.reviewer.role} /></>}
            </p>
          </li>
        ))}
      </ul>
    </TabPanel>
  );
};

const OverviewTab = ({ employee, showSalary }) => {
  const role = employee.user?.role;
  const tenureDays = Math.max(0, Math.floor((Date.now() - new Date(employee.joiningDate)) / 86400000));
  const tenure =
    tenureDays >= 365
      ? `${(tenureDays / 365).toFixed(1)} years`
      : tenureDays >= 30
        ? `${Math.floor(tenureDays / 30)} months`
        : `${tenureDays} days`;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Employment" />
        <dl className="grid gap-5 p-5 sm:grid-cols-2">
          <DetailItem icon={Briefcase} label="Job title">{employee.jobTitle || "—"}</DetailItem>
          <DetailItem icon={Building2} label="Department">{employee.department || "—"}</DetailItem>
          <DetailItem icon={CalendarDays} label="Joined">{formatDate(employee.joiningDate)} <span className="text-slate-500">· {tenure}</span></DetailItem>
          {showSalary && <DetailItem icon={Wallet} label="Monthly salary">{formatMoney(employee.salary)}</DetailItem>}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Account" />
        <dl className="space-y-5 p-5">
          <DetailItem icon={Mail} label="Sign-in email">{employee.user?.email || employee.email}</DetailItem>
          <DetailItem icon={KeyRound} label="Access">{role ? <RoleBadge role={role} /> : "—"}</DetailItem>
          <DetailItem icon={CalendarCheck} label="Status">
            {employee.user?.mustChangePassword ? (
              <Badge tone="amber">Waiting for first sign-in</Badge>
            ) : (
              <Badge tone="green">Active</Badge>
            )}
          </DetailItem>
        </dl>
      </Card>
    </div>
  );
};

const EmployeeProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const canManage = can(user, "employees.manage");
  const showSalary = can(user, "salary.view");

  const { data: employee, error, loading, reload, setData } = useFetch(`/employees/${id}`);
  const [notFound, setNotFound] = useState(false);

  const tabs = useMemo(
    () =>
      [
        { key: "overview", label: "Overview", show: true },
        { key: "attendance", label: "Attendance", show: can(user, "attendance.view") },
        { key: "payroll", label: "Payroll", show: can(user, "payroll.view") },
        { key: "reviews", label: "Reviews", show: can(user, "performance.view") },
      ].filter((t) => t.show),
    [user]
  );
  const [tab, setTab] = useState("overview");

  const [editOpen, setEditOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(null); // "reset" | "delete"
  const [credentials, setCredentials] = useState(null);

  const closeEdit = useStableCallback(() => setEditOpen(false));
  const closeReset = useStableCallback(() => busy !== "reset" && setConfirmReset(false));
  const closeDelete = useStableCallback(() => busy !== "delete" && setConfirmDelete(false));
  const closeCredentials = useStableCallback(() => setCredentials(null));

  // useFetch collapses errors into a message; treat "not found"/"invalid id" as a 404.
  const isMissing = notFound || (error && /not found|invalid employee id/i.test(error));

  if (loading && !employee) return <ProfileSkeleton />;

  if (isMissing) {
    return (
      <div>
        <BackLink />
        <Card>
          <EmptyState
            icon={UserX}
            title="Employee not found"
            description="This person may have been removed, or the link is incorrect."
            action={
              <Button variant="secondary" onClick={() => navigate("/employees")}>
                Back to employees
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div>
        <BackLink />
        <Card>
          <ErrorState message={error || "Couldn't load this employee."} onRetry={reload} />
        </Card>
      </div>
    );
  }

  const name = fullName(employee);
  const role = employee.user?.role;
  const isSelf = String(employee.user?._id) === String(user?._id);
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "overview";

  const resetPassword = async () => {
    setBusy("reset");
    try {
      const { data } = await api.post(`/employees/${employee._id}/reset-password`);
      setConfirmReset(false);
      setCredentials(data.credentials);
      setData((e) => ({ ...e, user: { ...e.user, mustChangePassword: true } }));
      toast.success(`New temporary password issued for ${employee.firstName}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteEmployee = async () => {
    setBusy("delete");
    try {
      await api.delete(`/employees/${employee._id}`);
      toast.success(`${name} was removed`);
      navigate("/employees", { replace: true });
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      toast.error(errorMessage(err));
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  const onSaved = (updated) => {
    setEditOpen(false);
    setData(updated);
  };

  return (
    <div>
      <BackLink />

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{name}</h1>
                {role && <RoleBadge role={role} />}
                {employee.user?.mustChangePassword && (
                  <Badge tone="amber">
                    <KeyRound className="h-3 w-3" />
                    Password pending
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {employee.jobTitle}
                {employee.department && <> · {employee.department}</>}
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="secondary" icon={KeyRound} onClick={() => setConfirmReset(true)}>
                Reset password
              </Button>
              {!isSelf && (
                <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem icon={Hash} label="Employee ID">
            <span className="font-mono">{employee.employeeId}</span>
          </DetailItem>
          <DetailItem icon={Mail} label="Email">
            <a href={`mailto:${employee.email}`} className="text-brand-700 hover:underline">
              {employee.email}
            </a>
          </DetailItem>
          <DetailItem icon={Phone} label="Phone">
            {employee.phone ? (
              <a href={`tel:${employee.phone}`} className="text-brand-700 hover:underline">
                {employee.phone}
              </a>
            ) : (
              <span className="text-slate-400">Not provided</span>
            )}
          </DetailItem>
          <DetailItem icon={Building2} label="Department">{employee.department || "—"}</DetailItem>
          <DetailItem icon={CalendarDays} label="Joined">{formatDate(employee.joiningDate)}</DetailItem>
          {showSalary && <DetailItem icon={Wallet} label="Monthly salary">{formatMoney(employee.salary)}</DetailItem>}
        </dl>
      </Card>

      {tabs.length > 1 && (
        <div className="mb-4 overflow-x-auto border-b border-slate-200">
          <div role="tablist" aria-label="Employee sections" className="-mb-px flex gap-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={activeTab === t.key}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${
                  activeTab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "overview" && <OverviewTab employee={employee} showSalary={showSalary} />}
        {activeTab === "attendance" && <AttendanceTab id={employee._id} />}
        {activeTab === "payroll" && <PayrollTab id={employee._id} />}
        {activeTab === "reviews" && <ReviewsTab id={employee._id} />}
      </div>

      {canManage && (
        <>
          <EmployeeFormModal open={editOpen} onClose={closeEdit} employee={employee} onSaved={onSaved} />
          <ConfirmDialog
            open={confirmReset}
            onClose={closeReset}
            onConfirm={resetPassword}
            loading={busy === "reset"}
            tone="primary"
            title="Reset password?"
            confirmLabel="Reset password"
            message={`${name}'s current password will stop working immediately. A new temporary password will be generated for you to share, and they'll be asked to change it at next sign-in.`}
          />
          <ConfirmDialog
            open={confirmDelete}
            onClose={closeDelete}
            onConfirm={deleteEmployee}
            loading={busy === "delete"}
            title={`Delete ${name}?`}
            confirmLabel="Delete employee"
            message={`This permanently removes ${name}'s profile and sign-in account, along with all of their attendance, payroll and performance review records. This can't be undone.`}
          />
          <CredentialsModal open={Boolean(credentials)} onClose={closeCredentials} credentials={credentials} name={name} title="Password reset" />
        </>
      )}
    </div>
  );
};

export default EmployeeProfilePage;
