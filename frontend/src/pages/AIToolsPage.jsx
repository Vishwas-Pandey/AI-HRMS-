import { useState } from "react";
import { AudioLines, Bot, FileSearch, FileText, Gauge } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { can } from "../lib/roles";
import { Card, PageHeader } from "../components/ui";
import { AssistantTool } from "./ai/AssistantTool";
import { ResumeTool } from "./ai/ResumeTool";
import { InterviewTool } from "./ai/InterviewTool";
import { TemplateTool } from "./ai/TemplateTool";
import { SentimentTool } from "./ai/SentimentTool";

const TOOLS = [
  { id: "assistant", label: "HR assistant", icon: Bot, component: AssistantTool },
  { id: "sentiment", label: "Review sentiment", icon: Gauge, component: SentimentTool },
  { id: "templates", label: "Document drafts", icon: FileText, component: TemplateTool },
  { id: "resume", label: "Resume screening", icon: FileSearch, component: ResumeTool, recruiting: true },
  { id: "interview", label: "Interview analysis", icon: AudioLines, component: InterviewTool, recruiting: true },
];

const AIToolsPage = () => {
  const { user } = useAuth();
  const tools = TOOLS.filter((t) => !t.recruiting || can(user, "ai.recruiting"));
  const [active, setActive] = useState(tools[0].id);
  const Tool = tools.find((t) => t.id === active).component;

  return (
    <div>
      <PageHeader title="AI tools" description="Powered by Google Gemini. Outputs are suggestions; review them before acting." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" role="tablist">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active === id ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <Card>
        <Tool />
      </Card>
    </div>
  );
};

export default AIToolsPage;
