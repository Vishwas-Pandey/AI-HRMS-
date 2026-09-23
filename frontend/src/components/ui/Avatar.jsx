import { initials } from "../../lib/format";

const PALETTE = ["bg-brand-100 text-brand-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700"];

export const Avatar = ({ name = "", size = "md" }) => {
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${color} ${sizes[size]}`} aria-hidden="true">
      {initials(name) || "?"}
    </span>
  );
};
