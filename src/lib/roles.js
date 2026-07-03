// Role scoping for PerformanceOS.
// app_role comes from the User entity; platform admins are treated as "owner".
// Roles:
//   owner      → everything
//   ops        → OPS + PERFORMANCE + AD INTELLIGENCE + read-only Finances
//   media_buyer→ AD INTELLIGENCE + Campaign True Margin + Overview + Ad Briefing (home = Ad Command)
//   infra      → SYSTEM

export const ROLES = ["owner", "ops", "media_buyer", "infra"];

// Every route key used across the app, mapped to which roles may see it.
export const ROUTE_ACCESS = {
  // FINANCES
  "/": ["owner", "ops", "media_buyer"],            // Command Center
  "/cash-banking": ["owner", "ops"],
  "/receivables": ["owner", "ops"],
  "/payables": ["owner", "ops"],
  "/pnl": ["owner", "ops"],

  // PERFORMANCE
  "/performance": ["owner", "ops", "media_buyer"],       // Overview
  "/performance/buyers": ["owner", "ops"],
  "/performance/suppliers": ["owner", "ops"],
  "/performance/states": ["owner", "ops"],
  "/performance/lead-quality": ["owner", "ops"],
  "/performance/campaign-margin": ["owner", "ops", "media_buyer"],
  "/performance/report-builder": ["owner", "ops"],

  // AD INTELLIGENCE
  "/ad-command": ["owner", "ops", "media_buyer"],
  "/ad-accounts": ["owner", "ops", "media_buyer"],
  "/campaign-explorer": ["owner", "ops", "media_buyer"],
  "/creative-intelligence": ["owner", "ops", "media_buyer"],
  "/knowledge-base": ["owner", "ops", "media_buyer"],

  // OPS
  "/ops-board": ["owner", "ops"],
  "/buyers": ["owner", "ops"],
  "/suppliers": ["owner", "ops"],
  "/states-tiers": ["owner", "ops"],
  "/qualification": ["owner", "ops"],
  "/billing-recon": ["owner", "ops"],

  // SYSTEM
  "/settings": ["owner", "infra"],
  "/users": ["owner"],

  // AI
  "/daily-briefing": ["owner", "ops", "media_buyer"],
};

// Default landing route per role.
export const ROLE_HOME = {
  owner: "/",
  ops: "/ops-board",
  media_buyer: "/ad-command",
  infra: "/settings",
};

// Resolve the effective app role for a user object.
export function getRole(user) {
  if (!user) return "owner";
  // Platform admins get full owner access regardless of app_role.
  if (user.role === "admin") return "owner";
  return user.app_role || "owner";
}

export function canAccess(user, path) {
  const role = getRole(user);
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true; // unlisted routes are open to authed users
  return allowed.includes(role);
}

// Finances screens are read-only for ops.
export function isReadOnly(user, path) {
  const role = getRole(user);
  const financeScreens = ["/cash-banking", "/receivables", "/payables", "/pnl"];
  return role === "ops" && financeScreens.includes(path);
}