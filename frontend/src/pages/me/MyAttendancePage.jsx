import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock, LogIn, LogOut, Plane, UserCheck, UserX } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge, TableSkeleton, useToast } from "../../components/ui";
import api, { errorMessage } from "../../lib/api";
import { formatDate, formatTime, toDateInput } from "../../lib/format";
import { useFetch } from "../../lib/useFetch";

// Records are stored at UTC midnight of their calendar date; "today" is the
// local date (the server uses the company timezone for the same thing).
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : toDateInput());

const duration = (from, to) => {
  if (!from || !to) return null;
  const mins = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
};

const TodayCard = ({ record, onCheckIn, onCheckOut, busy }) => {
  const now = useNow();
  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);

  let headline = "You haven't checked in yet";
  let tone = "slate";
  let badge = "Not checked in";
  if (checkedOut) {
    headline = "Your day is wrapped up";
    tone = "green";
    badge = "Checked out";
  } else if (checkedIn) {
    headline = "You're checked in";
    tone = "green";
    badge = "Working";
  } else if (record?.status === "Leave") {
    headline = "You're on leave today";
    tone = "amber";
    badge = "On leave";
  } else if (record?.status === "Absent") {
    headline = "You're marked absent today";
    tone = "red";
    badge = "Absent";
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500">
              Today · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <Badge tone={tone}>{badge}</Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{headline}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl" aria-label="Current time">
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" icon={LogIn} onClick={onCheckIn} loading={busy === "in"} disabled={checkedIn || Boolean(busy)}>
            Check in
          </Button>
          <Button size="lg" variant="secondary" icon={LogOut} onClick={onCheckOut} loading={busy === "out"} disabled={!checkedIn || checkedOut || Boolean(busy)}>
            Check out
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
        {[
          ["Checked in", formatTime(record?.checkIn)],
          ["Checked out", formatTime(record?.checkOut)],
          ["Worked", duration(record?.checkIn, record?.checkOut || (checkedIn ? now : null)) || "—"],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3 sm:px-6">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

const MyAttendancePage = () => {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useFetch("/attendance/my");
  const [busy, setBusy] = useState(null);

  const records = useMemo(() => data || [], [data]);
  const today = dayKey();
  const todayRecord = records.find((r) => dayKey(r.date) === today) || null;

  const summary = useMemo(() => {
    const cutoff = new Date(`${today}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - 29);
    const recent = records.filter((r) => new Date(r.date) >= cutoff);
    return {
      Present: recent.filter((r) => r.status === "Present").length,
      Leave: recent.filter((r) => r.status === "Leave").length,
      Absent: recent.filter((r) => r.status === "Absent").length,
    };
  }, [records, today]);

  const replace = (rec) => setData((list) => [rec, ...(list || []).filter((r) => r._id !== rec._id)].sort((a, b) => new Date(b.date) - new Date(a.date)));

  const act = async (kind) => {
    setBusy(kind);
    try {
      const res = await api.post(kind === "in" ? "/attendance/check-in" : "/attendance/check-out");
      replace(res.data);
      toast.success(kind === "in" ? `Checked in at ${formatTime(res.data.checkIn)}` : `Checked out at ${formatTime(res.data.checkOut)}`);
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My attendance" description="Check in and out, and review your recent attendance." />

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <div className="space-y-6">
          {loading ? <Skeleton className="h-56 rounded-xl" /> : <TodayCard record={todayRecord} busy={busy} onCheckIn={() => act("in")} onCheckOut={() => act("out")} />}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Last 30 days</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Present" value={loading ? "–" : summary.Present} icon={UserCheck} tone="green" />
              <StatCard label="On leave" value={loading ? "–" : summary.Leave} icon={Plane} tone="amber" />
              <StatCard label="Absent" value={loading ? "–" : summary.Absent} icon={UserX} tone="red" />
            </div>
          </div>

          <Card>
            <CardHeader title="History" description="Your most recent 60 attendance records." />
            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : records.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No attendance yet" description="Check in above to create your first record." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {records.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                    <div className="w-40 shrink-0">
                      <p className="text-sm font-medium text-slate-900">{formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.date, { year: "numeric" })}</p>
                    </div>
                    <StatusBadge status={r.status} />
                    <div className="ml-auto flex items-center gap-4 text-sm tabular-nums text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <LogIn className="h-3.5 w-3.5 text-slate-400" aria-label="Check in" />
                        {formatTime(r.checkIn)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <LogOut className="h-3.5 w-3.5 text-slate-400" aria-label="Check out" />
                        {formatTime(r.checkOut)}
                      </span>
                      <span className="hidden items-center gap-1.5 sm:inline-flex">
                        <Clock className="h-3.5 w-3.5 text-slate-400" aria-label="Duration" />
                        {duration(r.checkIn, r.checkOut) || "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyAttendancePage;
