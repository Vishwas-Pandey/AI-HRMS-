import { useEffect, useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, useToast } from "../../components/ui";
import api, { errorMessage } from "../../lib/api";
import { formatMoney, fullName } from "../../lib/format";

const pad = (n) => String(n).padStart(2, "0");

// First and last day of the current month as YYYY-MM-DD.
const currentMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}` };
};

const blank = () => {
  const { start, end } = currentMonthRange();
  return { employee: "", periodStartDate: start, periodEndDate: end, grossSalary: "", deductions: "0" };
};

const validate = (f) => {
  const e = {};
  if (!f.employee) e.employee = "Choose an employee.";
  if (!f.periodStartDate) e.periodStartDate = "Pick a start date.";
  if (!f.periodEndDate) e.periodEndDate = "Pick an end date.";
  else if (f.periodStartDate && f.periodEndDate <= f.periodStartDate) e.periodEndDate = "End date must be after the start date.";
  const gross = Number(f.grossSalary);
  const ded = Number(f.deductions || 0);
  if (f.grossSalary === "" || Number.isNaN(gross)) e.grossSalary = "Enter the gross amount.";
  else if (gross <= 0) e.grossSalary = "Gross must be more than zero.";
  if (Number.isNaN(ded) || ded < 0) e.deductions = "Deductions can't be negative.";
  else if (!e.grossSalary && ded > gross) e.deductions = "Deductions can't exceed the gross amount.";
  return e;
};

export const NewPayrollModal = ({ open, onClose, employees, onCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(blank());
      setTouched(false);
      setServerError("");
    }
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickEmployee = (e) => {
    const id = e.target.value;
    const emp = employees.find((x) => x._id === id);
    setForm((f) => ({ ...f, employee: id, grossSalary: emp?.salary != null ? String(emp.salary) : f.grossSalary }));
  };

  const errors = validate(form);
  const shown = touched ? errors : {};
  const gross = Number(form.grossSalary) || 0;
  const ded = Number(form.deductions) || 0;
  const net = gross - ded;

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setServerError("");
    try {
      const res = await api.post("/payroll", { ...form, grossSalary: gross, deductions: ded });
      toast.success(`Payroll record created for ${fullName(res.data.employee)}`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="New payroll record"
      description="Create a pay run entry for one employee."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-payroll-form" loading={saving}>
            Create record
          </Button>
        </>
      }
    >
      <form id="new-payroll-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Employee" required error={shown.employee}>
          {(p) => (
            <Select {...p} value={form.employee} onChange={pickEmployee} error={shown.employee}>
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {fullName(emp)} ({emp.employeeId}) · {emp.department}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Period start" required error={shown.periodStartDate}>
            {(p) => <Input {...p} type="date" value={form.periodStartDate} onChange={set("periodStartDate")} error={shown.periodStartDate} />}
          </Field>
          <Field label="Period end" required error={shown.periodEndDate}>
            {(p) => <Input {...p} type="date" value={form.periodEndDate} min={form.periodStartDate} onChange={set("periodEndDate")} error={shown.periodEndDate} />}
          </Field>
          <Field label="Gross (INR)" required error={shown.grossSalary} hint={!shown.grossSalary && form.employee ? "Pre-filled from monthly salary" : undefined}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="0" step="1" value={form.grossSalary} onChange={set("grossSalary")} error={shown.grossSalary} />}
          </Field>
          <Field label="Deductions (INR)" error={shown.deductions}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="0" step="1" value={form.deductions} onChange={set("deductions")} error={shown.deductions} />}
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" aria-live="polite">
          <span className="text-sm text-slate-600">Net pay</span>
          <span className={`text-lg font-semibold tabular-nums ${net < 0 ? "text-red-600" : "text-slate-900"}`}>{formatMoney(net)}</span>
        </div>
      </form>
    </Modal>
  );
};
