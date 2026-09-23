import { KeyRound, ShieldCheck, UserPlus, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../lib/roles";
import { Card, PageHeader } from "../components/ui";

const FAQ = [
  { icon: UserPlus, q: "How do new people get an account?", a: "There's no self sign-up. An administrator creates the account, chooses the role (HR, manager or employee) and shares the employee ID, email and a temporary password." },
  { icon: KeyRound, q: "I forgot my password", a: "Ask your administrator to reset it from your employee profile. You'll get a new temporary password and be asked to set your own at sign-in." },
  { icon: ShieldCheck, q: "Why can't I see some pages?", a: "Each role sees only what it needs. Employees see their own attendance, payslips and reviews; managers see the team and reviews but not salaries; HR adds attendance and payroll; admins manage accounts and pay runs." },
  { icon: CalendarCheck, q: "I forgot to check in", a: "HR or an admin can mark your attendance for any day from the Attendance page." },
];

const SupportPage = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Help & support" description={`You're signed in as ${ROLE_LABELS[user.role]}.`} />
      <div className="space-y-3">
        {FAQ.map(({ icon: Icon, q, a }) => (
          <Card key={q} className="flex gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{q}</h2>
              <p className="mt-1 text-sm text-slate-600">{a}</p>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Want to change your password? <Link to="/account/password" className="font-medium text-brand-600 hover:text-brand-700">Go to account settings</Link>.
      </p>
    </div>
  );
};

export default SupportPage;
