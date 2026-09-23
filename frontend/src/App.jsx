import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider, PageLoader, EmptyState, Button } from "./components/ui";
import { AppLayout } from "./components/layout/AppLayout";
import { can } from "./lib/roles";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage, { ForcedPasswordChange } from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/employees/EmployeesPage";
import EmployeeProfilePage from "./pages/employees/EmployeeProfilePage";
import AttendancePage from "./pages/AttendancePage";
import PayrollPage from "./pages/PayrollPage";
import PerformancePage from "./pages/PerformancePage";
import AIToolsPage from "./pages/AIToolsPage";
import SupportPage from "./pages/SupportPage";
import MyProfilePage from "./pages/me/MyProfilePage";
import MyAttendancePage from "./pages/me/MyAttendancePage";
import MyPayslipsPage from "./pages/me/MyPayslipsPage";
import MyReviewsPage from "./pages/me/MyReviewsPage";
import { Compass, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const Private = () => {
  const { user, status } = useAuth();
  if (status === "checking") return <PageLoader label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <ForcedPasswordChange />;
  return <AppLayout />;
};

const PublicOnly = () => {
  const { user, status } = useAuth();
  if (status === "checking") return <PageLoader />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

// Hides pages a role can't use (the API enforces the same rules).
const Require = ({ permission, profile, children }) => {
  const { user } = useAuth();
  const allowed = profile ? Boolean(user.employeeId) : can(user, permission);
  if (!allowed) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access to this page"
        description={profile ? "This account isn't linked to an employee profile." : "Ask an administrator if you think you should."}
        action={<Link to="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link>}
      />
    );
  }
  return children;
};

const NotFound = () => (
  <EmptyState
    icon={Compass}
    title="Page not found"
    description="The page you're looking for doesn't exist or was moved."
    action={<Link to="/dashboard"><Button variant="secondary">Go to dashboard</Button></Link>}
  />
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route element={<Private />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="employees" element={<Require permission="employees.view"><EmployeesPage /></Require>} />
              <Route path="employees/:id" element={<Require permission="employees.view"><EmployeeProfilePage /></Require>} />
              <Route path="attendance" element={<Require permission="attendance.view"><AttendancePage /></Require>} />
              <Route path="payroll" element={<Require permission="payroll.view"><PayrollPage /></Require>} />
              <Route path="performance" element={<Require permission="performance.view"><PerformancePage /></Require>} />
              <Route path="ai-tools" element={<Require permission="ai.use"><AIToolsPage /></Require>} />
              <Route path="me/profile" element={<Require profile><MyProfilePage /></Require>} />
              <Route path="me/attendance" element={<Require profile><MyAttendancePage /></Require>} />
              <Route path="me/payslips" element={<Require profile><MyPayslipsPage /></Require>} />
              <Route path="me/reviews" element={<Require profile><MyReviewsPage /></Require>} />
              <Route path="account/password" element={<ChangePasswordPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
