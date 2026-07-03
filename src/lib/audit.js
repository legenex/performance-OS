import { base44 } from "@/api/base44Client";

// Fire-and-forget audit logging for OPS/admin writes.
export async function logAudit(action, entityType, entityId, details) {
  try {
    let userId = "";
    try { const u = await base44.auth.me(); userId = u?.id || ""; } catch { /* ignore */ }
    await base44.entities.AuditLog.create({
      action,
      entity_type: entityType,
      entity_id: entityId || "",
      user_id: userId,
      details: typeof details === "string" ? details : JSON.stringify(details || {}),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // never block the primary write on audit failure
  }
}