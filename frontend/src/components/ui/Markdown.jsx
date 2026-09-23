import ReactMarkdown from "react-markdown";

// Renders AI output. react-markdown doesn't render raw HTML, so this is safe for model text.
export const Markdown = ({ children }) => (
  <div className="space-y-3 text-sm leading-relaxed text-slate-700 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1">
    <ReactMarkdown>{children || ""}</ReactMarkdown>
  </div>
);
