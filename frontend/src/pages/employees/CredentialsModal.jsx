import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Alert, Button, Modal, RoleBadge, useToast } from "../../components/ui";
import { ROLE_LABELS } from "../../lib/roles";
import { useStableCallback } from "./useStableCallback";

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
};

const useCopy = () => {
  const [copied, setCopied] = useState(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return [copied, setCopied];
};

const buildCredentialsMessage = (name, c) => {
  const loginUrl = `${window.location.origin}/login`;
  return [
    `Hi ${name || "there"}, your AI-HRMS account is ready.`,
    "",
    `Sign in at ${loginUrl} with:`,
    `Email: ${c.email}`,
    `Temporary password: ${c.temporaryPassword}`,
    `Employee ID: ${c.employeeId}`,
    `Role: ${ROLE_LABELS[c.role] || c.role}`,
    "",
    "You'll be asked to set your own password.",
  ].join("\n");
};

const CredentialRow = ({ label, value, display, mono, copied, onCopy }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-0.5 break-all text-sm text-slate-900 ${mono ? "font-mono text-[15px] tracking-wide" : ""}`}>{display ?? value}</div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      onClick={onCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  </div>
);

// Shows freshly issued login details once, with copy helpers.
const CredentialsModal = ({ open, onClose, credentials, name, title = "Account created" }) => {
  const toast = useToast();
  const [copied, setCopied] = useCopy();
  const handleClose = useStableCallback(() => onClose?.());

  if (!credentials) return null;

  const copy = async (key, text) => {
    if (await copyText(text)) setCopied(key);
    else toast.error("Couldn't copy. Select the text and copy it manually.");
  };

  const rows = [
    { key: "employeeId", label: "Employee ID", value: credentials.employeeId, mono: true },
    { key: "email", label: "Email", value: credentials.email },
    { key: "password", label: "Temporary password", value: credentials.temporaryPassword, mono: true },
    { key: "role", label: "Role", value: ROLE_LABELS[credentials.role] || credentials.role, display: <RoleBadge role={credentials.role} /> },
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={name ? `Share these sign-in details with ${name}.` : "Share these sign-in details with the employee."}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Done
          </Button>
          <Button icon={copied === "all" ? Check : Copy} onClick={() => copy("all", buildCredentialsMessage(name, credentials))}>
            {copied === "all" ? "Copied" : "Copy all"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tone="amber">
          <span className="font-medium">This password is shown only once.</span> Copy it now; you won't be able to see it again. If it's lost,
          reset the password to issue a new one.
        </Alert>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map(({ key, ...row }) => (
            <CredentialRow key={key} {...row} copied={copied === key} onCopy={() => copy(key, row.value)} />
          ))}
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          They'll be asked to choose their own password the first time they sign in.
        </p>
      </div>
    </Modal>
  );
};

export default CredentialsModal;
