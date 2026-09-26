import { useState } from "react";
import { FileText, Printer, Wallet } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, StatCard, StatusBadge, TableSkeleton } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatMoney, formatPeriod, formatTimestampDate } from "../../lib/format";
import { useFetch } from "../../lib/useFetch";
import { Payslip, PrintablePayslip } from "./Payslip";

const MyPayslipsPage = () => {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch("/payroll/my-payslips");
  const [viewing, setViewing] = useState(null);

  const slips = data || [];
  const latest = slips[0];
  const ytdYear = new Date().getFullYear();
  const ytdNet = slips
    .filter((s) => s.status === "Paid" && new Date(s.periodStartDate).getUTCFullYear() === ytdYear)
    .reduce((sum, s) => sum + (s.netSalary || 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My payslips" description="Your pay history. Open any payslip to view or print it." />

      {!error && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Latest net pay"
            value={loading ? "–" : latest ? formatMoney(latest.netSalary) : "—"}
            hint={loading ? null : latest ? `${formatPeriod(latest.periodStartDate, latest.periodEndDate)} · ${latest.status}` : "No payslips yet"}
            icon={Wallet}
            tone="brand"
          />
          <StatCard label={`Paid in ${ytdYear}`} value={loading ? "–" : formatMoney(ytdNet)} hint="Net pay received this calendar year" icon={FileText} tone="green" />
        </div>
      )}

      <Card>
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : slips.length === 0 ? (
          <EmptyState icon={FileText} title="No payslips yet" description="Your payslips will appear here once payroll is run for you." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="table-th">Period</th>
                    <th className="table-th text-right">Gross</th>
                    <th className="table-th text-right">Deductions</th>
                    <th className="table-th text-right">Net</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slips.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/60">
                      <td className="table-td font-medium text-slate-900">{formatPeriod(s.periodStartDate, s.periodEndDate)}</td>
                      <td className="table-td text-right tabular-nums">{formatMoney(s.grossSalary)}</td>
                      <td className="table-td text-right tabular-nums text-slate-500">−{formatMoney(s.deductions)}</td>
                      <td className="table-td text-right font-semibold tabular-nums text-slate-900">{formatMoney(s.netSalary)}</td>
                      <td className="table-td">
                        <StatusBadge status={s.status} />
                        {s.status === "Paid" && s.paidAt && <span className="ml-2 text-xs text-slate-500">{formatTimestampDate(s.paidAt)}</span>}
                      </td>
                      <td className="table-td text-right">
                        <Button variant="secondary" size="sm" icon={FileText} onClick={() => setViewing(s)}>
                          View payslip
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {slips.map((s) => (
                <li key={s._id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatPeriod(s.periodStartDate, s.periodEndDate)}</p>
                      <p className="text-lg font-semibold tabular-nums text-slate-900">{formatMoney(s.netSalary)}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs tabular-nums text-slate-500">
                    Gross {formatMoney(s.grossSalary)} · Deductions {formatMoney(s.deductions)}
                  </p>
                  <Button variant="secondary" size="sm" icon={FileText} onClick={() => setViewing(s)} className="w-full">
                    View payslip
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Payslip"
        description={viewing ? formatPeriod(viewing.periodStartDate, viewing.periodEndDate) : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      >
        {viewing && <Payslip slip={viewing} employee={user} />}
      </Modal>
      {viewing && <PrintablePayslip slip={viewing} employee={user} />}
    </div>
  );
};

export default MyPayslipsPage;
