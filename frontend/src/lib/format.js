const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatMoney = (n) => (n === undefined || n === null || Number.isNaN(Number(n)) ? "—" : inr.format(Number(n)));

export const formatDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts }) : "—";

export const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export const formatPeriod = (start, end) => {
  if (!start) return "—";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sameMonth = e && s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  return sameMonth ? formatDate(s, { month: "long", year: "numeric" }) : `${formatDate(s)} – ${formatDate(e)}`;
};

// YYYY-MM-DD for <input type="date">, in the user's local calendar.
export const toDateInput = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const fullName = (e) => (e ? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() : "Unknown");

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
