import { createPortal } from "react-dom";
import { formatDate, formatMoney, formatPeriod } from "../../lib/format";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const belowThousand = (n) => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
};

// Indian numbering: crore, lakh, thousand.
export const rupeesInWords = (amount) => {
  let n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero Rupees Only";
  const parts = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${crore >= 100 ? belowThousand(crore) : belowHundred(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return `${parts.join(" ")} Rupees Only`;
};

const Row = ({ label, value, strong }) => (
  <tr className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>
    <td className="py-2 pr-4">{label}</td>
    <td className="py-2 text-right tabular-nums">{value}</td>
  </tr>
);

export const Payslip = ({ slip, employee }) => (
  <article className="payslip mx-auto w-full max-w-2xl bg-white text-sm text-slate-700">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <p className="text-lg font-semibold text-slate-900">AI-HRMS Demo Co.</p>
        <p className="text-xs text-slate-500">Payslip for {formatPeriod(slip.periodStartDate, slip.periodEndDate)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
        <p className={`font-semibold ${slip.status === "Paid" ? "text-emerald-700" : "text-amber-700"}`}>
          {slip.status}
          {slip.status === "Paid" && slip.paidAt ? ` · ${formatDate(slip.paidAt)}` : ""}
        </p>
      </div>
    </header>

    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-200 py-4 sm:grid-cols-4">
      {[
        ["Employee", employee.name],
        ["Employee ID", employee.employeeId],
        ["Department", employee.department],
        ["Designation", employee.jobTitle],
        ["Period start", formatDate(slip.periodStartDate)],
        ["Period end", formatDate(slip.periodEndDate)],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className="font-medium text-slate-900">{v || "—"}</dd>
        </div>
      ))}
    </dl>

    <div className="grid gap-6 py-4 sm:grid-cols-2">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 text-left font-semibold">Earnings</th>
            <th className="pb-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Gross salary" value={formatMoney(slip.grossSalary)} />
          <Row label="Total earnings" value={formatMoney(slip.grossSalary)} strong />
        </tbody>
      </table>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 text-left font-semibold">Deductions</th>
            <th className="pb-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Taxes and other deductions" value={formatMoney(slip.deductions)} />
          <Row label="Total deductions" value={formatMoney(slip.deductions)} strong />
        </tbody>
      </table>
    </div>

    <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium text-slate-700">Net pay</span>
        <span className="text-2xl font-semibold tabular-nums text-slate-900">{formatMoney(slip.netSalary)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{rupeesInWords(slip.netSalary)}</p>
    </footer>
    <p className="mt-4 text-center text-[11px] text-slate-400">This is a system-generated payslip and does not require a signature.</p>
  </article>
);

// A copy of the payslip mounted straight under <body>, shown only when printing.
export const PrintablePayslip = ({ slip, employee }) =>
  createPortal(
    <div className="payslip-print-root">
      <style>{`
        .payslip-print-root { display: none; }
        @media print {
          @page { margin: 16mm; }
          body > *:not(.payslip-print-root) { display: none !important; }
          .payslip-print-root { display: block !important; }
          .payslip-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <Payslip slip={slip} employee={employee} />
    </div>,
    document.body
  );
