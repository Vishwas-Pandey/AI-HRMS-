import { useState } from "react";
import { Copy, FileText } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { Alert, Button, Field, Markdown, Textarea, useToast } from "../../components/ui";

const PRESETS = ["Offer letter for a senior backend engineer", "Warning letter for repeated late arrivals", "Work-from-home policy for a 50-person startup", "Experience certificate"];

export const TemplateTool = () => {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (text = prompt) => {
    setError("");
    if (text.trim().length < 5) return setError("Describe the document you need.");
    setPrompt(text);
    setLoading(true);
    setResult("");
    try {
      const { data } = await api.post("/ai/generate-template", { prompt: text });
      setResult(data.template);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="What do you need?" required>
          {(p) => <Textarea {...p} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Offer letter for a junior designer, 3-month probation" />}
        </Field>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => run(p)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50">{p}</button>
          ))}
        </div>
        {error && <Alert>{error}</Alert>}
        <Button icon={FileText} onClick={() => run()} loading={loading}>Generate</Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Draft</p>
          {result && (
            <Button variant="ghost" size="sm" icon={Copy} onClick={() => navigator.clipboard.writeText(result).then(() => toast.success("Copied to clipboard"))}>Copy</Button>
          )}
        </div>
        {loading ? <p className="text-sm text-slate-500">Writing…</p> : result ? <Markdown>{result}</Markdown> : <p className="text-sm text-slate-500">Your document will appear here. Always review before sending.</p>}
      </div>
    </div>
  );
};
