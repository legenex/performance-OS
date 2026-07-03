// Role scoping for PerformanceOS.
// app_role comes from the User entity; platform admins are treated as "owner".
// Roles:
//   owner      → everything
//   ops        → OPS + PERFORMANCE + AD INTELLIGENCE + read-only MONEY
//   media_buyer→ AD INTELLIGENCE + Campaign True Margin + Overview + Ad Briefing (home = Ad Command)
//   infra      → SYSTEM + Pipeline Health

export const ROLES = ["owner", "ops", "media_buyer", "infra"];

// Every route key used across the app, mapped to which roles may see it.
// "*" means all authenticated users.
export const ROUTE_ACCESS = {
  // MONEY
  "/": ["owner", "ops", "media_buyer"],            // Command Center / Overview
  "/cash-banking": ["owner", "ops"],               // ops read-only
  "/receivables": ["owner", "ops"],
  "/payables": ["owner", "ops"],
  "/pnl": ["owner", "ops"],

  // AD INTELLIGENCE
  "/ad-command": ["owner", "ops", "media_buyer"],
  "/ad-accounts": ["owner", "ops", "media_buyer"],
  "/campaign-explorer": ["owner", "ops", "media_buyer"],
  "/creative-intelligence": ["owner", "ops", "media_buyer"],
  "/knowledge-base": ["owner", "ops", "media_buyer"],

  // OPS
  "/ops-board": ["owner", "ops"],
  "/pipeline-health": ["owner", "ops", "infra"],
  "/import": ["owner", "ops"],
  "/data-sources": ["owner", "ops", "infra"],

  // SYSTEM
  "/settings": ["owner", "infra"],
};

// Default landing route per role.
export const ROLE_HOME = {
  owner: "/",
  ops: "/ops-board",
  media_buyer: "/ad-command",
  infra: "/pipeline-health",
};

// Resolve the effective app role for a user object.
export function getRole(user) {
  if (!user) return "ops";
  // Platform admins get full owner access regardless of app_role.
  if (user.role === "admin") return "owner";
  return user.app_role || "ops";
}

export function canAccess(user, path) {
  const role = getRole(user);
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true; // unlisted routes are open to authed users
  return allowed.includes(role);
}

// MONEY screens are read-only for ops.
export function isReadOnly(user, path) {
  const role = getRole(user);
  const moneyScreens = ["/cash-banking", "/receivables", "/payables", "/pnl"];
  return role === "ops" && moneyScreens.includes(path);
}