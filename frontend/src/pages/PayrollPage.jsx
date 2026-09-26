import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock, Plus, Search, Wallet } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  TableSkeleton,
  useToast,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../lib/api";
import { formatDate, formatMoney, formatPeriod, formatTimestampDate, fullName } from "../lib/format";
import { can } from "../lib/roles";
import { useFetch } from "../lib/useFetch";
import { NewPayrollModal } from "./payroll/NewPayrollModal";

const monthKey = (d) => (d ? new Date(d).toISOString().slice(0, 7) : "");
const monthLabel = (key) => formatDate(`${key}-01T00:00:00Z`, { month: "long", year: "numeric" });
const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

const PayrollPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = can(user, "payroll.manage");

  const payroll = useFetch("/payroll");
  const employees = useFetch(canManage ? "/employees" : null, { enabled: canManage });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payBusy, setPayBusy] = useState(false);

  const records = useMemo(() => payroll.data || [], [payroll.data]);
  const current = thisMonth();

  const stats = useMemo(() => {
    const monthRows = records.filter((r) => monthKey(r.periodStartDate) === current);
    const pending = records.filter((r) => r.status === "Pending");
    return {
      monthNet: monthRows.reduce((s, r) => s + (r.netSalary || 0), 0),
      monthCount: monthRows.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + (r.netSalary || 0), 0),
      paidCount: records.filter((r) => r.status === "Paid").length,
    };
  }, [records, current]);

  const months = useMemo(() => [...new Set(records.map((r) => monthKey(r.periodStartDate)).filter(Boolean))].sort().reverse(), [records]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (status && r.status !== status) return false;
      if (month && monthKey(r.periodStartDate) !== month) return false;
      if (!q) return true;
      return [fullName(r.employee), r.employee?.employeeId, r.employee?.department].some((v) => v?.toLowerCase().includes(q));
    });
  }, [records, query, status, month]);

  const confirmPay = async () => {
    setPayBusy(true);
    try {
      const res = await api.patch(`/payroll/${paying._id}/pay`);
      payroll.setData((list) => list.map((r) => (r._id === res.data._id ? res.data : r)));
      toast.success(`Marked ${fullName(res.data.employee)}'s payroll as paid`);
      setPaying(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPayBusy(false);
    }
  };

  const onCreated = (rec) => payroll.setData((list) => [rec, ...(list || [])]);

  const statusCell = (r) => (
    <div className="flex flex-col items-start gap-0.5">
      <StatusBadge status={r.status} />
      {r.status === "Paid" && r.paidAt && <span className="text-xs text-slate-500">on {formatTimestampDate(r.paidAt)}</span>}
    </div>
  );

  const payAction = (r) =>
    canManage && r.status === "Pending" ? (
      <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => setPaying(r)}>
        Mark paid
      </Button>
    ) : null;

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={canManage ? "Create pay records and track what has been paid out." : "Pay records across the company (view only)."}
        actions={
          canManage && (
            <Button icon={Plus} onClick={() => setCreating(true)} disabled={employees.loading}>
              New payroll record
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Net payroll this month" value={payroll.loading ? "–" : formatMoney(stats.monthNet)} hint={payroll.loading ? null : `${stats.monthCount} record${stats.monthCount === 1 ? "" : "s"} for ${monthLabel(current)}`} icon={Wallet} tone="brand" />
        <StatCard label="Pending" value={payroll.loading ? "–" : stats.pendingCount} hint={payroll.loading ? null : `${formatMoney(stats.pendingAmount)} to pay out`} icon={Clock} tone="amber" />
        <StatCard label="Paid" value={payroll.loading ? "–" : stats.paidCount} hint="All-time paid records" icon={Banknote} tone="green" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="search" placeholder="Search by employee, ID or department" aria-label="Search payroll" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-40">
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </Select>
            <Select aria-label="Filter by month" value={month} onChange={(e) => setMonth(e.target.value)} className="md:w-48">
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {payroll.loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : payroll.error ? (
          <ErrorState message={payroll.error} onRetry={payroll.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={records.length ? "No records match these filters" : "No payroll records yet"}
            description={records.length ? "Try clearing the search, status or month filter." : canManage ? "Create the first pay record to get started." : "Records will appear here once an admin creates them."}
            action={
              !records.length && canManage ? (
                <Button icon={Plus} onClick={() => setCreating(true)}>
                  New payroll record
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="table-th">Employee</th>
                    <th className="table-th">Period</th>
                    <th className="table-th text-right">Gross</th>
                    <th className="table-th text-right">Deductions</th>
                    <th className="table-th text-right">Net</th>
                    <th className="table-th">Status</th>
                    {canManage && <th className="table-th text-right"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(r.employee)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{fullName(r.employee)}</p>
                            <p className="truncate text-xs text-slate-500">{r.employee?.employeeId} · {r.employee?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td whitespace-nowrap">{formatPeriod(r.periodStartDate, r.periodEndDate)}</td>
                      <td className="table-td text-right tabular-nums">{formatMoney(r.grossSalary)}</td>
                      <td className="table-td text-right tabular-nums text-slate-500">−{formatMoney(r.deductions)}</td>
                      <td className="table-td text-right font-semibold tabular-nums text-slate-900">{formatMoney(r.netSalary)}</td>
                      <td className="table-td">{statusCell(r)}</td>
                      {canManage && <td className="table-td text-right">{payAction(r)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map((r) => (
                <li key={r._id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={fullName(r.employee)} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{fullName(r.employee)}</p>
                        <p className="truncate text-xs text-slate-500">{formatPeriod(r.periodStartDate, r.periodEndDate)}</p>
                      </div>
                    </div>
                    {statusCell(r)}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">Gross</dt>
                      <dd className="font-medium tabular-nums text-slate-700">{formatMoney(r.grossSalary)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Deductions</dt>
                      <dd className="font-medium tabular-nums text-slate-700">{formatMoney(r.deductions)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Net</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{formatMoney(r.netSalary)}</dd>
                    </div>
                  </dl>
                  {payAction(r)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {canManage && <NewPayrollModal open={creating} onClose={() => setCreating(false)} employees={employees.data || []} onCreated={onCreated} />}

      <ConfirmDialog
        open={Boolean(paying)}
        onClose={() => !payBusy && setPaying(null)}
        onConfirm={confirmPay}
        loading={payBusy}
        tone="primary"
        title="Mark this payroll as paid?"
        message={paying ? `${fullName(paying.employee)} · ${formatPeriod(paying.periodStartDate, paying.periodEndDate)} · net ${formatMoney(paying.netSalary)}. This records today's date as the paid date and can't be undone.` : ""}
        confirmLabel="Mark paid"
      />
    </div>
  );
};

export default PayrollPage;
