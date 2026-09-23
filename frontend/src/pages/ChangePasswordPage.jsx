import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../lib/api";
import { Alert, Button, Card, Field, Input, PageHeader, useToast } from "../components/ui";
import { Logo } from "../components/layout/Logo";

const RULES = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p), label: "Letters and numbers" },
];

const PasswordForm = ({ forced }) => {
  const { setUser, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const rulesOk = RULES.every((r) => r.test(form.newPassword));
  const mismatch = form.confirm && form.confirm !== form.newPassword;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.currentPassword) return setError(forced ? "Enter the temporary password you received." : "Enter your current password.");
    if (!rulesOk) return setError("The new password doesn't meet the requirements.");
    if (form.newPassword !== form.confirm) return setError("The two new passwords don't match.");
    setSaving(true);
    try {
      const { data } = await api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setUser(data.user);
      toast.success("Password updated");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {user?.isDemo && <Alert tone="amber">Demo account passwords can't be changed, so other visitors can keep using them.</Alert>}
      {error && <Alert>{error}</Alert>}
      <Field label={forced ? "Temporary password" : "Current password"} required>
        {(p) => <Input {...p} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} />}
      </Field>
      <Field label="New password" required>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} />}
      </Field>
      <ul className="space-y-1">
        {RULES.map((r) => (
          <li key={r.label} className={`flex items-center gap-2 text-xs ${r.test(form.newPassword) ? "text-emerald-600" : "text-slate-500"}`}>
            <Check className="h-3.5 w-3.5" /> {r.label}
          </li>
        ))}
      </ul>
      <Field label="Confirm new password" required error={mismatch ? "Passwords don't match" : null}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={mismatch} />}
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={saving} disabled={user?.isDemo}>
        {forced ? "Set password and continue" : "Update password"}
      </Button>
    </form>
  );
};

// Shown full-screen right after first sign-in with admin-issued credentials.
export const ForcedPasswordChange = () => {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />
        <Card className="p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your account was created by an administrator{user.employeeId ? ` (employee ID ${user.employeeId})` : ""}. Choose your own password to continue.
          </p>
          <div className="mt-6">
            <PasswordForm forced />
          </div>
        </Card>
        <button onClick={logout} className="mx-auto mt-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
};

const ChangePasswordPage = () => (
  <div className="max-w-lg">
    <PageHeader title="Change password" description="Pick a password you don't use anywhere else." />
    <Card className="p-6">
      <PasswordForm />
    </Card>
  </div>
);

export default ChangePasswordPage;
