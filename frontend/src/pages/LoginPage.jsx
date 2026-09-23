import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Eye, EyeOff, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../lib/api";
import { Alert, Button, Field, Input } from "../components/ui";
import { Logo } from "../components/layout/Logo";

const FEATURES = [
  { icon: ShieldCheck, title: "Role-based access", text: "Admin, HR, manager and employee each see only what they should." },
  { icon: CalendarCheck, title: "Attendance & self check-in", text: "Daily check-in/out for staff, bulk marking for HR." },
  { icon: Wallet, title: "Payroll & payslips", text: "Monthly records with deductions and paid status." },
  { icon: Sparkles, title: "Gemini-powered HR tools", text: "Resume screening, review sentiment and an HR assistant." },
];

const ROLE_BLURB = {
  admin: "Create accounts, assign roles, run payroll",
  hr: "Attendance, reviews, recruiting tools",
  manager: "Team overview and performance reviews",
  employee: "Check in, payslips, own reviews",
};

// Free hosting sleeps when idle; tell the user instead of looking frozen.
const useSlowHint = (active) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [active]);
  return slow;
};

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(null); // "form" | role
  const [demo, setDemo] = useState([]);
  const [showForgot, setShowForgot] = useState(false);
  const emailRef = useRef(null);
  const slow = useSlowHint(Boolean(submitting));

  useEffect(() => {
    api
      .get("/auth/demo-accounts")
      .then((res) => setDemo(res.data.accounts || []))
      .catch(() => setDemo([]));
  }, []);

  const doLogin = async (e, p, key) => {
    setError("");
    setSubmitting(key);
    try {
      await login(e, p);
    } catch (err) {
      setError(errorMessage(err, "Couldn't sign in. Please try again."));
      setSubmitting(null);
    }
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    doLogin(email.trim(), password, "form");
  };

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <Logo light />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Run your people operations from one place.</h1>
          <p className="mt-4 text-slate-300">Employees, attendance, payroll and performance, with AI assistance where it saves time.</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-brand-300" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-slate-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">React · Node.js · Express · MongoDB · Gemini API</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use the credentials your administrator sent you.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <Field label="Work email">
              {(p) => (
                <Input {...p} ref={emailRef} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <div className="relative">
                  <Input {...p} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowForgot((s) => !s)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Forgot password?
              </button>
            </div>
            {showForgot && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Accounts are managed by your administrator. Ask them to reset your password; you'll get a new temporary one to change at first sign-in.
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={submitting === "form"} disabled={Boolean(submitting)}>
              Sign in
            </Button>
            {slow && <p className="text-center text-xs text-slate-500">Waking up the server; the first request after a quiet period can take up to a minute.</p>}
          </form>

          {demo.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Explore the demo</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {demo.map((a) => (
                  <button
                    key={a.role}
                    onClick={() => doLogin(a.email, a.password, a.role)}
                    aria-label={`Sign in as demo ${a.label}`}
                    disabled={Boolean(submitting)}
                    className="group rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      {a.label}
                      {submitting === a.role && <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{ROLE_BLURB[a.role]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">Fictional company data · resets daily</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
