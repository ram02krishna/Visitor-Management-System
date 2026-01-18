import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, UserRole } from "../store/auth";

interface RoleBasedGuardProps {
  allowedRoles: UserRole[];
}

const RoleBasedGuard = ({ allowedRoles }: RoleBasedGuardProps) => {
  const { user } = useAuthStore();

  if (!user) {
    // User is not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // User does not have the required role, redirect to a "not authorized" page or home
    // You can create a dedicated "Not Authorized" page for a better user experience
    return <Navigate to="/app/dashboard" replace />;
  }

  // User has the required role, render the nested routes
  return <Outlet />;
};

export default RoleBasedGuard;
