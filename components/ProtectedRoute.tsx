import React from "react";
import { Navigate } from "react-router-dom";
import { AuthUser } from "../utils/authService";
import { canAccessView } from "../utils/rbac";
import { AppView } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  requiredView?: AppView;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentUser,
  isAuthenticated,
  requiredView,
}) => {
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has access to the specific view
  if (requiredView && !canAccessView(currentUser.role, requiredView)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
