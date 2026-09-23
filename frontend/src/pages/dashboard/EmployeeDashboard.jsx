import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Clock, FileText, LogIn, LogOut, Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useFetch";
import api, { errorMessage } from "../../lib/api";
import { formatDate, formatMoney, formatPeriod, formatTime, plural, toDateInput } from "../../lib/format";
import { RoleBadge, Button, Card, CardHeader, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge, Stars, useToast } from "../../components/ui";

const todayKey = () => toDateInput(); // local calendar date, same as the server's company timezone

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const attendance = useFetch("/attendance/my");
  const payslips = useFetch("/payroll/my-payslips");
  const reviews = useFetch("/performance/my-reviews");
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => (attendance.data || []).find((a) => a.date.slice(0, 10) === todayKey()), [attendance.data]);
  const last30 = useMemo(() => {
    const since = Date.now() - 30 * 864e5;
    const rows = (attendance.data || []).filter((a) => new Date(a.date).getTime() >= since);
    return { present: rows.filter((r) => r.status === "Present").length, total: rows.length };
  }, [attendance.data]);
  const latestSlip = payslips.data?.[0];
  const avg = reviews.data?.length ? (reviews.data.reduce((s, r) => s + r.rating, 0) / reviews.data.length).toFixed(1) : "—";

  const punch = async (kind) => {
    setBusy(true);
    try {
      await api.post(`/attendance/${kind}`);
      toast.success(kind === "check-in" ? "Checked in. Have a good day!" : "Checked out. See you tomorrow!");
      attendance.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Hi, ${user.name.split(" ")[0]}`} description={[user.jobTitle, user.department, user.employeeId].filter(Boolean).join(" · ")} />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Clock className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              {attendance.loading ? (
                <Skeleton className="mt-1 h-5 w-40" />
              ) : today?.checkOut ? (
                <p className="text-lg font-semibold text-slate-900">Done for today · {formatTime(today.checkIn)} – {formatTime(today.checkOut)}</p>
              ) : today?.checkIn ? (
                <p className="text-lg font-semibold text-slate-900">Checked in at {formatTime(today.checkIn)}</p>
              ) : today ? (
                <p className="text-lg font-semibold text-slate-900">Marked as <StatusBadge status={today.status} /></p>
              ) : (
                <p className="text-lg font-semibold text-slate-900">You haven't checked in yet</p>
              )}
            </div>
          </div>
          {!attendance.loading && !today?.checkOut && (!today || today.checkIn) && (
            today?.checkIn ? (
              <Button variant="secondary" size="lg" icon={LogOut} loading={busy} onClick={() => punch("check-out")}>Check out</Button>
            ) : (
              <Button size="lg" icon={LogIn} loading={busy} onClick={() => punch("check-in")}>Check in</Button>
            )
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {attendance.loading || payslips.loading || reviews.loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Days present (30 days)" value={`${last30.present}/${last30.total}`} icon={CalendarCheck} tone="green" />
            <StatCard label="Latest net pay" value={latestSlip ? formatMoney(latestSlip.netSalary) : "—"} hint={latestSlip ? formatPeriod(latestSlip.periodStartDate, latestSlip.periodEndDate) : "No payslips yet"} icon={FileText} />
            <StatCard label="Average rating" value={avg} hint={plural(reviews.data?.length || 0, "review")} icon={Star} tone="amber" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent payslips" action={<Link to="/me/payslips" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">All payslips <ArrowRight className="h-4 w-4" /></Link>} />
          {payslips.loading ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !payslips.data?.length ? (
            <EmptyState icon={FileText} title="No payslips yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {payslips.data.slice(0, 3).map((p) => (
                <li key={p._id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatPeriod(p.periodStartDate, p.periodEndDate)}</p>
                    <p className="text-xs text-slate-500">Gross {formatMoney(p.grossSalary)} · Deductions {formatMoney(p.deductions)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(p.netSalary)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Feedback" action={<Link to="/me/reviews" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">All reviews <ArrowRight className="h-4 w-4" /></Link>} />
          {reviews.loading ? (
            <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !reviews.data?.length ? (
            <EmptyState icon={Star} title="No reviews yet" description="Reviews from your manager or HR will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.data.slice(0, 3).map((r) => (
                <li key={r._id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} size="h-3.5 w-3.5" />
                    <span className="text-xs text-slate-500">{r.reviewer?.name}</span>
                    {r.reviewer?.role && <RoleBadge role={r.reviewer.role} />}
                    <span className="text-xs text-slate-400">{formatDate(r.reviewDate)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{r.comments}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
