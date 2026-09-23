import { Link } from "react-router-dom";
import { Briefcase, Building2, CalendarDays, KeyRound, Mail, Phone, Wallet } from "lucide-react";
import { Avatar, Card, CardHeader, ErrorState, PageHeader, RoleBadge, Skeleton } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatMoney, fullName } from "../../lib/format";
import { useFetch } from "../../lib/useFetch";

const Detail = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{children || "—"}</dd>
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <Card className="p-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  </Card>
);

const MyProfilePage = () => {
  const { user } = useAuth();
  const { data: me, error, loading, reload } = useFetch("/employees/my-profile");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My profile" description="Your employment details as HR has them on file." />

      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <Avatar name={fullName(me)} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{fullName(me)}</h2>
                  <RoleBadge role={me.user?.role || user.role} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {me.jobTitle} · {me.department}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left sm:text-right">
                <p className="text-xs text-slate-500">Employee ID</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{me.employeeId}</p>
              </div>
            </div>
            <dl className="grid gap-6 border-t border-slate-100 p-6 sm:grid-cols-2">
              <Detail icon={Mail} label="Work email">
                <a href={`mailto:${me.email}`} className="text-brand-700 hover:underline">
                  {me.email}
                </a>
              </Detail>
              <Detail icon={Phone} label="Phone">{me.phone}</Detail>
              <Detail icon={Building2} label="Department">{me.department}</Detail>
              <Detail icon={Briefcase} label="Job title">{me.jobTitle}</Detail>
              <Detail icon={CalendarDays} label="Joined">{formatDate(me.joiningDate)}</Detail>
              <Detail icon={Wallet} label="Monthly salary">
                {me.salary != null ? <span className="font-semibold tabular-nums">{formatMoney(me.salary)}</span> : null}
              </Detail>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Sign-in and security"
              description={`You sign in as ${user.email}.`}
              action={
                <Link
                  to="/account/password"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" />
                  Change password
                </Link>
              }
              className="border-b-0"
            />
          </Card>
          <p className="text-center text-xs text-slate-500">Something out of date? Contact HR to update your details.</p>
        </div>
      )}
    </div>
  );
};

export default MyProfilePage;
