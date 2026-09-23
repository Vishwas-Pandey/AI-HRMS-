import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  Star,
  Sparkles,
  LifeBuoy,
  Clock,
  FileText,
  UserCircle,
} from "lucide-react";

export const ROLE_LABELS = { admin: "Admin", hr: "HR", manager: "Manager", employee: "Employee" };

// What each role may do. Mirrors the backend's restrictTo() checks.
const PERMISSIONS = {
  "employees.view": ["admin", "hr", "manager"],
  "employees.manage": ["admin"],
  "attendance.view": ["admin", "hr", "manager"],
  "attendance.mark": ["admin", "hr"],
  "payroll.view": ["admin", "hr"],
  "payroll.manage": ["admin"],
  "performance.view": ["admin", "hr", "manager"],
  "performance.review": ["admin", "hr", "manager"],
  "ai.use": ["admin", "hr", "manager"],
  "ai.recruiting": ["admin", "hr"],
  "salary.view": ["admin", "hr"],
};

export const can = (user, permission) => Boolean(user && PERMISSIONS[permission]?.includes(user.role));

export const navFor = (user) => {
  if (!user) return [];
  const items = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  if (can(user, "employees.view")) items.push({ to: "/employees", label: "Employees", icon: Users });
  if (can(user, "attendance.view")) items.push({ to: "/attendance", label: "Attendance", icon: CalendarCheck });
  if (can(user, "payroll.view")) items.push({ to: "/payroll", label: "Payroll", icon: Wallet });
  if (can(user, "performance.view")) items.push({ to: "/performance", label: "Performance", icon: Star });
  if (can(user, "ai.use")) items.push({ to: "/ai-tools", label: "AI Tools", icon: Sparkles });
  if (user.employeeId) {
    items.push(
      { section: "Me" },
      { to: "/me/profile", label: "My profile", icon: UserCircle },
      { to: "/me/attendance", label: "My attendance", icon: Clock },
      { to: "/me/payslips", label: "My payslips", icon: FileText },
      { to: "/me/reviews", label: "My reviews", icon: Star }
    );
  }
  items.push({ section: "Help" }, { to: "/support", label: "Support", icon: LifeBuoy });
  return items;
};
