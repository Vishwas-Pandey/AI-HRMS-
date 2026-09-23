import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";

const MAX_BYTES = 5 * 1024 * 1024;

export const FileDrop = ({ accept, label, hint, file, onFile, onError }) => {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const pick = (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return onError?.("File is too large (max 5 MB).");
    onFile(f);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button onClick={() => onFile(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600" aria-label="Remove file">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${over ? "border-brand-400 bg-brand-50" : "border-slate-300 hover:border-slate-400"}`}
    >
      <FileUp className="h-6 w-6 text-slate-400" />
      <span className="mt-2 text-sm font-medium text-slate-700">{label}</span>
      <span className="mt-0.5 text-xs text-slate-500">{hint}</span>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
};
