import { useEffect, useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, StarInput, Textarea, useToast } from "../../components/ui";
import api, { errorMessage } from "../../lib/api";
import { fullName, toDateInput } from "../../lib/format";

const MAX = 1000;
const RATING_TEXT = { 1: "Needs improvement", 2: "Below expectations", 3: "Meets expectations", 4: "Exceeds expectations", 5: "Outstanding" };

const blank = () => ({ employee: "", rating: 0, comments: "", reviewDate: toDateInput() });

export const WriteReviewModal = ({ open, onClose, employees, onCreated }) => {
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

  const errors = {};
  if (!form.employee) errors.employee = "Choose who you're reviewing.";
  if (!form.rating) errors.rating = "Pick a rating from 1 to 5.";
  if (!form.comments.trim()) errors.comments = "Add a few words of feedback.";
  else if (form.comments.length > MAX) errors.comments = `Keep it under ${MAX} characters.`;
  if (!form.reviewDate) errors.reviewDate = "Pick the review date.";
  else if (form.reviewDate > toDateInput()) errors.reviewDate = "The review date can't be in the future.";
  const shown = touched ? errors : {};

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setServerError("");
    try {
      const res = await api.post("/performance", { ...form, comments: form.comments.trim() });
      toast.success(`Review saved for ${fullName(res.data.employee)}`);
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
      title="Write a review"
      description="Share a rating and specific, actionable feedback."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="write-review-form" loading={saving}>
            Save review
          </Button>
        </>
      }
    >
      <form id="write-review-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Employee" required error={shown.employee}>
          {(p) => (
            <Select {...p} value={form.employee} onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))} error={shown.employee}>
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {fullName(emp)} · {emp.jobTitle}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Rating<span className="ml-0.5 text-red-500">*</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StarInput value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
            {form.rating > 0 && <span className="text-sm text-slate-600">{RATING_TEXT[form.rating]}</span>}
          </div>
          {shown.rating && <p className="mt-1.5 text-xs text-red-600">{shown.rating}</p>}
        </div>
        <Field label="Comments" required error={shown.comments} hint={`${form.comments.length}/${MAX} characters`}>
          {(p) => (
            <Textarea
              {...p}
              rows={5}
              maxLength={MAX}
              placeholder="What went well, and what should they focus on next?"
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              error={shown.comments}
            />
          )}
        </Field>
        <Field label="Review date" required error={shown.reviewDate}>
          {(p) => <Input {...p} type="date" max={toDateInput()} value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} error={shown.reviewDate} />}
        </Field>
      </form>
    </Modal>
  );
};
