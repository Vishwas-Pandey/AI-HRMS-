import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, CircleDashed, Plane, Search, UserCheck, UserX } from "lucide-react";
import {
  Avatar,
  Badge,
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
import { formatDate, formatTime, fullName, toDateInput } from "../lib/format";
import { can } from "../lib/roles";
import { useFetch } from "../lib/useFetch";
import { StatusSegmented } from "./attendance/StatusSegmented";

// Shift a YYYY-MM-DD string by n days without timezone drift.
const shiftDay = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return toDateInput(new Date(y, m - 1, d + n));
};

const AttendancePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const canMark = can(user, "attendance.mark");
  const today = toDateInput();

  const [day, setDay] = useState(today);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [saving, setSaving] = useState({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const employees = useFetch("/employees");
  const attendance = useFetch(`/attendance?date=${day}`);

  const loading = employees.loading || attendance.loading;
  const error = employees.error || attendance.error;
  const retry = () => {
    employees.reload();
    attendance.reload();
  };

  // One row per employee, joined with that day's record (if any).
  const rows = useMemo(() => {
    const byEmp = new Map((attendance.data || []).map((r) => [String(r.employee?._id), r]));
    return (employees.data || []).map((e) => ({ employee: e, record: byEmp.get(String(e._id)) || null }));
  }, [employees.data, attendance.data]);

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Leave: 0, unmarked: 0 };
    rows.forEach((r) => (r.record ? (c[r.record.status] += 1) : (c.unmarked += 1)));
    return c;
  }, [rows]);

  const departments = useMemo(
    () => [...new Set((employees.data || []).map((e) => e.department).filter(Boolean))].sort(),
    [employees.data]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ employee: e }) => {
      if (dept && e.department !== dept) return false;
      if (!q) return true;
      return [fullName(e), e.employeeId, e.jobTitle, e.email].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, dept]);

  const unmarked = rows.filter((r) => !r.record);

  const upsertLocal = (record) =>
    attendance.setData((list) => {
      const rest = (list || []).filter((r) => String(r.employee?._id) !== String(record.employee?._id));
      return [...rest, record];
    });

  const mark = async (employee, status) => {
    const id = employee._id;
    const previous = rows.find((r) => r.employee._id === id)?.record || null;
    // Optimistic: show the new status straight away, roll back on failure.
    upsertLocal({ ...(previous || {}), _id: previous?._id || `tmp-${id}`, employee, status, checkIn: status === "Present" ? previous?.checkIn || new Date().toISOString() : null, checkOut: status === "Present" ? previous?.checkOut : null });
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await api.post("/attendance", { employee: id, date: day, status });
      upsertLocal(res.data);
      toast.success(`${fullName(employee)} marked ${status.toLowerCase()}`);
    } catch (err) {
      attendance.setData((list) => {
        const rest = (list || []).filter((r) => String(r.employee?._id) !== String(id));
        return previous ? [...rest, previous] : rest;
      });
      toast.error(errorMessage(err));
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const markAllPresent = async () => {
    setBulkBusy(true);
    const results = await Promise.allSettled(
      unmarked.map((r) => api.post("/attendance", { employee: r.employee._id, date: day, status: "Present" }))
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    ok.forEach((r) => upsertLocal(r.value.data));
    const failed = results.length - ok.length;
    setBulkBusy(false);
    setBulkOpen(false);
    if (failed) toast.error(`${failed} of ${results.length} couldn't be saved. Please try again.`);
    else toast.success(`Marked ${ok.length} employee${ok.length === 1 ? "" : "s"} present`);
  };

  const isToday = day === today;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={canMark ? "Track and mark daily attendance for the whole team." : "Daily attendance for the whole team (read-only)."}
        actions={
          canMark && (
            <Button icon={UserCheck} onClick={() => setBulkOpen(true)} disabled={loading || !!error || unmarked.length === 0}>
              Mark all unmarked as present
            </Button>
          )
        }
      />

      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label="Previous day" onClick={() => setDay((d) => shiftDay(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <label htmlFor="att-date" className="sr-only">
            Date
          </label>
          <Input id="att-date" type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-auto" />
          <Button variant="secondary" size="icon" aria-label="Next day" disabled={day >= today} onClick={() => setDay((d) => shiftDay(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-slate-600">
          {formatDate(`${day}T00:00:00Z`, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {isToday && <Badge tone="brand" className="ml-2">Today</Badge>}
        </p>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setDay(today)} className="ml-auto">
            Jump to today
          </Button>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Present" value={loading ? "–" : counts.Present} icon={UserCheck} tone="green" />
        <StatCard label="Absent" value={loading ? "–" : counts.Absent} icon={UserX} tone="red" />
        <StatCard label="On leave" value={loading ? "–" : counts.Leave} icon={Plane} tone="amber" />
        <StatCard label="Not marked" value={loading ? "–" : counts.unmarked} hint={loading ? null : `of ${rows.length} employees`} icon={CircleDashed} tone="slate" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="search" placeholder="Search by name, ID or title" aria-label="Search employees" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Filter by department" value={dept} onChange={(e) => setDept(e.target.value)} className="sm:w-56">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={rows.length ? "No matching employees" : "No employees yet"}
            description={rows.length ? "Try a different search or department." : "Add employees to start tracking attendance."}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="table-th">Employee</th>
                    <th className="table-th">Department</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Check in</th>
                    <th className="table-th">Check out</th>
                    {canMark && <th className="table-th text-right">Mark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map(({ employee: e, record }) => (
                    <tr key={e._id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(e)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{fullName(e)}</p>
                            <p className="truncate text-xs text-slate-500">{e.employeeId} · {e.jobTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">{e.department}</td>
                      <td className="table-td">{record ? <StatusBadge status={record.status} /> : <Badge>Not marked</Badge>}</td>
                      <td className="table-td tabular-nums">{formatTime(record?.checkIn)}</td>
                      <td className="table-td tabular-nums">{formatTime(record?.checkOut)}</td>
                      {canMark && (
                        <td className="table-td text-right">
                          <StatusSegmented value={record?.status} disabled={saving[e._id]} onChange={(s) => mark(e, s)} label={`Attendance status for ${fullName(e)}`} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map(({ employee: e, record }) => (
                <li key={e._id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={fullName(e)} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{fullName(e)}</p>
                        <p className="truncate text-xs text-slate-500">{e.department} · {e.employeeId}</p>
                      </div>
                    </div>
                    {record ? <StatusBadge status={record.status} /> : <Badge>Not marked</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="tabular-nums">
                      In {formatTime(record?.checkIn)} · Out {formatTime(record?.checkOut)}
                    </span>
                    {canMark && <StatusSegmented value={record?.status} disabled={saving[e._id]} onChange={(s) => mark(e, s)} label={`Attendance status for ${fullName(e)}`} />}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => !bulkBusy && setBulkOpen(false)}
        onConfirm={markAllPresent}
        loading={bulkBusy}
        tone="primary"
        title="Mark everyone unmarked as present?"
        message={`${unmarked.length} employee${unmarked.length === 1 ? "" : "s"} without a record on ${formatDate(`${day}T00:00:00Z`)} will be marked present. You can change individual rows afterwards.`}
        confirmLabel={`Mark ${unmarked.length} present`}
      />
    </div>
  );
};

export default AttendancePage;
