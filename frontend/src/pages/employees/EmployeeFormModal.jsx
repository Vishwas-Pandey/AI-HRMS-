import { useEffect, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { toDateInput } from "../../lib/format";
import { Alert, Button, Field, Input, Modal, Select, useToast } from "../../components/ui";
import { useStableCallback } from "./useStableCallback";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee", hint: "Own profile, attendance check-in, payslips and reviews." },
  { value: "manager", label: "Manager", hint: "Everything an employee has, plus the team directory, attendance and performance reviews. No salaries." },
  { value: "hr", label: "HR", hint: "Directory with salaries, attendance marking, payroll records, reviews and AI recruiting tools." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  role: "employee",
  department: "",
  jobTitle: "",
  salary: "",
  joiningDate: toDateInput(),
  phone: "",
  setPassword: false,
  password: "",
});

const fromEmployee = (e) => ({
  ...emptyForm(),
  firstName: e.firstName || "",
  lastName: e.lastName || "",
  email: e.email || "",
  role: e.user?.role || "employee",
  department: e.department || "",
  jobTitle: e.jobTitle || "",
  salary: e.salary ?? "",
  joiningDate: e.joiningDate ? String(e.joiningDate).slice(0, 10) : toDateInput(),
  phone: e.phone || "",
});

const validate = (f, isEdit) => {
  const errs = {};
  if (!f.firstName.trim()) errs.firstName = "First name is required";
  if (!f.lastName.trim()) errs.lastName = "Last name is required";
  if (!f.email.trim()) errs.email = "Work email is required";
  else if (!EMAIL_RE.test(f.email.trim())) errs.email = "Enter a valid email address";
  if (!f.department.trim()) errs.department = "Department is required";
  if (!f.jobTitle.trim()) errs.jobTitle = "Job title is required";
  if (f.salary === "" || f.salary === null) errs.salary = "Monthly salary is required";
  else if (Number.isNaN(Number(f.salary)) || Number(f.salary) < 0) errs.salary = "Salary must be 0 or more";
  if (!f.joiningDate) errs.joiningDate = "Joining date is required";
  if (!isEdit && f.setPassword) {
    if (f.password.length < 8) errs.password = "Use at least 8 characters";
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errs.password = "Include both letters and numbers";
  }
  return errs;
};

// Create or edit an employee (admin only). On create, onSaved receives { employee, credentials }.
const EmployeeFormModal = ({ open, onClose, employee, departments = [], onSaved }) => {
  const isEdit = Boolean(employee);
  const isAdminProfile = employee?.user?.role === "admin";
  const toast = useToast();
  const listId = useId();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(employee ? fromEmployee(employee) : emptyForm());
    setErrors({});
    setServerError("");
    setShowPassword(false);
  }, [open, employee]);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, isEdit);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      department: form.department.trim(),
      jobTitle: form.jobTitle.trim(),
      salary: Number(form.salary),
      joiningDate: form.joiningDate,
      phone: form.phone.trim(),
    };
    if (!isAdminProfile) body.role = form.role;
    if (!isEdit && form.setPassword) body.password = form.password;

    setSaving(true);
    setServerError("");
    try {
      if (isEdit) {
        const { data } = await api.put(`/employees/${employee._id}`, body);
        toast.success(`${body.firstName}'s profile was updated`);
        onSaved?.(data);
      } else {
        const { data } = await api.post("/employees", body);
        toast.success(`${body.firstName} ${body.lastName} was added`);
        onSaved?.(data);
      }
    } catch (err) {
      const msg = errorMessage(err);
      if (/email/i.test(msg)) setErrors((x) => ({ ...x, email: msg }));
      else if (/password/i.test(msg)) setErrors((x) => ({ ...x, password: msg }));
      else if (/salary/i.test(msg)) setErrors((x) => ({ ...x, salary: msg }));
      else setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useStableCallback(() => {
    if (!saving) onClose?.();
  });

  const roleHint = ROLE_OPTIONS.find((r) => r.value === form.role)?.hint;
  const formId = "employee-form";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={isEdit ? "Edit employee" : "Add employee"}
      description={
        isEdit
          ? "Update job details, pay or access level."
          : "An employee ID and sign-in account are created automatically."
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-6">
        {serverError && <Alert>{serverError}</Alert>}

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName}>
            {(p) => <Input {...p} value={form.firstName} onChange={set("firstName")} error={errors.firstName} autoComplete="off" />}
          </Field>
          <Field label="Last name" required error={errors.lastName}>
            {(p) => <Input {...p} value={form.lastName} onChange={set("lastName")} error={errors.lastName} autoComplete="off" />}
          </Field>
          <Field label="Work email" required error={errors.email} className="sm:col-span-2" hint={!isEdit ? "They'll sign in with this address." : undefined}>
            {(p) => (
              <Input {...p} type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="name@company.com" autoComplete="off" />
            )}
          </Field>
          <Field label="Phone" hint="Optional">
            {(p) => <Input {...p} type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" autoComplete="off" />}
          </Field>
          {isAdminProfile ? (
            <Field label="Role" hint="Admin accounts can't be changed here.">
              {(p) => <Input {...p} value="Admin" disabled />}
            </Field>
          ) : (
            <Field label="Role" required hint={roleHint}>
              {(p) => (
                <Select {...p} value={form.role} onChange={set("role")}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </section>

        <section className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Field label="Department" required error={errors.department}>
            {(p) => (
              <>
                <Input {...p} list={listId} value={form.department} onChange={set("department")} error={errors.department} placeholder="e.g. Engineering" autoComplete="off" />
                <datalist id={listId}>
                  {departments.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Job title" required error={errors.jobTitle}>
            {(p) => <Input {...p} value={form.jobTitle} onChange={set("jobTitle")} error={errors.jobTitle} placeholder="e.g. Software Engineer" autoComplete="off" />}
          </Field>
          <Field label="Monthly salary (₹)" required error={errors.salary}>
            {(p) => (
              <Input {...p} type="number" inputMode="numeric" min="0" step="1" value={form.salary} onChange={set("salary")} error={errors.salary} placeholder="75000" />
            )}
          </Field>
          <Field label="Joining date" required error={errors.joiningDate}>
            {(p) => <Input {...p} type="date" value={form.joiningDate} onChange={set("joiningDate")} error={errors.joiningDate} />}
          </Field>
        </section>

        {!isEdit && (
          <section className="border-t border-slate-100 pt-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.setPassword}
                onChange={set("setPassword")}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-700">Set a password</span>
                <span className="block text-xs text-slate-500">
                  Leave this off to generate a secure temporary password. Either way, they'll choose their own at first sign-in.
                </span>
              </span>
            </label>
            {form.setPassword && (
              <Field label="Temporary password" required error={errors.password} hint="At least 8 characters with letters and numbers." className="mt-4 sm:max-w-sm">
                {(p) => (
                  <div className="relative">
                    <Input
                      {...p}
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      error={errors.password}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </Field>
            )}
          </section>
        )}
      </form>
    </Modal>
  );
};

export default EmployeeFormModal;
