import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronRight, KeyRound, Search, UserPlus, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { can, ROLE_LABELS } from "../../lib/roles";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatMoney, fullName, plural } from "../../lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  RoleBadge,
  Select,
  Skeleton,
  StatCard,
  TableSkeleton,
} from "../../components/ui";
import EmployeeFormModal from "./EmployeeFormModal";
import CredentialsModal from "./CredentialsModal";
import { useStableCallback } from "./useStableCallback";

const ROLE_ORDER = ["admin", "hr", "manager", "employee"];

const PendingBadge = () => (
  <Badge tone="amber">
    <KeyRound className="h-3 w-3" />
    Password pending
  </Badge>
);

const matches = (e, q) => {
  if (!q) return true;
  const hay = `${fullName(e)} ${e.email || ""} ${e.employeeId || ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => hay.includes(part));
};

const StatsSkeleton = () => (
  <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-12" />
      </Card>
    ))}
  </div>
);

const EmployeesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = can(user, "employees.manage");
  const showSalary = can(user, "salary.view");

  const { data, error, loading, reload } = useFetch("/employees");
  const employees = useMemo(() => data || [], [data]);

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState(null); // { name, credentials }

  // Dashboard links here with ?new=1 to open the create form directly.
  useEffect(() => {
    if (canManage && searchParams.get("new") === "1") setFormOpen(true);
  }, [canManage, searchParams]);

  const closeForm = useStableCallback(() => {
    setFormOpen(false);
    if (searchParams.has("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  });

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [employees]
  );
  const roles = useMemo(
    () => ROLE_ORDER.filter((r) => employees.some((e) => e.user?.role === r)),
    [employees]
  );

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) => matches(e, query.trim()) && (!department || e.department === department) && (!role || e.user?.role === role)
      ),
    [employees, query, department, role]
  );

  const stats = useMemo(() => {
    const byRole = (r) => employees.filter((e) => e.user?.role === r).length;
    return {
      total: employees.length,
      departments: departments.length,
      managers: byRole("manager"),
      hr: byRole("hr"),
      pending: employees.filter((e) => e.user?.mustChangePassword).length,
    };
  }, [employees, departments]);

  const hasFilters = Boolean(query || department || role);
  const clearFilters = () => {
    setQuery("");
    setDepartment("");
    setRole("");
  };

  const onCreated = ({ employee, credentials }) => {
    closeForm();
    setCreated({ name: fullName(employee), credentials });
    reload();
  };

  const open = (e) => navigate(`/employees/${e._id}`);

  return (
    <div>
      <PageHeader
        title="Employees"
        description={loading && !data ? "Loading your team…" : `${employees.length} ${employees.length === 1 ? "person" : "people"} in the directory`}
        actions={
          canManage && (
            <Button icon={UserPlus} onClick={() => setFormOpen(true)}>
              Add employee
            </Button>
          )
        }
      />

      {loading && !data ? (
        <StatsSkeleton />
      ) : (
        !error && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total people" value={stats.total} icon={Users} />
            <StatCard label="Departments" value={stats.departments} icon={Building2} tone="slate" />
            <StatCard label="Managers & HR" value={stats.managers + stats.hr} hint={`${plural(stats.managers, "manager")} · ${stats.hr} HR`} icon={Users} tone="green" />
            <StatCard
              label="Pending first login"
              value={stats.pending}
              hint={stats.pending ? "Haven't set their own password" : "Everyone has signed in"}
              icon={KeyRound}
              tone={stats.pending ? "amber" : "slate"}
            />
          </div>
        )
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or employee ID"
              aria-label="Search employees"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department" className="md:w-48">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role" className="md:w-40">
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters} className="self-start md:self-auto">
              Clear
            </Button>
          )}
        </div>

        {loading && !data ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees yet"
            description={canManage ? "Add your first team member to create their account and share sign-in details." : "Employees added by an admin will show up here."}
            action={
              canManage && (
                <Button icon={UserPlus} onClick={() => setFormOpen(true)}>
                  Add employee
                </Button>
              )
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Nobody matches these filters. Try a different search or clear the filters."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr>
                    <th scope="col" className="table-th">Employee</th>
                    <th scope="col" className="table-th">ID</th>
                    <th scope="col" className="table-th">Job title</th>
                    <th scope="col" className="table-th">Department</th>
                    <th scope="col" className="table-th">Role</th>
                    <th scope="col" className="table-th">Joined</th>
                    {showSalary && <th scope="col" className="table-th text-right">Monthly salary</th>}
                    <th scope="col" className="table-th w-8"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => (
                    <tr
                      key={e._id}
                      onClick={() => open(e)}
                      onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), open(e))}
                      tabIndex={0}
                      role="link"
                      aria-label={`View ${fullName(e)}`}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(e)} size="sm" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">{fullName(e)}</span>
                              {e.user?.mustChangePassword && <PendingBadge />}
                            </div>
                            <p className="truncate text-xs text-slate-500">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs text-slate-600">{e.employeeId}</td>
                      <td className="table-td">{e.jobTitle}</td>
                      <td className="table-td">{e.department}</td>
                      <td className="table-td">{e.user?.role && <RoleBadge role={e.user.role} />}</td>
                      <td className="table-td whitespace-nowrap">{formatDate(e.joiningDate)}</td>
                      {showSalary && <td className="table-td whitespace-nowrap text-right tabular-nums">{formatMoney(e.salary)}</td>}
                      <td className="table-td pr-4">
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((e) => (
                <li key={e._id}>
                  <button type="button" onClick={() => open(e)} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-slate-50">
                    <Avatar name={fullName(e)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{fullName(e)}</p>
                          <p className="truncate text-sm text-slate-500">{e.jobTitle}</p>
                        </div>
                        {e.user?.role && <RoleBadge role={e.user.role} />}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{e.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono">{e.employeeId}</span>
                        <span>{e.department}</span>
                        <span>Joined {formatDate(e.joiningDate)}</span>
                        {showSalary && <span className="tabular-nums text-slate-700">{formatMoney(e.salary)}/mo</span>}
                      </div>
                      {e.user?.mustChangePassword && (
                        <div className="mt-2">
                          <PendingBadge />
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              Showing {filtered.length} of {employees.length}
            </div>
          </>
        )}
      </Card>

      {canManage && (
        <>
          <EmployeeFormModal open={formOpen} onClose={closeForm} departments={departments} onSaved={onCreated} />
          <CredentialsModal
            open={Boolean(created)}
            onClose={() => setCreated(null)}
            credentials={created?.credentials}
            name={created?.name}
          />
        </>
      )}
    </div>
  );
};

export default EmployeesPage;
