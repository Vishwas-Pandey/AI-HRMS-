import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Gauge } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import "../../lib/charts";
import { Alert, Button, Markdown } from "../../components/ui";

export const SentimentTool = () => {
  const [sentiment, setSentiment] = useState(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError("");
    setLoading(true);
    try {
      const [s, i] = await Promise.all([api.get("/ai/sentiment"), api.get("/ai/insights")]);
      setSentiment(s.data);
      setSummary(i.data.aiSummary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const parts = sentiment ? [["Positive", sentiment.positive, "#10b981"], ["Neutral", sentiment.neutral, "#94a3b8"], ["Negative", sentiment.negative, "#ef4444"]] : [];

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">Reads every performance review comment and summarizes the overall tone, top performer and who may need support.</p>
        <Button icon={Gauge} onClick={run} loading={loading}>{sentiment ? "Run again" : "Analyze reviews"}</Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {sentiment && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5">
            <div className="mx-auto h-44 max-w-[11rem]">
              <Doughnut data={{ labels: parts.map((p) => p[0]), datasets: [{ data: parts.map((p) => p[1]), backgroundColor: parts.map((p) => p[2]), borderWidth: 0 }] }} options={{ maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false } } }} />
            </div>
            <ul className="mt-4 space-y-1.5">
              {parts.map(([label, value, color]) => (
                <li key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>
                  <span className="font-medium text-slate-900">{value}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 lg:col-span-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Summary</p>
            <Markdown>{summary}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
