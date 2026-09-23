import { useState } from "react";
import { FileSearch } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { Alert, Button, Field, Markdown, Textarea } from "../../components/ui";
import { FileDrop } from "./FileDrop";

export const ResumeTool = () => {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    if (!file) return setError("Upload a resume (PDF).");
    if (jd.trim().length < 30) return setError("Paste a job description (at least a few sentences).");
    const form = new FormData();
    form.append("resume", file);
    form.append("jobDescription", jd);
    setLoading(true);
    setResult("");
    try {
      const { data } = await api.post("/ai/screen-resume", form);
      setResult(data.analysis);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <div className="space-y-4">
        <FileDrop accept="application/pdf" label="Upload resume" hint="PDF, up to 5 MB" file={file} onFile={setFile} onError={setError} />
        <Field label="Job description" required>
          {(p) => <Textarea {...p} rows={8} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the role's responsibilities and requirements…" />}
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button icon={FileSearch} onClick={run} loading={loading}>Screen resume</Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Analysis</p>
        {loading ? <p className="text-sm text-slate-500">Reading the resume and comparing it to the role…</p> : result ? <Markdown>{result}</Markdown> : <p className="text-sm text-slate-500">A fit score, strengths and gaps will appear here.</p>}
      </div>
    </div>
  );
};
