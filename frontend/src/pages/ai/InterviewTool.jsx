import { useEffect, useRef, useState } from "react";
import { Mic, Square, AudioLines } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { Alert, Button, Field, Markdown, Textarea } from "../../components/ui";
import { FileDrop } from "./FileDrop";

export const InterviewTool = () => {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const recorder = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => { clearInterval(timer.current); recorder.current?.stream?.getTracks().forEach((t) => t.stop()); }, []);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        setFile(new File(chunks, `interview-recording.${type.includes("mp4") ? "m4a" : "webm"}`, { type }));
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser, or upload a file instead.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    clearInterval(timer.current);
    setRecording(false);
  };

  const run = async () => {
    setError("");
    if (!file) return setError("Record or upload the candidate's answers.");
    const form = new FormData();
    form.append("audio", file);
    form.append("jobDescription", jd);
    setLoading(true);
    setResult("");
    try {
      const { data } = await api.post("/ai/voice-interview", form);
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
        {!file && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            {recording ? (
              <Button variant="danger" icon={Square} onClick={stopRecording}>Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</Button>
            ) : (
              <Button variant="secondary" icon={Mic} onClick={startRecording}>Record answer</Button>
            )}
            <span className="text-sm text-slate-500">{recording ? "Recording…" : "or upload an audio file below"}</span>
          </div>
        )}
        {!recording && <FileDrop accept="audio/*" label="Upload interview audio" hint="MP3, M4A, WAV or WebM, up to 5 MB" file={file} onFile={setFile} onError={setError} />}
        <Field label="Job description" hint="Optional, but gives better analysis">
          {(p) => <Textarea {...p} rows={5} value={jd} onChange={(e) => setJd(e.target.value)} />}
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button icon={AudioLines} onClick={run} loading={loading} disabled={recording}>Analyze interview</Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Analysis</p>
        {loading ? <p className="text-sm text-slate-500">Transcribing and analyzing…</p> : result ? <Markdown>{result}</Markdown> : <p className="text-sm text-slate-500">Transcript, tone, strengths and red flags will appear here.</p>}
      </div>
    </div>
  );
};
