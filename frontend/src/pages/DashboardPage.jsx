import { useAuth } from "../context/AuthContext";
import { can } from "../lib/roles";
import "../lib/charts";
import { TeamDashboard } from "./dashboard/TeamDashboard";
import { EmployeeDashboard } from "./dashboard/EmployeeDashboard";

const DashboardPage = () => {
  const { user } = useAuth();
  return can(user, "employees.view") ? <TeamDashboard /> : <EmployeeDashboard />;
};

export default DashboardPage;
