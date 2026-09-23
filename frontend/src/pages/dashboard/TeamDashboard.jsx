import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, Doughnut } from "react-chartjs-2";
import { CalendarCheck, Star, UserPlus, Users, Wallet, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useFetch";
import { can } from "../../lib/roles";
import { CHART_COLORS } from "../../lib/charts";
import { formatDate, formatMoney, fullName, plural, toDateInput } from "../../lib/format";
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, Stars } from "../../components/ui";
import { AIInsightsCard } from "./AIInsightsCard";

const utcDayKey = (d) => new Date(d).toISOString().slice(0, 10);

const lastWorkdays = (n) => {
  const days = [];
  const d = new Date();
  while (days.length < n) {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    if (![0, 6].includes(utc.getUTCDay())) days.unshift(utc);
    d.setDate(d.getDate() - 1);
  }
  return days;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// Admin, HR and manager share one dashboard; widgets depend on permissions.
export const TeamDashboard = () => {
  const { user } = useAuth();
  const employees = useFetch("/employees");
  const attendance = useFetch("/attendance");
  const payroll = useFetch("/payroll", { enabled: can(user, "payroll.view") });
  const reviews = useFetch("/performance");

  const stats = useMemo(() => {
    const emps = employees.data || [];
    const today = toDateInput(); // local calendar date
    const todays = (attendance.data || []).filter((a) => utcDayKey(a.date) === today);
    const present = todays.filter((a) => a.status === "Present").length;
    const pending = (payroll.data || []).filter((p) => p.status === "Pending");
    const ratings = (reviews.data || []).map((r) => r.rating);
    const byDept = emps.reduce((acc, e) => ({ ...acc, [e.department]: (acc[e.department] || 0) + 1 }), {});

    const days = lastWorkdays(7);
    const trend = days.map((day) => {
      const key = utcDayKey(day);
      const rows = (attendance.data || []).filter((a) => utcDayKey(a.date) === key);
      return { label: formatDate(day, { weekday: "short", day: "numeric" }), present: rows.filter((r) => r.status === "Present").length, away: rows.filter((r) => r.status !== "Present").length };
    });

    return {
      headcount: emps.length,
      present,
      marked: todays.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, p) => s + p.netSalary, 0),
      avgRating: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—",
      reviewCount: ratings.length,
      byDept,
      trend,
    };
  }, [employees.data, attendance.data, payroll.data, reviews.data]);

  const loading = employees.loading || attendance.loading || reviews.loading;
  if (employees.error) return <ErrorState message={employees.error} onRetry={employees.reload} />;

  const deptLabels = Object.keys(stats.byDept);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            {can(user, "attendance.mark") && (
              <Link to="/attendance"><Button variant="secondary" icon={CalendarCheck}>Mark attendance</Button></Link>
            )}
            {can(user, "employees.manage") && (
              <Link to="/employees?new=1"><Button icon={UserPlus}>Add employee</Button></Link>
            )}
            {!can(user, "attendance.mark") && can(user, "performance.review") && (
              <Link to="/performance"><Button icon={Star}>Write a review</Button></Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Headcount" value={stats.headcount} hint={plural(deptLabels.length, "department")} icon={Users} />
            <StatCard label="Present today" value={`${stats.present}/${stats.headcount}`} hint={stats.marked < stats.headcount ? `${stats.headcount - stats.marked} not marked yet` : "Everyone marked"} icon={CalendarCheck} tone="green" />
            {can(user, "payroll.view") ? (
              <StatCard label="Pending payroll" value={formatMoney(stats.pendingAmount)} hint={`${plural(stats.pendingCount, "payslip")} to pay`} icon={Wallet} tone="amber" />
            ) : (
              <StatCard label="Reviews written" value={stats.reviewCount} hint="Across the company" icon={Star} tone="amber" />
            )}
            <StatCard label="Average rating" value={stats.avgRating} hint={plural(stats.reviewCount, "review")} icon={Star} tone="slate" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Attendance, last 7 working days" description="Present vs. absent or on leave" />
          <div className="h-72 p-5">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Bar
                data={{
                  labels: stats.trend.map((t) => t.label),
                  datasets: [
                    { label: "Present", data: stats.trend.map((t) => t.present), backgroundColor: "#4f46e5", borderRadius: 6, maxBarThickness: 28 },
                    { label: "Absent / leave", data: stats.trend.map((t) => t.away), backgroundColor: "#cbd5e1", borderRadius: 6, maxBarThickness: 28 },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                  scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#f1f5f9" } } },
                }}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Headcount by department" />
          <div className="p-5">
            {loading ? (
              <Skeleton className="mx-auto h-48 w-48 rounded-full" />
            ) : deptLabels.length === 0 ? (
              <EmptyState title="No employees yet" />
            ) : (
              <>
                <div className="mx-auto h-48 max-w-[12rem]">
                  <Doughnut
                    data={{ labels: deptLabels, datasets: [{ data: deptLabels.map((d) => stats.byDept[d]), backgroundColor: CHART_COLORS, borderWidth: 0 }] }}
                    options={{ maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }}
                  />
                </div>
                <ul className="mt-5 space-y-2">
                  {deptLabels.map((d, i) => (
                    <li key={d} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {d}
                      </span>
                      <span className="font-medium text-slate-900">{stats.byDept[d]}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent reviews"
            action={<Link to="/performance" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight className="h-4 w-4" /></Link>}
          />
          {reviews.loading ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (reviews.data || []).length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Reviews written by HR and managers show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.data.slice(0, 5).map((r) => (
                <li key={r._id} className="flex items-start gap-3 px-5 py-4">
                  <Avatar name={fullName(r.employee)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link to={`/employees/${r.employee._id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700">{fullName(r.employee)}</Link>
                      <Stars value={r.rating} size="h-3.5 w-3.5" />
                      <span className="text-xs text-slate-400">{formatDate(r.reviewDate)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.comments}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {can(user, "ai.use") && <AIInsightsCard />}
      </div>
    </div>
  );
};
