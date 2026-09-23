import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, Trash2 } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { Avatar, Button, Markdown } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

const SUGGESTIONS = [
  "Draft a friendly probation-review reminder email",
  "What questions should I ask in an exit interview?",
  "Summarize best practices for remote onboarding",
];

export const AssistantTool = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Block body: scrollIntoView returns a Promise in newer browsers, and an effect must not return one.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await api.post("/ai/chatbot", { message, history });
      setMessages((m) => [...m, { role: "model", text: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "model", text: errorMessage(err), error: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[min(640px,calc(100vh-16rem))] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Bot className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">Ask the HR assistant</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Policies, hiring, drafting messages. It doesn't see your employee records.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "user" ? (
              <Avatar name={user.name} size="sm" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><Bot className="h-4 w-4" /></span>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-brand-600 text-sm text-white" : m.error ? "border border-red-200 bg-red-50 text-sm text-red-700" : "bg-slate-100"}`}>
              {m.role === "user" || m.error ? m.text : <Markdown>{m.text}</Markdown>}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white"><Bot className="h-4 w-4" /></span>
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
              {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-slate-100 p-4">
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} aria-label="Clear conversation"><Trash2 className="h-4 w-4" /></Button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          placeholder="Ask anything about HR…"
          aria-label="Message"
          className="input max-h-40 min-h-[40px] flex-1 resize-none"
        />
        <Button type="submit" size="icon" className="h-10 w-10" disabled={!input.trim()} loading={sending} aria-label="Send">
          {!sending && <SendHorizontal className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};
