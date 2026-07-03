import React from "react";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { canAccess, ROLE_HOME, getRole } from "@/lib/roles";

// Guards a route by app role. Redirects to the role's home if not permitted.
export default function RoleRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (canAccess(user, location.pathname)) return <Outlet />;
  const home = ROLE_HOME[getRole(user)] || "/";
  return <Navigate to={home} replace />;
}