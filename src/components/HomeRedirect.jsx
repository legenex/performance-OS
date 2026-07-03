import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getRole, ROLE_HOME } from "@/lib/roles";
import CommandCenter from "@/pages/CommandCenter";

// At "/", owners see the Command Center; other roles are sent to their landing.
export default function HomeRedirect() {
  const { user } = useAuth();
  const role = getRole(user);
  if (role === "owner") return <CommandCenter />;
  const home = ROLE_HOME[role];
  if (home && home !== "/") return <Navigate to={home} replace />;
  return <CommandCenter />;
}